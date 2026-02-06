import React from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';

import { ThemeColors, useThemeColors } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
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
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, icon, style: customStyle }: ButtonProps) {
  const { styles, buttonVariants, textVariants, colors } = useUIStyles();
  
  const variantStyle = buttonVariants[variant] || buttonVariants.primary;
  const variantTextStyle = textVariants[variant] || textVariants.primary;

  const style = [
    styles.button,
    variantStyle,
    disabled && styles.buttonDisabled,
    customStyle
  ];

  const iconColor = (variantTextStyle as any).color || colors.text;

  type IconProps = { color?: string; size?: number; weight?: string };
  const iconNode =
    icon && React.isValidElement<IconProps>(icon)
      ? React.cloneElement(icon, {
          color: icon.props.color ?? iconColor,
          size: icon.props.size ?? 20,
          weight: icon.props.weight ?? 'bold',
        })
      : icon;

  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [style, pressed && styles.buttonPressed]} 
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        {iconNode}
        <Text style={[styles.buttonText, variantTextStyle]} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
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

export function useUIStyles() {
  const colors = useThemeColors();
  const { styles, buttonVariants, textVariants } = React.useMemo(() => createStyles(colors), [colors]);
  return { styles, buttonVariants, textVariants, colors };
}

function createStyles(colors: ThemeColors) {
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16, // Standard spacing
      gap: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16, // More rounded
      padding: 16,
      gap: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }
      }),
      // Removed border for clearer look, relied on shadow
      borderWidth: Platform.OS === 'android' ? 0 : 0.5,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
      letterSpacing: 0.35,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginLeft: 4,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 17, // Standard iOS size
      backgroundColor: colors.surface,
      color: colors.text,
    },
    button: {
      minHeight: 50, // Easy to tap
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexShrink: 1,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
      flexShrink: 1,
    },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    tagText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });

  const buttonVariants: Record<NonNullable<ButtonProps['variant']>, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    secondary: {
      backgroundColor: colors.accent, // Lighter background for secondary
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: '#FFE5E5',
    },
  };

  const textVariants: Record<NonNullable<ButtonProps['variant']>, TextStyle> = {
    primary: { color: '#FFFFFF' },
    secondary: { color: colors.primary }, // Tinted text
    ghost: { color: colors.primary },
    danger: { color: colors.danger },
  };

  return { styles, buttonVariants, textVariants };
}

