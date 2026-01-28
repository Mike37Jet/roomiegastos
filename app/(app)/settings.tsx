import { useMemo } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen } from '@/src/ui';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          actions
            .signOut()
            .then(() => {
              router.replace('/(auth)');
            })
            .catch(() => {
              router.replace('/(auth)');
            });
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{state.user?.name}</Text>
        <Text style={styles.meta}>{state.user?.email}</Text>
        <Text style={styles.meta}>Plan: {state.user?.premium ? 'Premium' : 'Gratis'}</Text>
      </Card>
      <Button label="Cerrar sesion" variant="ghost" onPress={handleSignOut} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    meta: {
      fontSize: 13,
      color: colors.muted,
    },
  });
