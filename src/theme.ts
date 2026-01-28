import { useColorScheme } from '@/components/useColorScheme';

export const themes = {
  light: {
    background: '#F2F6F6',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1B2326',
    muted: '#5C6A71',
    primary: '#3CA79D',
    secondary: '#6C8792',
    border: '#D6E0E2',
    accent: '#BDEBE4',
    danger: '#D64B4B',
  },
  dark: {
    background: '#0C1113',
    card: '#182126',
    surface: '#182126',
    text: '#E6ECEF',
    muted: '#9AA7AD',
    primary: '#4DB7AD',
    secondary: '#5E7F8B',
    border: '#263239',
    accent: '#7ED6CB',
    danger: '#E46363',
  },
};

export type ThemeColors = typeof themes.light;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return themes[scheme === 'dark' ? 'dark' : 'light'];
}
