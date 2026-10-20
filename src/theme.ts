import { useColorScheme } from 'react-native';

const light = {
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

const dark: typeof light = {
  bg: '#1C1714',
  bgAccent: '#241D19',
  card: '#26201B',
  cardMuted: '#211B17',
  text: '#F1E8DF',
  textMuted: '#A39383',
  primary: '#E39A7A',
  primarySoft: '#3A2A22',
  onPrimary: '#1C1714',
  warm: '#E8BC62',
  warmSoft: '#3A3020',
  border: '#352C25',
  shadow: '#000000',
  glow: '#3A2820',
  danger: '#D9664E',
  dangerSoft: '#3E241E',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 18, lg: 28 };
