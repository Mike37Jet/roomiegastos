import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { ThemeColors, useThemeColors } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function Screen({ children }: { children: React.ReactNode }) {
  const { styles } = useUIStyles();
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { styles } = useUIStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { styles } = useUIStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInput['props']['keyboardType'];
  secureTextEntry?: boolean;
}) {
  const { styles, colors } = useUIStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  const { styles, buttonVariants, textVariants, colors } = useUIStyles();
  const style = [styles.button, buttonVariants[variant], disabled && styles.buttonDisabled];
  const textStyle = [styles.buttonText, textVariants[variant]] as TextStyle[];
  const iconColor =
    typeof (textVariants[variant] as TextStyle).color === 'string'
      ? (textVariants[variant] as TextStyle).color as string
      : typeof colors.text === 'string'
        ? (colors.text as string)
        : '#FFFFFF';

  type IconProps = { color?: string; size?: number };
  const iconNode =
    icon && React.isValidElement<IconProps>(icon)
      ? React.cloneElement(icon, {
          color: icon.props.color ?? iconColor,
          size: icon.props.size ?? 20,
        })
      : icon;

  return (
    <Pressable onPress={onPress} style={style} disabled={disabled}>
      <View style={styles.buttonContent}>
        {iconNode}
        <Text style={textStyle}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function Tag({ text }: { text: string }) {
  const { styles } = useUIStyles();
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
      gap: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: colors.card,
      color: colors.text,
    },
    button: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
  });

  const buttonVariants: Record<NonNullable<ButtonProps['variant']>, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.secondary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
  };

  const textVariants: Record<NonNullable<ButtonProps['variant']>, TextStyle> = {
    primary: { color: '#FFFFFF' },
    secondary: { color: colors.text },
    ghost: { color: colors.text },
  };

  return { styles, buttonVariants, textVariants };
}

function useUIStyles() {
  const colors = useThemeColors();
  return React.useMemo(() => ({ ...createStyles(colors), colors }), [colors]);
}
