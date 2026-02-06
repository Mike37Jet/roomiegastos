import { useColorScheme } from '@/components/useColorScheme';

export const themes = {
  light: {
    background: '#F2F2F7', // iOS System Grouped Background
    card: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    muted: '#C7C7CC',
    primary: '#007AFF', // iOS Blue
    secondary: '#5856D6', // iOS Indigo
    border: '#C6C6C8', // iOS Separator
    accent: '#F2F2F7',
    danger: '#FF3B30', // iOS Red
    success: '#34C759', // iOS Green
    warning: '#FF9500', // iOS Orange
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E', // iOS Dark Gray 6
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    muted: '#48484A',
    primary: '#0A84FF', // iOS Dark Mode Blue
    secondary: '#5E5CE6',
    border: '#38383A',
    accent: '#1C1C1E',
    danger: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
  },
};

export type ThemeColors = typeof themes.light;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return themes[scheme === 'dark' ? 'dark' : 'light'];
}
