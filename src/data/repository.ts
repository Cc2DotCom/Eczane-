import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Area, Coords, DutyResult, Pharmacy } from '../types';
import { dutyDayKey } from '../utils/duty';
import { normalizeTr } from '../utils/text';
import { demoPharmacies } from './demo';

/**
 * Nöbet listeleri, repodaki GitHub Actions görevi (scripts/update-duty.mjs) tarafından her sabah
 * e-Devlet'teki TİTCK hizmetinden okunup api/duty/<il>.json dosyalarına yazılır; uygulama yalnızca bu dosyaları okur.
 */
const DATA_URL = process.env.EXPO_PUBLIC_DATA_URL ?? 'https://raw.githubusercontent.com/Cc2DotCom/Eczane-/main/api';
/** raw.githubusercontent.com bazı ağlarda yavaş ya da erişilemez; aynı dosyalar jsDelivr CDN'inden de sunulur. */
const MIRROR_URL = 'https://cdn.jsdelivr.net/gh/Cc2DotCom/Eczane-@main/api';
/** Bir kaynak bu sürede yanıt vermezse diğerine geçilir; kullanıcı asla sonsuza kadar beklemez. */
const TIMEOUT_MS = 7000;
const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
/** Aynı nöbet günü içinde bu süreden yeni önbellek tekrar indirilmez. */
const FRESH_MS = 10 * 60 * 1000;

export const usingDemoData = DEMO;

export class CityNotCoveredError extends Error {
  constructor(city: string) {
    super(`${city} için nöbet listesi henüz eklenmedi`);
  }
}

type RemoteFile = {
  city: string;
  dutyDay: string;
  updatedAt: string;
  /** İlin listesi resmi kaynakta (e-Devlet) yayınlanmıyorsa true. */
  unavailable?: boolean;
  pharmacies: {
    name: string;
    district: string;
    address: string;
    phone: string;
    lat: number | null;
    lng: number | null;
    dutyStart?: string | null;
    dutyEnd?: string | null;
  }[];
};

function toPharmacies(file: RemoteFile): Pharmacy[] {
  return (file.pharmacies ?? []).map((p, i) => ({
    id: `${file.dutyDay}-${i}-${p.name}`,
    name: p.name,
    district: p.district || file.city,
    address: p.address,
    phone: p.phone,
    coords: p.lat != null && p.lng != null ? { latitude: p.lat, longitude: p.lng } : null,
    dutyStart: p.dutyStart,
    dutyEnd: p.dutyEnd,
  }));
}

function byDistrict(list: Pharmacy[], district?: string) {
  if (!district) return list;
  const d = normalizeTr(district);
  const hit = list.filter((p) => normalizeTr(p.district) === d);
  return hit.length ? hit : list;
}

async function fetchJson(url: string): Promise<{ status: number; json?: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { status: res.status };
    return { status: res.status, json: await res.json() };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadCityFile(slug: string, city: string, today: string): Promise<RemoteFile> {
  let lastError: unknown;
  for (const base of [DATA_URL, MIRROR_URL]) {
    try {
      const r = await fetchJson(`${base}/duty/${slug}.json?d=${today}`);
      if (r.status === 404) throw new CityNotCoveredError(city);
      if (r.json) return r.json as RemoteFile;
      lastError = new Error(`Liste alınamadı (${r.status})`);
    } catch (e) {
      if (e instanceof CityNotCoveredError) throw e;
      lastError = e;
    }
  }
  console.warn('Nöbet listesi indirilemedi', lastError);
  throw new Error('Listeye şu an ulaşılamıyor. İnternet bağlantını kontrol edip tekrar dene.');
}

export async function getDutyPharmacies(
  area: Area,
  center: Coords | null,
  opts: { force?: boolean } = {},
): Promise<DutyResult> {
  const today = dutyDayKey();
  if (DEMO) {
    return { pharmacies: demoPharmacies(area, center, today), source: 'demo', fetchedAt: Date.now(), dutyDay: today };
  }

  const slug = normalizeTr(area.city);
  const key = `duty:${slug}`;
  const cached = await AsyncStorage.getItem(key)
    .then((v) => (v ? (JSON.parse(v) as { file: RemoteFile; fetchedAt: number }) : null))
    .catch(() => null);

  const build = (c: { file: RemoteFile; fetchedAt: number }): DutyResult => ({
    // Konum yoksa (il elle seçildiyse) ilçeye göre süzeriz; konum varsa tüm il mesafeye göre sıralanır.
    pharmacies: center ? toPharmacies(c.file) : byDistrict(toPharmacies(c.file), area.district),
    source: 'remote',
    fetchedAt: c.fetchedAt,
    dutyDay: c.file.dutyDay,
  });

  if (cached && !opts.force && cached.file.dutyDay === today && Date.now() - cached.fetchedAt < FRESH_MS) {
    return build(cached);
  }

  try {
    const entry = { file: await downloadCityFile(slug, area.city, today), fetchedAt: Date.now() };
    if (entry.file.unavailable) throw new CityNotCoveredError(area.city);
    AsyncStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
    return build(entry);
  } catch (e) {
    // İnternet yoksa elimizdeki son listeyi gösteririz; eskiyse arayüz uyarır.
    if (cached && !(e instanceof CityNotCoveredError)) return build(cached);
    throw e;
  }
}
