import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Field, Screen } from '@/src/ui';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { useStore } from '@/src/store';
import { FREE_LIMITS } from '@/src/limits';

export default function NewGroupScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    console.log('createGroup: start', {
      name,
      currency,
      userId: state.user?.id,
      isPremium: state.user?.premium ?? false,
      groupCount: state.groups.length,
    });
    setErrorMessage(null);
    setIsSubmitting(true);
    const isPremium = state.user?.premium ?? false;
    if (!isPremium && state.groups.length >= FREE_LIMITS.groups) {
      Alert.alert(
        'Limite del plan gratis',
        'Actualiza a Premium para crear grupos ilimitados.'
      );
      router.push('/(app)/premium');
      setIsSubmitting(false);
      return;
    }

    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Asigna un nombre al grupo.');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('createGroup: sending');
      const group = await actions.createGroup({
        name: name.trim(),
        currency: currency.trim() || 'USD',
      });

      console.log('createGroup: success', { groupId: group.id });
      router.replace(`/(app)/group/${group.id}`);
    } catch (error) {
      console.error('createGroup: error', error);
      const message = error instanceof Error ? error.message : 'Intenta de nuevo.';
      Alert.alert('No se pudo crear', message);
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Crea un grupo para repartir gastos</Text>
        <Field
          label="Nombre del grupo"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Piso Centro"
        />
        <Field
          label="Moneda"
          value={currency}
          onChangeText={setCurrency}
          placeholder="USD"
        />
        <Button
          label={isSubmitting ? 'Creando...' : 'Crear grupo'}
          onPress={handleCreate}
          disabled={isSubmitting}
        />
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      </Card>
      <Text style={styles.tip}>Comparte el codigo del grupo para agregar miembros.</Text>
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
    tip: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    error: {
      color: colors.danger,
      fontSize: 12,
    },
  });
