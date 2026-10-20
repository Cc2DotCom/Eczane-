import { useThemeName } from './state/settings';

const light = {
  dark: false as boolean,
  bg: '#FBF6EF',
  bgAccent: '#F5ECE2',
  card: '#FFFDF9',
  cardMuted: '#FCF8F2',
  text: '#3D3229',
  textMuted: '#9A8B7C',
  primary: '#C9785A',
  primarySoft: '#F8E9DF',
  onPrimary: '#FFFFFF',
  warm: '#D9A441',
  warmSoft: '#FBF1DC',
  border: '#EFE5D9',
  shadow: '#8A5A3C',
  glow: '#F6DCCB',
  danger: '#C8553D',
  dangerSoft: '#FBE4DD',
};

/** Beyaza yakın, sade ve nötr. */
const acik: typeof light = {
  dark: false,
  bg: '#F7F7F5',
  bgAccent: '#EDEDEA',
  card: '#FFFFFF',
  cardMuted: '#FAFAF8',
  text: '#2A2A28',
  textMuted: '#8C8C87',
  primary: '#C9785A',
  primarySoft: '#F6EAE4',
  onPrimary: '#FFFFFF',
  warm: '#C99A3A',
  warmSoft: '#F7F0E0',
  border: '#E6E6E2',
  shadow: '#555550',
  glow: '#EFEFEC',
  danger: '#C8553D',
  dangerSoft: '#FAE3DD',
};

/** Siyaha yakın; gece göz yormaz. */
const koyu: typeof light = {
  dark: true,
  bg: '#121212',
  bgAccent: '#1D1D1D',
  card: '#1F1F1F',
  cardMuted: '#1A1A1A',
  text: '#EDEDEA',
  textMuted: '#9C9C97',
  primary: '#E39A7A',
  primarySoft: '#33251F',
  onPrimary: '#121212',
  warm: '#E8BC62',
  warmSoft: '#2D2719',
  border: '#2E2E2E',
  shadow: '#000000',
  glow: '#1E1A18',
  danger: '#E0705A',
  dangerSoft: '#3A221D',
};

export const THEMES = { sicak: light, acik, koyu };

export type Theme = typeof light;

export function useTheme(): Theme {
  return THEMES[useThemeName()];
}

export const radius = { sm: 12, md: 18, lg: 28 };
