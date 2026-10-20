import { useColorScheme } from 'react-native';

const light = {
  bg: '#F5F4F1',
  bgAccent: '#EEF1F4',
  card: '#FFFFFF',
  cardMuted: '#FAF9F7',
  text: '#2F3640',
  textMuted: '#8A919A',
  primary: '#6B86A3',
  primarySoft: '#EDF1F5',
  onPrimary: '#FFFFFF',
  warm: '#D4A386',
  warmSoft: '#F7EEE8',
  border: '#E9E7E3',
  shadow: '#4A5260',
};

const dark: typeof light = {
  bg: '#15181C',
  bgAccent: '#1B2026',
  card: '#1E2227',
  cardMuted: '#1A1E22',
  text: '#E4E7EB',
  textMuted: '#8E96A0',
  primary: '#93AAC4',
  primarySoft: '#252C34',
  onPrimary: '#12161A',
  warm: '#D6AC91',
  warmSoft: '#312A25',
  border: '#2A2F35',
  shadow: '#000000',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 18, lg: 28 };
