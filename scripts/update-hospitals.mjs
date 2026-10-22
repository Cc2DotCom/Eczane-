// Haftada bir GitHub Actions tarafından çalışır: Türkiye'deki hastaneleri OpenStreetMap'ten
// (Overpass API, ücretsiz) çeker ve api/hospitals.json dosyasına yazar.
//
// Kullanım: node scripts/update-hospitals.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'api', 'hospitals.json');
const CLOSED_FILE = path.join(ROOT, 'data', 'hospitals-closed.json');
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const QUERY = `
[out:json][timeout:240];
area["ISO3166-1"="TR"][admin_level=2]->.tr;
nwr["amenity"="hospital"](area.tr);
out center tags;
`;

function kind(tags, name) {
  const op = (tags['operator:type'] || '').toLowerCase();
  const n = name.toLocaleLowerCase('tr-TR');
  if (/üniversite|universite|tıp fakültesi/.test(n) || op === 'university') return 'universite';
  if (/özel|ozel/.test(n) || op === 'private') return 'ozel';
  if (/devlet|eğitim ve araştırma|şehir hastanesi|il hastanesi|ilçe hastanesi/.test(n) || op === 'government' || op === 'public') return 'devlet';
  return null;
}

/** OSM'de "emergency=yes" acil servis demek; işaretlenmemişse bilinmiyor sayarız. */
function emergency(tags) {
  if (tags.emergency === 'yes') return true;
  if (tags.emergency === 'no') return false;
  return null;
}

function address(tags) {
  const parts = [tags['addr:street'] && `${tags['addr:street']}${tags['addr:housenumber'] ? ' No:' + tags['addr:housenumber'] : ''}`, tags['addr:district'] || tags['addr:suburb'], tags['addr:city'] || tags['addr:province']];
  return parts.filter(Boolean).join(', ');
}

async function overpass() {
  let lastError;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'NobetciEczane/1.0 (github.com/Cc2DotCom/Eczane-)' },
        body: new URLSearchParams({ data: QUERY }).toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
      console.warn(`${url}: ${e.message}`);
    }
  }
  throw lastError;
}

/**
 * Kapanmış hastaneler OSM'de çoğu zaman silinmez; ya etiketle işaretlenir ya da adına "eski" eklenir.
 * Bunları ve data/hospitals-closed.json'a elle yazılanları listeye almayız.
 */
function isClosed(tags, name) {
  if (Object.keys(tags).some((k) => /^(disused|abandoned|was|removed|demolished|razed|closed):/.test(k))) return true;
  if (['closed', 'off'].includes((tags.opening_hours || '').trim().toLowerCase())) return true;
  const end = tags.end_date && Date.parse(tags.end_date);
  if (end && end < Date.now()) return true;
  // "Eski Devlet Hastanesi", "... Eski Bina" (Eskişehir, Babaeski gibi adlar hariç tutulur).
  // "... İnşaatı" henüz açılmamış hastane.
  return /(^|[\s(])(eski|kapalı|kapatıldı|kapandı|inşaatı|şantiyesi)([\s)]|$)/.test(name.toLocaleLowerCase('tr-TR'));
}

const norm = (s) => s.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
const closedList = JSON.parse(await readFile(CLOSED_FILE, 'utf8').catch(() => '{}')).closed ?? [];
const near = (a, b) => Math.abs(a.lat - b.lat) < 0.005 && Math.abs(a.lng - b.lng) < 0.006;
const manuallyClosed = (name, lat, lng) =>
  closedList.some((c) => {
    const entry = typeof c === 'string' ? { name: c } : c;
    return norm(entry.name) === norm(name) && (entry.lat == null || near(entry, { lat, lng }));
  });

const data = await overpass();
let dropped = 0;
const seen = new Set();
const hospitals = [];
for (const el of data.elements ?? []) {
  const tags = el.tags ?? {};
  const name = (tags['name:tr'] || tags.name || '').trim();
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!name || lat == null || lng == null) continue;
  if (isClosed(tags, name) || manuallyClosed(name, lat, lng)) {
    dropped++;
    continue;
  }
  // Aynı hastane hem nokta hem alan olarak girilmiş olabilir.
  const key = `${name.toLocaleLowerCase('tr-TR')}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  hospitals.push({
    name,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    emergency: emergency(tags),
    kind: kind(tags, name),
    phone: tags.phone || tags['contact:phone'] || '',
    address: address(tags),
  });
}

if (hospitals.length < 500) throw new Error(`Beklenenden az hastane geldi (${hospitals.length}); dosya güncellenmedi`);
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify({ updatedAt: new Date().toISOString(), source: 'OpenStreetMap katkıcıları (ODbL)', hospitals }) + '\n',
);
const em = hospitals.filter((h) => h.emergency).length;
console.log(`${hospitals.length} hastane yazıldı, ${em} tanesinde acil servis işaretli, ${dropped} kapalı hastane çıkarıldı`);
