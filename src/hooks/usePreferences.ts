import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { Area } from '../types';

const FAV_KEY = 'prefs:favorites';
const AREA_KEY = 'prefs:manualArea';

/** Favoriler eczane adına göre tutulur; nöbet her gün değiştiği için id yerine ad kalıcıdır. */
export function usePreferences() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [manualArea, setManualAreaState] = useState<Area | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(FAV_KEY), AsyncStorage.getItem(AREA_KEY)])
      .then(([f, a]) => {
        if (f) setFavorites(JSON.parse(f));
        if (a) setManualAreaState(JSON.parse(a));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      AsyncStorage.setItem(FAV_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setManualArea = useCallback((area: Area | null) => {
    setManualAreaState(area);
    if (area) AsyncStorage.setItem(AREA_KEY, JSON.stringify(area)).catch(() => {});
    else AsyncStorage.removeItem(AREA_KEY).catch(() => {});
  }, []);

  return { ready, favorites, toggleFavorite, manualArea, setManualArea };
}
