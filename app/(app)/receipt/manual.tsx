import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Trash } from 'phosphor-react-native';

import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { formatMoney, parseAmount, createId } from '@/src/utils';

type ManualItem = { id: string; name: string; amountText: string };

export default function ManualReceiptScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<ManualItem[]>([]);
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');

  const addItem = () => {
    const amount = parseAmount(amountText);
    if (!name.trim()) {
      Alert.alert('Falta nombre', 'Agrega una descripcion corta del item.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Monto invalido', 'Ingresa un monto mayor a cero.');
      return;
    }
    setItems((prev) => [...prev, { id: createId(), name: name.trim(), amountText }]);
    setName('');
    setAmountText('');
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleContinue = () => {
    if (items.length === 0) {
      Alert.alert('Agrega al menos un item');
      return;
    }
    const parsed = items.map((item) => ({
      id: item.id,
      name: item.name,
      amount: parseAmount(item.amountText),
    }));
    const payload = encodeURIComponent(JSON.stringify(parsed));
    router.push({ pathname: '/(app)/receipt/review', params: { data: payload, groupId } });
  };

  return (
    <Screen>
      <SectionTitle>Ingresar factura manual</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={styles.meta}>Añade cada producto con su monto.</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Item</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Leche"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="sentences"
            />
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.label}>Monto</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Button label="Agregar item" onPress={addItem} />
      </Card>

      <Card>
        {items.length === 0 ? (
          <Text style={styles.meta}>Sin items aun.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const amount = parseAmount(item.amountText);
              return (
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.meta}>{formatMoney(amount, '$')}</Text>
                  </View>
                  <Button
                    label="Quitar"
                    variant="ghost"
                    icon={<Trash />}
                    onPress={() => removeItem(item.id)}
                  />
                </View>
              );
            }}
          />
        )}
      </Card>

      <Button label="Continuar" onPress={handleContinue} disabled={items.length === 0} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    meta: { color: colors.muted },
    row: { flexDirection: 'row', gap: 12 },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.card,
      fontSize: 15,
    },
    amountCol: { width: 110 },
    separator: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  });
