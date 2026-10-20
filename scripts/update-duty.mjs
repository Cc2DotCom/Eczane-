// Her sabah GitHub Actions tarafından çalışır: api/cities.json'daki iller için
// CollectAPI'den nöbetçi eczaneleri çeker ve api/duty/<il>.json dosyalarına yazar.
// Uygulama CollectAPI'ye değil bu dosyalara bakar; böylece kullanıcı sayısı API kotasını etkilemez.
//
// Kullanım: COLLECTAPI_KEY=... node scripts/update-duty.mjs [--force]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const API_DIR = path.join(ROOT, 'api');
const KEY = process.env.COLLECTAPI_KEY;
const FORCE = process.argv.includes('--force');

if (!KEY) {
  console.error('COLLECTAPI_KEY tanımlı değil. GitHub > Settings > Secrets and variables > Actions altına ekleyin.');
  process.exit(1);
}

/** Nöbet günü Türkiye saatiyle 08:30'da değişir (uygulamadaki src/utils/duty.ts ile aynı kural). */
function dutyDay(now = new Date()) {
  const tr = new Date(now.getTime() + 3 * 3600 * 1000);
  if (tr.getUTCHours() * 60 + tr.getUTCMinutes() < 8 * 60 + 30) tr.setUTCDate(tr.getUTCDate() - 1);
  return tr.toISOString().slice(0, 10);
}

function slug(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function titleCase(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .split(/\s+/)
    .map((w) => (w ? w[0].toLocaleUpperCase('tr-TR') + w.slice(1) : w))
    .join(' ');
}

const inTurkey = (lat, lng) => lat > 35.5 && lat < 42.3 && lng > 25.5 && lng < 45;

/** Kaynakta enlem/boylam bazen ters ya da boş geliyor; Türkiye dışına düşeni atarız. */
function parseLoc(loc) {
  if (!loc) return null;
  const [a, b] = String(loc).split(',').map((v) => parseFloat(v.replace(/\s/g, '')));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (inTurkey(a, b)) return { lat: a, lng: b };
  if (inTurkey(b, a)) return { lat: b, lng: a };
  return null;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchCity(city) {
  const url = `https://api.collectapi.com/health/dutyPharmacy?il=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { authorization: `apikey ${KEY}`, 'content-type': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.result)) throw new Error(json.message || 'Beklenmeyen yanıt');
  return json.result.map((r) => {
    const loc = parseLoc(r.loc);
    return {
      name: titleCase(String(r.name ?? 'Eczane')).replace(/\s*eczanes[iı]\s*$/i, '') + ' Eczanesi',
      district: r.dist ? titleCase(r.dist) : '',
      address: r.address ?? '',
      phone: r.phone ?? '',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    };
  });
}

const config = await readJson(path.join(API_DIR, 'cities.json'));
const today = dutyDay();
await mkdir(path.join(API_DIR, 'duty'), { recursive: true });

const index = [];
let failures = 0;

for (const city of config?.cities ?? []) {
  const file = path.join(API_DIR, 'duty', `${slug(city)}.json`);
  const existing = await readJson(file);

  // Bugünün listesi zaten varsa API kotasını harcamayız.
  if (existing?.dutyDay === today && !FORCE) {
    console.log(`${city}: bugünün listesi zaten var, atlandı`);
    index.push({ city, slug: slug(city), dutyDay: existing.dutyDay, updatedAt: existing.updatedAt, count: existing.pharmacies.length });
    continue;
  }

  try {
    const pharmacies = await fetchCity(city);
    if (pharmacies.length === 0) throw new Error('Liste boş geldi');
    const data = { city, dutyDay: today, updatedAt: new Date().toISOString(), source: 'collectapi', pharmacies };
    await writeFile(file, JSON.stringify(data, null, 1) + '\n');
    index.push({ city, slug: slug(city), dutyDay: today, updatedAt: data.updatedAt, count: pharmacies.length });
    const noLoc = pharmacies.filter((p) => p.lat == null).length;
    console.log(`${city}: ${pharmacies.length} eczane yazıldı${noLoc ? ` (${noLoc} tanesinin konumu yok)` : ''}`);
  } catch (e) {
    failures++;
    // Eski dosyaya dokunmayız; uygulama tarihinden listenin eski olduğunu anlar ve uyarı gösterir.
    console.error(`${city}: alınamadı (${e.message})`);
    if (existing) index.push({ city, slug: slug(city), dutyDay: existing.dutyDay, updatedAt: existing.updatedAt, count: existing.pharmacies.length });
  }
}

await writeFile(path.join(API_DIR, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), cities: index }, null, 1) + '\n');
if (failures) process.exit(1);
