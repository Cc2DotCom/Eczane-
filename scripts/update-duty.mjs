// Her sabah GitHub Actions tarafından çalışır. Nöbetçi eczaneleri resmi kaynaktan,
// e-Devlet'teki "Sağlık Bakanlığı - TİTCK - Nöbetçi Eczane Sorgulama" hizmetinden okur
// ve api/duty/<il>.json dosyalarına yazar. Uygulama yalnızca bu dosyaları okur.
//
// Konumlar hizmetin "Haritada Göster" sayfasından alınır ve data/coords.json'da saklanır;
// eczaneler yer değiştirmediği için her eczanenin konumu yalnızca ilk görüldüğünde çekilir.
//
// Kullanım: node scripts/update-duty.mjs [--force] [--only=34,6]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CHAMBER_CITIES, fetchChamber } from './chambers.mjs';
import { decode, inTurkey, pharmacyName, slug, titleCase } from './text.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const API_DIR = path.join(ROOT, 'api');
const COORDS_FILE = path.join(ROOT, 'data', 'coords.json');
const SERVICE = 'https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama';
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',').map(Number);
/** Resmi sunucuyu yormamak için istekler arasında bekleme. */
const DELAY_MS = 400;

// Plaka kodu → il adı (e-Devlet il seçimindeki kodlar plaka kodlarıdır).
const CITIES = {
  1: 'Adana', 2: 'Adıyaman', 3: 'Afyonkarahisar', 4: 'Ağrı', 5: 'Amasya', 6: 'Ankara', 7: 'Antalya', 8: 'Artvin',
  9: 'Aydın', 10: 'Balıkesir', 11: 'Bilecik', 12: 'Bingöl', 13: 'Bitlis', 14: 'Bolu', 15: 'Burdur', 16: 'Bursa',
  17: 'Çanakkale', 18: 'Çankırı', 19: 'Çorum', 20: 'Denizli', 21: 'Diyarbakır', 22: 'Edirne', 23: 'Elazığ',
  24: 'Erzincan', 25: 'Erzurum', 26: 'Eskişehir', 27: 'Gaziantep', 28: 'Giresun', 29: 'Gümüşhane', 30: 'Hakkari',
  31: 'Hatay', 32: 'Isparta', 33: 'Mersin', 34: 'İstanbul', 35: 'İzmir', 36: 'Kars', 37: 'Kastamonu', 38: 'Kayseri',
  39: 'Kırklareli', 40: 'Kırşehir', 41: 'Kocaeli', 42: 'Konya', 43: 'Kütahya', 44: 'Malatya', 45: 'Manisa',
  46: 'Kahramanmaraş', 47: 'Mardin', 48: 'Muğla', 49: 'Muş', 50: 'Nevşehir', 51: 'Niğde', 52: 'Ordu', 53: 'Rize',
  54: 'Sakarya', 55: 'Samsun', 56: 'Siirt', 57: 'Sinop', 58: 'Sivas', 59: 'Tekirdağ', 60: 'Tokat', 61: 'Trabzon',
  62: 'Tunceli', 63: 'Şanlıurfa', 64: 'Uşak', 65: 'Van', 66: 'Yozgat', 67: 'Zonguldak', 68: 'Aksaray', 69: 'Bayburt',
  70: 'Karaman', 71: 'Kırıkkale', 72: 'Batman', 73: 'Şırnak', 74: 'Bartın', 75: 'Ardahan', 76: 'Iğdır', 77: 'Yalova',
  78: 'Karabük', 79: 'Kilis', 80: 'Osmaniye', 81: 'Düzce',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Nöbet günü Türkiye saatiyle 09:00'da değişir (uygulamadaki src/utils/duty.ts ile aynı kural). */
function dutyDay(now = new Date()) {
  const tr = new Date(now.getTime() + 3 * 3600 * 1000);
  if (tr.getUTCHours() < 9) tr.setUTCDate(tr.getUTCDate() - 1);
  return tr.toISOString().slice(0, 10);
}

/** e-Devlet oturumu: çerezleri ve form anahtarını (token) taşır. */
class Session {
  jar = new Map();
  async request(url, form) {
    await sleep(DELAY_MS);
    const res = await fetch(url, {
      method: form ? 'POST' : 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 NobetciEczaneBot',
        'accept-language': 'tr-TR,tr',
        cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(form ? { 'content-type': 'application/x-www-form-urlencoded', referer: SERVICE } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      this.jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    if (res.status >= 300 && res.status < 400) return this.request(new URL(res.headers.get('location'), url).toString());
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.text();
  }
}

/** "19:00 20/10/2026" → "2026-10-20T19:00:00+03:00" */
function parseTime(s) {
  const m = s.match(/(\d{1,2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[5]}-${m[4]}-${m[3]}T${m[1].padStart(2, '0')}:${m[2]}:00+03:00` : null;
}

function parseRows(html) {
  const tbody = html.match(/<table[^>]*id="searchTable"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbody) return null;
  return [...tbody[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) => {
    // Kaynak HTML'de bazı </td> etiketleri eksik; hücreleri açılış etiketinden bölüyoruz.
    const td = tr[1].split(/<td[^>]*>/i).slice(1).map((c) => c.replace(/<\/td>\s*$/i, ''));
    const mapIndex = td[7]?.match(/index=(\d+)/)?.[1];
    return {
      district: titleCase(decode(td[0] ?? '')),
      name: pharmacyName(decode(td[1] ?? '')),
      address: decode(td[2] ?? ''),
      phone: decode(td[3] ?? '').replace(/\s*-\s*/g, ' ').replace(/^0 \(/, '0(').replace(/[()]/g, '').trim(),
      dutyStart: parseTime(decode(td[4] ?? '')),
      dutyEnd: parseTime(decode(td[5] ?? '')),
      approved: /onaylanm/i.test(td[6] ?? ''),
      mapIndex: mapIndex != null ? Number(mapIndex) : null,
    };
  });
}

function parseMap(html) {
  const lat = parseFloat(html.match(/latti\s*=\s*parseFloat\(\s*([\d.]+)/)?.[1]);
  const lng = parseFloat(html.match(/longi\s*=\s*parseFloat\(\s*([\d.]+)/)?.[1]);
  if (!inTurkey(lat, lng)) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

async function fetchCity(code, cityName, coords) {
  const s = new Session();
  const page = await s.request(SERVICE);
  const token = page.match(/name="token" value="([^"]+)"/)?.[1];
  const dates = [...page.matchAll(/name="nobetTarihi" value="([^"]+)"/g)].map((m) => m[1]);
  if (!token || !dates.length) throw new Error('Form bulunamadı (sayfa yapısı değişmiş olabilir)');

  let first = true;
  const query = async (nobetTarihi) => {
    // Form belirteci tek kullanımlık olabilir; ikinci denemeden itibaren sayfayı yeniden açarız.
    const tok = first ? token : (await s.request(SERVICE)).match(/name="token" value="([^"]+)"/)?.[1];
    first = false;
    return s.request(`${SERVICE}?submit`, {
      'ilkod-address-il': String(code),
      'ilkod-address-il-text': cityName.toLocaleUpperCase('tr-TR'),
      'ilkod-full': '',
      ilkod: '',
      nobetTarihi,
      token: tok,
      btn: 'Sorgula',
    });
  };

  // İlk seçenek "bugün nöbetçi olanlar". Bazı iller listeyi farklı tarih aralığıyla giriyor;
  // ilk seçenekte sonuç yoksa diğer seçenekleri de deneriz.
  let rows = null;
  let msg = '';
  for (const date of dates) {
    const result = await query(date);
    rows = parseRows(result);
    if (rows) {
      if (date !== dates[0]) console.log(`  ${cityName}: liste "${date}" seçeneğinde bulundu`);
      break;
    }
    msg = decode(result.match(/class="[^"]*(?:errorContainer|warningContainer)[^"]*"[\s\S]{0,600}/)?.[0] ?? '');
    if (!/bulunamad/i.test(msg)) break;
  }
  if (!rows) {
    // Bazı illerin listesi resmi kaynakta yayınlanmıyor; bunu hata değil "veri yok" olarak kaydederiz.
    if (/bulunamad/i.test(msg)) {
      console.log(`  ${cityName}: hiçbir tarih seçeneğinde liste yok (${dates.join(', ')})`);
      return { rows: [], fetched: 0, note: msg.slice(0, 200) };
    }
    throw new Error('Sonuç tablosu bulunamadı' + (msg ? `: ${msg.slice(0, 160)}` : ''));
  }

  let fetched = 0;
  for (const r of rows) {
    const key = `${code}|${slug(r.name)}|${slug(r.address)}`;
    if (!coords[key] && r.mapIndex != null) {
      try {
        const loc = parseMap(await s.request(`${SERVICE}?harita=Goster&index=${r.mapIndex}`));
        if (loc) coords[key] = loc;
        fetched++;
      } catch (e) {
        console.warn(`  ${r.name}: konum alınamadı (${e.message})`);
      }
    }
    r.lat = coords[key]?.lat ?? null;
    r.lng = coords[key]?.lng ?? null;
    delete r.mapIndex;
  }
  return { rows, fetched };
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const today = dutyDay();
await mkdir(path.join(API_DIR, 'duty'), { recursive: true });
await mkdir(path.dirname(COORDS_FILE), { recursive: true });
const coords = await readJson(COORDS_FILE, {});
const index = [];
const failed = [];
let updated = 0;
let skipped = 0;

for (const [codeStr, city] of Object.entries(CITIES)) {
  const code = Number(codeStr);
  if (ONLY && !ONLY.includes(code)) continue;
  const file = path.join(API_DIR, 'duty', `${slug(city)}.json`);
  const existing = await readJson(file);
  const entry = (d) => ({ city, slug: slug(city), code, dutyDay: d.dutyDay, updatedAt: d.updatedAt, count: d.pharmacies.length });

  // Oda sitelerinden gelen listeler her çalışmada yenilenir; gün içinde değişebiliyorlar.
  const fromEdevlet = existing?.source === 'e-Devlet TİTCK';
  if (existing?.dutyDay === today && Array.isArray(existing.pharmacies) && !existing.unavailable && fromEdevlet && !FORCE) {
    index.push(entry(existing));
    skipped++;
    continue;
  }
  try {
    let { rows, fetched, note } = await fetchCity(code, city, coords);
    const data = { city, code, dutyDay: today, updatedAt: new Date().toISOString(), source: 'e-Devlet TİTCK', pharmacies: rows };
    if (!rows.length && CHAMBER_CITIES.has(code)) {
      // e-Devlet'te yayınlanmayan illerde eczacı odasının kendi sitesine bakarız.
      try {
        const ch = await fetchChamber(code);
        if (ch?.rows.length) {
          rows = data.pharmacies = ch.rows;
          data.source = ch.source;
          data.sourceUrl = ch.sourceUrl;
          console.log(`  ${city}: ${ch.source} sitesinden alındı`);
        }
      } catch (e) {
        console.warn(`  ${city}: oda sitesi okunamadı (${e.message})`);
      }
    }
    if (!rows.length) {
      data.unavailable = true;
      data.note = note;
      console.log(`${city}: resmi kaynakta liste yok (${note})`);
    }
    await writeFile(file, JSON.stringify(data, null, 1) + '\n');
    index.push(entry(data));
    updated++;
    const noLoc = rows.filter((p) => p.lat == null).length;
    console.log(`${city}: ${rows.length} eczane, ${fetched} yeni konum${noLoc ? `, ${noLoc} konumsuz` : ''}`);
  } catch (e) {
    failed.push(city);
    console.error(`${city}: alınamadı (${e.message})`);
    if (existing) index.push(entry(existing));
  }
  // Uzun çalışmada kesilirse kazanılan konumlar kaybolmasın.
  await writeFile(COORDS_FILE, JSON.stringify(coords) + '\n');
}

if (!ONLY) {
  await writeFile(
    path.join(API_DIR, 'index.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'e-Devlet TİTCK', cities: index }, null, 1) + '\n',
  );
}
console.log(`\nTamamlandı: ${updated} il güncellendi, ${skipped} il zaten günceldi${failed.length ? `, başarısız: ${failed.join(', ')}` : ''}`);
// Birkaç il başarısız olsa da diğerleri kaydedilsin; hiçbiri güncellenemediyse görev kırmızı olsun.
if (failed.length && updated === 0) process.exit(1);
