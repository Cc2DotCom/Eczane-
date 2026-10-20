import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFromSources } from './repository';

/**
 * Hastaneler, repodaki haftalık görev (scripts/update-hospitals.mjs) tarafından
 * OpenStreetMap'ten api/hospitals.json dosyasına yazılır.
 */
export type Hospital = {
  name: string;
  lat: number;
  lng: number;
  /** OSM'de acil servis işaretliyse true, "yok" denmişse false, bilinmiyorsa null. */
  emergency: boolean | null;
  kind: 'devlet' | 'ozel' | 'universite' | null;
  phone: string;
  address: string;
};

const KEY = 'hospitals:v1';
/** Hastane listesi haftada bir değişir; günde bir tazelemek yeterli. */
const FRESH_MS = 24 * 60 * 60 * 1000;

export async function getHospitals(): Promise<Hospital[]> {
  const cached = await AsyncStorage.getItem(KEY)
    .then((v) => (v ? (JSON.parse(v) as { hospitals: Hospital[]; fetchedAt: number }) : null))
    .catch(() => null);
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached.hospitals;

  const list = await fetchFromSources('/hospitals.json', (j) => !!(j as { hospitals?: Hospital[] })?.hospitals?.length)
    .then((r) => (r.json as { hospitals?: Hospital[] } | undefined)?.hospitals)
    .catch(() => undefined);
  if (list?.length) {
    AsyncStorage.setItem(KEY, JSON.stringify({ hospitals: list, fetchedAt: Date.now() })).catch(() => {});
    return list;
  }
  if (cached) return cached.hospitals;
  throw new Error('Hastane listesine şu an ulaşılamıyor. İnternet bağlantını kontrol edip tekrar dene.');
}
