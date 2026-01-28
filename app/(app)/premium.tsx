import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { useStore } from '@/src/store';
import { FREE_LIMITS } from '@/src/limits';

export default function PremiumScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPremium = state.user?.premium ?? false;

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>SplitRoom Premium</Text>
        <Text style={styles.subtitle}>
          Desbloquea uso ilimitado y herramientas avanzadas para gastos compartidos.
        </Text>
        <View style={styles.priceBox}>
          <Text style={styles.price}>$2.99 / mes</Text>
          <Text style={styles.priceNote}>Precio promocional para estudiantes.</Text>
        </View>
        <Button
          label={isPremium ? 'Ya eres Premium' : 'Activar Premium (demo)'}
          onPress={() => {
            void actions.togglePremium(true);
            router.back();
          }}
          disabled={isPremium}
        />
      </Card>

      <SectionTitle>Que incluye</SectionTitle>
      <Card>
        <Text style={styles.bullet}>• Grupos ilimitados</Text>
        <Text style={styles.bullet}>• Gastos ilimitados por grupo</Text>
        <Text style={styles.bullet}>• Reportes de balance y pagos sugeridos</Text>
        <Text style={styles.bullet}>• Soporte prioritario para estudiantes foraneos</Text>
      </Card>

      {!isPremium && (
        <Card>
          <Text style={styles.meta}>Plan gratis actual</Text>
          <Text style={styles.bullet}>• {FREE_LIMITS.groups} grupos</Text>
          <Text style={styles.bullet}>• {FREE_LIMITS.expensesPerGroup} gastos por grupo</Text>
        </Card>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    priceBox: {
      backgroundColor: colors.accent,
      padding: 14,
      borderRadius: 12,
    },
    price: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    priceNote: {
      fontSize: 12,
      color: colors.muted,
    },
    bullet: {
      fontSize: 14,
      color: colors.text,
    },
    meta: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 6,
    },
  });
