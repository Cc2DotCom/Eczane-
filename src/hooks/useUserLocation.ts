import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Area, Coords } from '../types';

export type LocationState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; coords: Coords; area: Area | null };

function cleanCity(s: string | null | undefined) {
  return s?.replace(/\s*(ili|province)$/i, '').trim() || null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

async function areaFor(coords: Coords): Promise<Area | null> {
  try {
    const [addr] = (await withTimeout(Location.reverseGeocodeAsync(coords), 8000)) ?? [];
    const city = cleanCity(addr?.region) ?? cleanCity(addr?.city);
    return city ? { city, district: addr?.subregion ?? addr?.district ?? undefined } : null;
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const [state, setState] = useState<LocationState>({ status: 'loading' });

  const locate = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setState({ status: 'denied' });
        return;
      }
      // Son bilinen konum yalnızca tazeyse doğrudan kullanılır; eski bir konum başka
      // bir semtin nöbetçilerini getirebilir.
      const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000, requiredAccuracy: 300 });
      // Kapalı alanda uydu bulunamayınca konum isteği dakikalarca sürebilir; sınır koyarız.
      const fresh = last
        ? null
        : await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 10000);
      // Hâlâ yoksa eski de olsa telefonun bildiği son konumu kullanır, sonra arkadan düzeltiriz.
      const pos = last ?? fresh ?? (await Location.getLastKnownPositionAsync());
      if (!pos) {
        setState({ status: 'error', message: 'Konumun bulunamadı' });
        return;
      }
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setState({ status: 'ready', coords, area: await areaFor(coords) });

      if (!fresh) {
        // Hızlı açılış için önbellekteki konumu gösterdik; şimdi kesin konumu al.
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then(async (p) => {
            const c = { latitude: p.coords.latitude, longitude: p.coords.longitude };
            const area = await areaFor(c);
            setState((s) => (s.status === 'ready' ? { status: 'ready', coords: c, area: area ?? s.area } : s));
          })
          .catch(() => {});
      }
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Konum alınamadı' });
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { location: state, relocate: locate };
}
