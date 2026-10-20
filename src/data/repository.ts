import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Area, Coords, DutyResult, Pharmacy } from '../types';
import { dutyDayKey } from '../utils/duty';
import { normalizeTr } from '../utils/text';
import { demoPharmacies } from './demo';

/**
 * Nöbet listeleri, repodaki GitHub Actions görevi (scripts/update-duty.mjs) tarafından her sabah
 * e-Devlet'teki TİTCK hizmetinden okunup api/duty/<il>.json dosyalarına yazılır; uygulama yalnızca bu dosyaları okur.
 */
export const DATA_URL = process.env.EXPO_PUBLIC_DATA_URL ?? 'https://raw.githubusercontent.com/Cc2DotCom/Eczane-/main/api';
const REPO = 'Cc2DotCom/Eczane-';
/**
 * Aynı dosyalar birkaç farklı adresten sunulur. Bazı internet sağlayıcıları ya da ağlar bunlardan
 * birine ulaşamayabiliyor; hepsine aynı anda sorulur, ilk gelen güncel yanıt kullanılır.
 */
const SOURCES: { base: string; headers?: Record<string, string> }[] = [
  { base: DATA_URL },
  { base: `https://cdn.jsdelivr.net/gh/${REPO}@main/api` },
  { base: `https://api.github.com/repos/${REPO}/contents/api`, headers: { Accept: 'application/vnd.github.raw+json' } },
  { base: `https://cdn.statically.io/gh/${REPO}/main/api` },
  { base: `https://raw.githack.com/${REPO}/main/api` },
];
/** Hiçbir kaynak bu sürede yanıt vermezse kullanıcıya hata gösterilir; asla sonsuza kadar beklenmez. */
const TIMEOUT_MS = 15000;
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

async function fetchJson(url: string, headers: Record<string, string> | undefined, signal: AbortSignal) {
  const res = await fetch(url, { headers, signal });
  if (!res.ok) return { status: res.status };
  return { status: res.status, json: (await res.json()) as unknown };
}

/**
 * Dosyayı tüm kaynaklardan aynı anda ister. `isFresh` doğru dönen ilk yanıt hemen kullanılır;
 * hiçbiri güncel değilse eldeki en iyi yanıt döner. Hiçbiri yoksa 404 (dosya yok) ya da hata.
 */
export function fetchFromSources(path: string, isFresh: (json: unknown) => boolean = () => true) {
  return new Promise<{ status: number; json?: unknown }>((resolve, reject) => {
    const ctrl = new AbortController();
    let pending = SOURCES.length;
    let fallback: unknown;
    let notFound = false;
    let done = false;
    const finish = (r: { status: number; json?: unknown } | Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ctrl.abort();
      if (r instanceof Error) reject(r);
      else resolve(r);
    };
    const settle = () => {
      if (--pending > 0) return;
      if (fallback !== undefined) finish({ status: 200, json: fallback });
      else if (notFound) finish({ status: 404 });
      else finish(new Error('Hiçbir kaynağa ulaşılamadı'));
    };
    const timer = setTimeout(() => {
      if (fallback !== undefined) finish({ status: 200, json: fallback });
      else finish(new Error('Kaynaklar zamanında yanıt vermedi'));
    }, TIMEOUT_MS);

    for (const src of SOURCES) {
      fetchJson(`${src.base}${path}`, src.headers, ctrl.signal)
        .then((r) => {
          if (r.json !== undefined) {
            if (isFresh(r.json)) return finish({ status: 200, json: r.json });
            fallback ??= r.json;
          } else if (r.status === 404 && src.base === DATA_URL) {
            notFound = true;
          }
        })
        .catch(() => {})
        .finally(settle);
    }
  });
}

async function downloadCityFile(slug: string, city: string, today: string): Promise<RemoteFile> {
  try {
    const r = await fetchFromSources(`/duty/${slug}.json`, (j) => (j as RemoteFile)?.dutyDay === today);
    if (r.status === 404) throw new CityNotCoveredError(city);
    return r.json as RemoteFile;
  } catch (e) {
    if (e instanceof CityNotCoveredError) throw e;
    console.warn('Nöbet listesi indirilemedi', e);
    throw new Error('Listeye şu an ulaşılamıyor. İnternet bağlantını kontrol edip tekrar dene.');
  }
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
