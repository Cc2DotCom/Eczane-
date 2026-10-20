import { useCallback, useEffect, useMemo, useState } from 'react';
import { getHospitals, type Hospital } from '../data/hospitals';
import type { Coords } from '../types';
import { distanceKm } from '../utils/geo';

export type HospitalWithDistance = Hospital & { id: string; distanceKm: number };

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
      .map((h, i) => ({ ...h, id: `${i}-${h.name}`, distanceKm: distanceKm(coords, { latitude: h.lat, longitude: h.lng }) }))
      .filter((h) => h.distanceKm <= MAX_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_ITEMS);
  }, [all, coords]);

  // Acil serviste işaretli en yakın hastane öne çıkar; çok uzaktaysa en yakın hastane.
  const featured = useMemo(() => {
    const nearest = nearby[0];
    const er = nearby.find((h) => h.emergency);
    if (!nearest) return undefined;
    return er && er.distanceKm <= Math.max(nearest.distanceKm * 2, nearest.distanceKm + 3) ? er : nearest;
  }, [nearby]);

  return { nearby, featured, loading: loading || (enabled && !all && !error), error, retry: load };
}
