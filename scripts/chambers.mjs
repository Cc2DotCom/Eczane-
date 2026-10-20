// e-Devlet'te nöbet listesi yayınlanmayan iller için eczacı odalarının kendi siteleri.
// Bu sitelerin çoğu aynı altyapıyı kullanıyor: her eczane bir <h4><strong>AD</strong></h4> kartı,
// altında adres (fa-home), telefon (tel:) ve harita bağlantısı (maps?q=enlem,boylam).

import { decode, inTurkey, pharmacyName, slug, titleCase } from './text.mjs';

const UA = 'Mozilla/5.0 (Linux; Android 14) NobetciEczane/1.0 (+https://github.com/Cc2DotCom/Eczane-)';

const HAKKARI = new Set(['yuksekova', 'semdinli', 'cukurca', 'derecik']);
const BILECIK = new Set(['merkez', 'bozuyuk', 'golpazari', 'osmaneli', 'pazaryeri', 'sogut', 'inhisar', 'yenipazar']);

/**
 * Her kaynak: hangi illeri kapsadığı, adresi ve (birden çok il varsa) satırın hangi ile ait olduğu.
 * `route` satırın il kodunu döndürür; kapsanan illerden biri değilse satır atlanır.
 */
export const CHAMBERS = [
  { cities: [22], name: 'Edirne Eczacı Odası', url: 'https://www.edirneeo.org.tr/nobetci-eczaneler' },
  { cities: [38], name: 'Kayseri Eczacı Odası', url: 'https://www.kayserieo.org.tr/nobetci-eczaneler' },
  { cities: [23], name: 'Elazığ Eczacı Odası', url: 'https://www.elazigeczaciodasi.org.tr/nobetci-eczaneler/elazig' },
  { cities: [44], name: 'Malatya Eczacı Odası', url: 'https://www.malatyaeczaciodasi.org.tr/nobetci-eczaneler' },
  { cities: [8], name: 'Trabzon Eczacı Odası', url: 'https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/8' },
  {
    cities: [72, 49],
    name: 'Batman Eczacı Odası',
    url: 'https://www.batmaneczaciodasi.org.tr/nobetci-eczaneler',
    route: (r) => (r.province === 'mus' ? 49 : 72),
  },
  {
    cities: [26],
    name: 'Eskişehir Eczacı Odası',
    url: 'https://www.eskisehireo.org.tr/',
    // Oda Bilecik'i de kapsıyor; Eskişehir merkezi "MERKEZ-ODUNPAZARI" gibi yazılıyor.
    route: (r) => (BILECIK.has(slug(r.rawDistrict)) ? 11 : 26),
  },
  {
    cities: [30],
    name: 'Van Eczacı Odası',
    url: 'https://www.vaneczaciodasi.org.tr/nobetci-eczaneler',
    // Oda Hakkari ve Bitlis'i de kapsıyor. Hakkari merkezi, Van merkezinden konumuyla ayrılır.
    route: (r) => {
      const d = slug(r.rawDistrict);
      if (HAKKARI.has(d) || d === 'hakkari' || (d === 'merkez' && r.lat != null && r.lat < 37.9)) return 30;
      return 65;
    },
  },
  {
    cities: [79],
    name: 'Gaziantep Eczacı Odası',
    url: 'https://www.gaziantepeo.org.tr/nobetci-eczaneler',
    parse: parseTable,
    route: (r) => (/^kilis/.test(slug(r.rawDistrict)) ? 79 : 27),
  },
  { cities: [9], name: 'Aydın Eczacı Odası', url: 'https://www.aydineczaciodasi.org.tr/mobil/', fetch: fetchAydin },
];

export const CHAMBER_CITIES = new Set(CHAMBERS.flatMap((c) => c.cities));

async function get(url, encoding = 'utf-8') {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'tr-TR,tr' }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

