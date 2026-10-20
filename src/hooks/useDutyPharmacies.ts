import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CityNotCoveredError, getDutyPharmacies } from '../data/repository';
import type { Area, Coords, DutyResult, PharmacyWithDistance } from '../types';
import { dutyDayKey } from '../utils/duty';
import { distanceKm } from '../utils/geo';

const REFRESH_MS = 10 * 60 * 1000;

export function useDutyPharmacies(area: Area | null, coords: Coords | null) {
  const [result, setResult] = useState<DutyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notCovered, setNotCovered] = useState(false);
  const dayRef = useRef(dutyDayKey());
  // İl hızlıca değiştirilirse geç gelen eski yanıt yenisinin üzerine yazmasın.
  const reqRef = useRef(0);
  const areaKey = area ? `${area.city}|${area.district ?? ''}` : '';

  const load = useCallback(
    async (mode: 'initial' | 'pull' | 'silent' = 'initial') => {
      if (!area) return;
      const req = ++reqRef.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'pull') setRefreshing(true);
      try {
        const r = await getDutyPharmacies(area, coords, { force: mode === 'pull' });
        if (req !== reqRef.current) return;
        setResult(r);
        setError(null);
        setNotCovered(false);
        dayRef.current = dutyDayKey();
      } catch (e) {
        if (req !== reqRef.current) return;
        if (e instanceof CityNotCoveredError) {
          setResult(null);
          setNotCovered(true);
        }
        setError(e instanceof Error ? e.message : 'Bir şeyler ters gitti');
      } finally {
        if (req === reqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // coords yalnızca demo verisi için merkez; her küçük konum değişiminde yeniden indirmeyelim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areaKey, coords != null],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Uygulamaya dönünce, periyodik olarak ve nöbet günü değiştiğinde tazele.
  useEffect(() => {
    const tick = () => {
      const changedDay = dayRef.current !== dutyDayKey();
      load(changedDay ? 'initial' : 'silent');
    };
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [load]);

  const pharmacies: PharmacyWithDistance[] = useMemo(() => {
    const list = (result?.pharmacies ?? []).map((p) => ({
      ...p,
      distanceKm: coords && p.coords ? distanceKm(coords, p.coords) : null,
    }));
    return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [result, coords]);

  return {
    pharmacies,
    source: result?.source,
    origin: result?.origin,
    fetchedAt: result?.fetchedAt,
    /** Liste bugünün nöbet gününe ait değilse (güncelleme gecikmişse) true. */
    stale: !!result && result.dutyDay !== dutyDayKey(),
    offline: !!result?.offline,
    notCovered,
    loading,
    refreshing,
    error,
    refresh: () => load('pull'),
  };
}
