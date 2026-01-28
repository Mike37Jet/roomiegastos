import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Screen, Button, Card, SectionTitle } from '@/src/ui';
import { useThemeColors } from '@/src/theme';

export default function ReceiptCaptureScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const colors = useThemeColors();

  const pickImage = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
    });
    if (result.canceled) return;
    // OCR no disponible en Expo Go: se redirige a carga manual.
    router.push({ pathname: '/(app)/receipt/manual', params: { groupId } });
  };

  return (
    <Screen>
      <SectionTitle>Escanear recibo</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={{ color: colors.muted }}>
          El escaneo con cámara/OCR no está disponible en Expo Go. Puedes elegir una foto del recibo y
          luego capturar los items manualmente.
        </Text>
        <View style={styles.placeholder} />
        <Button label="Elegir foto del recibo" onPress={pickImage} />
        <Button
          label="Pasar a factura manual"
          variant="secondary"
          onPress={() => router.push({ pathname: '/(app)/receipt/manual', params: { groupId } })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 220,
    borderRadius: 16,
    backgroundColor: '#111',
    opacity: 0.2,
  },
});
