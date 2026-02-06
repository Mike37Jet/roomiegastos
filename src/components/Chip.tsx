import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { ThemeColors, useThemeColors } from '@/src/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  colors?: ThemeColors;
};

export function Chip({ label, active = false, onPress, style, colors: override }: Props) {
  const colors = override ?? useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive, style]}>
      <Text style={active ? styles.textActive : styles.textInactive}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '26', // ~15% opacity
    },
    chipInactive: {
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    textActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    textInactive: {
      color: colors.text,
      fontWeight: '600',
    },
  });
