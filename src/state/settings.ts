import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const KEY = 'settings:largeText';
let largeText = false;
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === '1') setLargeText(true);
  })
  .catch(() => {});

export function setLargeText(on: boolean) {
  largeText = on;
  AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

/** Büyük yazı tercihi uygulama genelinde paylaşılır; tüm metinler buna göre büyür. */
export function useLargeText() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => largeText,
  );
}