const coordsOf = (html) => {
  const m = html.match(/maps(?:\/place\/|\?q=)(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (!m) return { lat: null, lng: null };
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return inTurkey(lat, lng) ? { lat, lng } : { lat: null, lng: null };
};

/** "20.10.2026 08:30" → "2026-10-20T08:30:00+03:00" */
const isoTime = (d, t) => {
  const [dd, mm, yy] = d.split('.');
  return `${yy}-${mm}-${dd}T${t}:00+03:00`;
};

/** "MERKEZ-ODUNPAZARI" → "Odunpazarı", "KİLİS MERKEZ" → "Merkez" */
function cleanDistrict(s) {
  let d = decode(s).replace(/^merkez\s*[-/]\s*/i, '').replace(/^k[iİ]l[iİ]s\s+/i, '').trim();
  if (slug(d) === 'eskimalatya') d = 'Battalgazi';
  return d ? titleCase(d) : '';
}

/** Bölüm başlığından ilçe: "ENEZ BUGÜN NÖBETÇİ ECZANELER" → "ENEZ"; tarihli genel başlıklar boş döner. */
function sectionDistrict(heading) {
  const t = decode(heading);
  const i = t.toLocaleUpperCase('tr-TR').indexOf('NÖBETÇİ');
  if (i < 0) return null;
  let s = t.slice(0, i)
    .replace(/\d{1,2}\s+\S+\s+\d{4}/g, '')
    .replace(/\d{1,2}[./]\d{1,2}[./]\d{4}/g, '')
    .replace(/\b(bugün|bugun)\b/gi, '')
    .replace(/\S+'(da|de|ta|te)\b/gi, '')
    .trim();
  if (s.includes(' - ')) s = s.split(' - ').pop();
  return s.trim() || null;
}

/** Kart düzenindeki sayfalar (Edirne, Kayseri, Van, Batman, Eskişehir…). */
export function parseCards(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  const parts = html.split(/(?=<h[1-4][\s>])/i);
  const rows = [];
  let section = null;
  for (const part of parts) {
    const head = part.match(/^<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (!head) continue;
    const strong = head[2].match(/<strong>([\s\S]*?)<\/strong>/i);
    const body = part.slice(head[0].length);
    const hasDetails = /tel:|fa-home|icon-home/.test(body.split(/<h[1-4][\s>]/i)[0]);
    // Bazı sitelerde ad iki kez yazılıyor (mobil/masaüstü); ayrıntısı olmayan kopya atlanır.
    if (strong && /eczane/i.test(strong[1]) && !hasDetails) continue;
    if (!strong || !hasDetails) {
      const sd = sectionDistrict(head[2]);
      if (sd !== null || /nöbetçi/i.test(decode(head[2]))) section = sd;
      continue;
    }
    // Van: <strong>AD<br><small>İLÇE</small></strong>
    const small = strong[1].match(/<small>([\s\S]*?)<\/small>/i)?.[1];
    const rawName = decode(strong[1].replace(/<small>[\s\S]*?<\/small>/i, '')).replace(/!!.*?!!/g, '').trim();
    // Edirne/Batman: "</strong> - MERKEZ / BATMAN"
    const after = decode(head[2].slice(head[2].indexOf(strong[0]) + strong[0].length)).replace(/^-\s*/, '');
    const [afterDistrict, province] = after.split('/').map((x) => x.trim());
    const arrow = body.match(/(?:fa|icon)-arrow-right[^>]*><\/i>([^<]*)/)?.[1];
    const rawDistrict = decode(small ?? (afterDistrict || arrow || section || 'Merkez'));
    const address = decode(body.match(/(?:fa|icon)-home[^>]*><\/i>([\s\S]*?)(?:<br|<\/p>)/i)?.[1] ?? '');
    const phone = body.match(/tel:([+\d\s]+)/)?.[1].replace(/\s/g, '') ?? '';
    const time = body.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s*[/-]\s*(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})/);
    if (!rawName) continue;
    rows.push({
      rawDistrict,
      province: province ? slug(province) : null,
      district: cleanDistrict(rawDistrict) || 'Merkez',
      name: pharmacyName(rawName),
      address,
      phone,
      dutyStart: time ? isoTime(time[1], time[2]) : null,
      dutyEnd: time ? isoTime(time[3], time[4]) : null,
      approved: true,
      ...coordsOf(body),
    });
  }
  return rows;
}

/** Tablo düzeni (Gaziantep): <td>AD</td><td>adres / <b>İLÇE</b><br/>Telefon : …</td> */
export function parseTable(html) {
  const rows = [];
  for (const tr of html.matchAll(/<tr[^>]*>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi)) {
    const name = decode(tr[1]).replace(/\s*\([^)]*\)\s*$/, '');
    if (!/eczane/i.test(name)) continue;
    const district = tr[2].match(/<b>([\s\S]*?)<\/b>/i)?.[1] ?? '';
    const address = decode(tr[2].split(/\/\s*<b>/i)[0]);
    const phone = decode(tr[2].match(/Telefon\s*:\s*([^<]*)/i)?.[1] ?? '').replace(/[^\d+]/g, '');
    rows.push({
      rawDistrict: decode(district),
      district: cleanDistrict(district) || 'Merkez',
      name: pharmacyName(name),
      address,
      phone,
      dutyStart: null,
      dutyEnd: null,
      approved: true,
      ...coordsOf(tr[0]),
    });
  }
  return rows;
}

/** Aydın: mobil sitede ilçe ilçe sayfalar; her eczane <h1><b>AD</b></h1>, ardından adres, telefon, harita. */
async function fetchAydin(src) {
  const index = await get(src.url + 'nobetci-eczaneler', 'iso-8859-9');
  const districts = [...index.matchAll(/<option value="(nobetler-\d+)">([^<]+)<\/option>/g)];
  const rows = [];
  for (const [, href, label] of districts) {
    const html = await get(src.url + href, 'iso-8859-9');
    for (const art of html.split(/<article/i).slice(1)) {
      const name = art.match(/<h1[^>]*>\s*<b>([\s\S]*?)<\/b>/i)?.[1];
      if (!name) continue;
      rows.push({
        rawDistrict: label,
        district: titleCase(label.trim()),
        name: pharmacyName(decode(name)),
        address: decode(art.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? ''),
        phone: art.match(/tel:([+\d]+)/)?.[1] ?? '',
        dutyStart: null,
        dutyEnd: null,
        approved: true,
        ...coordsOf(art),
      });
    }
  }
  return rows;
}

const cache = new Map();

/** İlin eczacı odası sitesinden bugünkü listeyi getirir. Kaynak yoksa null. */
export async function fetchChamber(code) {
  const src = CHAMBERS.find((c) => c.cities.includes(code));
  if (!src) return null;
  if (!cache.has(src)) {
    cache.set(src, (src.fetch ? src.fetch(src) : get(src.url).then(src.parse ?? parseCards)).catch((e) => e));
  }
  const all = await cache.get(src);
  if (all instanceof Error) throw all;
  const seen = new Set();
  const rows = all
    .filter((r) => (src.route ? src.route(r) : src.cities[0]) === code)
    .filter((r) => {
      const k = slug(r.name) + slug(r.address);
      return !seen.has(k) && seen.add(k);
    })
    .map(({ rawDistrict, province, ...r }) => r);
  return { rows, source: src.name, sourceUrl: src.url };
}
