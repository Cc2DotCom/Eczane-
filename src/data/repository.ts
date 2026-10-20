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
  return file.pharmacies.map((p, i) => ({
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
    const res = await fetch(`${DATA_URL}/duty/${slug}.json?d=${today}`);
    if (res.status === 404) throw new CityNotCoveredError(area.city);
    if (!res.ok) throw new Error(`Liste alınamadı (${res.status})`);
    const entry = { file: (await res.json()) as RemoteFile, fetchedAt: Date.now() };
    AsyncStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
    return build(entry);
  } catch (e) {
    // İnternet yoksa elimizdeki son listeyi gösteririz; eskiyse arayüz uyarır.
    if (cached && !(e instanceof CityNotCoveredError)) return build(cached);
    throw e;
  }
}
