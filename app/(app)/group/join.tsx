import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Field, Screen } from '@/src/ui';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { useStore } from '@/src/store';

export default function JoinGroupScreen() {
  const router = useRouter();
  const { actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState('');

  const handleRequest = async () => {
    if (!code.trim()) {
      Alert.alert('Codigo requerido', 'Ingresa el codigo del grupo.');
      return;
    }
    const result = await actions.requestJoinByCode(code);
    if (!result.ok) {
      Alert.alert('No se pudo enviar', result.message ?? 'Intenta de nuevo.');
      return;
    }
    Alert.alert('Solicitud enviada', 'El admin recibira tu solicitud.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Unirse con codigo</Text>
        <Field
          label="Codigo de invitacion"
          value={code}
          onChangeText={setCode}
          placeholder="Ej. K8X2LQ"
        />
        <Button label="Enviar solicitud" onPress={handleRequest} />
      </Card>
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
  });
