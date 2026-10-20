import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type ThemeName = 'sicak' | 'acik' | 'koyu';

type State = { largeText: boolean; theme: ThemeName; welcomeVisible: boolean };

const KEYS = { largeText: 'settings:largeText', theme: 'settings:theme', welcome: 'welcome:v1' };
let state: State = { largeText: false, theme: 'sicak', welcomeVisible: false };
const listeners = new Set<() => void>();

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

AsyncStorage.multiGet([KEYS.largeText, KEYS.theme, KEYS.welcome])
  .then(([[, large], [, theme], [, seen]]) => {
    update({
      largeText: large === '1',
      theme: theme === 'acik' || theme === 'koyu' ? theme : 'sicak',
      welcomeVisible: !seen,
    });
  })
  .catch(() => {});

export function setLargeText(on: boolean) {
  AsyncStorage.setItem(KEYS.largeText, on ? '1' : '0').catch(() => {});
  update({ largeText: on });
}

export function setThemeName(theme: ThemeName) {
  AsyncStorage.setItem(KEYS.theme, theme).catch(() => {});
  update({ theme });
}

export function showWelcome() {
  update({ welcomeVisible: true });
}

export function hideWelcome() {
  AsyncStorage.setItem(KEYS.welcome, '1').catch(() => {});
  update({ welcomeVisible: false });
}

function useSetting<K extends keyof State>(key: K): State[K] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state[key],
  );
}

/** Büyük yazı tercihi uygulama genelinde paylaşılır; tüm metinler buna göre büyür. */
export const useLargeText = () => useSetting('largeText');
export const useThemeName = () => useSetting('theme');
export const useWelcomeVisible = () => useSetting('welcomeVisible');
