import { useCallback, useEffect, useMemo, useState } from 'react';
import { getHospitals, type Hospital } from '../data/hospitals';
import type { Coords } from '../types';
import { distanceKm } from '../utils/geo';

export type HospitalWithDistance = Hospital & { id: string; distanceKm: number; dental: boolean };

/** Ağız ve diş sağlığı merkezleri acil durumda işe yaramaz; ayrı bir grupta gösterilir. */
/** Tek dala bakan hastaneler (göz, fizik tedavi vb.) acil durumda ilk öneri olmamalı. */
const SPECIALTY = /göz|fizik tedavi|onkoloji|psikiyatri|ruh sağlığı|ruh ve sinir|diyaliz|tüp bebek|estetik|kulak burun|ftr|rehabilitasyon|kemik iliği|cilt|dermatoloji/;
const DENTAL = /diş hastane|diş hekim|diş sağlı|diş poliklini|diş merkez|ağız ve diş|ağız-diş|dental|\bdent/i;

/** Bu yarıçapın dışındaki hastaneler listelenmez. */
const MAX_KM = 60;
const MAX_ITEMS = 25;

export function useHospitals(coords: Coords | null, enabled: boolean) {
  const [all, setAll] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAll(await getHospitals());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir şeyler ters gitti');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !all && !loading) load();
  }, [enabled, all, loading, load]);

  const nearby: HospitalWithDistance[] = useMemo(() => {
    if (!all || !coords) return [];
    return all
      .map((h, i) => ({
        ...h,
        id: `${i}-${h.name}`,
        dental: DENTAL.test(h.name.toLocaleLowerCase('tr-TR')),
        distanceKm: distanceKm(coords, { latitude: h.lat, longitude: h.lng }),
      }))
      .filter((h) => h.distanceKm <= MAX_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [all, coords]);

  const general = useMemo(() => nearby.filter((h) => !h.dental).slice(0, MAX_ITEMS), [nearby]);
  const emergencyOnly = useMemo(() => nearby.filter((h) => !h.dental && h.emergency).slice(0, MAX_ITEMS), [nearby]);
  const dental = useMemo(() => nearby.filter((h) => h.dental).slice(0, MAX_ITEMS), [nearby]);

  // Acil serviste işaretli en yakın hastane öne çıkar; çok uzaktaysa en yakın hastane.
  const featured = useMemo(() => {
    const pool = general.filter((h) => !SPECIALTY.test(h.name.toLocaleLowerCase('tr-TR')));
    const nearest = pool[0] ?? general[0];
    const er = pool.find((h) => h.emergency);
    if (!nearest) return undefined;
    return er && er.distanceKm <= Math.max(nearest.distanceKm * 2, nearest.distanceKm + 3) ? er : nearest;
  }, [general]);

  return { general, emergencyOnly, dental, featured, loading: loading || (enabled && !all && !error), error, retry: load };
}
