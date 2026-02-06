// Force Refresh
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/src/components/Chip';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { formatMoney } from '@/src/utils';

import { ExpenseItemDetail } from '@/src/types';

type Item = { id: string; name: string; amount: number };
type UserTotal = {
  userId: string;
  name: string;
  subtotal: number;
  tax: number;
  total: number;
  items: ExpenseItemDetail[];
};

export default function ReceiptReviewScreen() {
  const { data, groupId } = useLocalSearchParams<{ data?: string; groupId?: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { state, actions } = useStore();
  const group = state.groups.find((g) => g.id === (Array.isArray(groupId) ? groupId[0] : groupId));
  const members = group?.members ?? (state.user ? [state.user] : []);

  const items: Item[] = useMemo(() => {
    if (!data) return [];
    try {
      return JSON.parse(decodeURIComponent(data)) as Item[];
    } catch (e) {
      console.warn('decode items failed', e);
      return [];
    }
  }, [data]);

  const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
    const allIds = members.map((m) => m.id);
    const defaultSet = new Set(allIds);
    const map: Record<string, Set<string>> = {};
    items.forEach((item) => {
      map[item.id] = new Set(defaultSet);
    });
    return map;
  });
  
  // State to track if an item has VAT (IVA)
  const [taxableItems, setTaxableItems] = useState<Set<string>>(() => {
    // Default: all items have tax
    return new Set(items.map((i) => i.id));
  });

  const [result, setResult] = useState<UserTotal[] | null>(null);
  const [payerId, setPayerId] = useState<string | undefined>(members[0]?.id);
  const [saving, setSaving] = useState(false);

  const toggleUser = (itemId: string, userId: string) => {
    setAssignments((prev) => {
      const copy = { ...prev };
      const set = new Set(copy[itemId]);
      if (set.has(userId)) {
        if (set.size > 1) {
          set.delete(userId);
        }
      } else {
        set.add(userId);
      }
      copy[itemId] = set;
      return copy;
    });
  };

  const toggleTax = (itemId: string) => {
    setTaxableItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const allSelected = (itemId: string) => assignments[itemId]?.size === members.length;
  const setAll = (itemId: string) => {
    setAssignments((prev) => ({ ...prev, [itemId]: new Set(members.map((m) => m.id)) }));
  };

  const handleConfirm = () => {
    if (!group) {
      Alert.alert('Grupo no encontrado', 'Regresa y abre la factura desde un grupo.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Sin items', 'Agrega items antes de continuar.');
      return;
    }

    const taxRate = 0.15;
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
    const totals: Record<string, UserTotal> = {};
    members.forEach((m) => {
      totals[m.id] = {
        userId: m.id,
        name: m.name,
        subtotal: 0,
        tax: 0,
        total: 0,
        items: [],
      };
    });

    items.forEach((item) => {
      const selected = assignments[item.id] && assignments[item.id]!.size > 0
        ? Array.from(assignments[item.id]!)
        : members.map((m) => m.id);
      
      const share = item.amount / selected.length;
      const isTaxable = taxableItems.has(item.id);
      const taxShare = isTaxable ? share * taxRate : 0;

      selected.forEach((uid) => {
        totals[uid].subtotal += share;
        totals[uid].tax += taxShare;
        totals[uid].items.push({
          name: item.name,
          price: share,
          tax: taxShare,
          total: share + taxShare,
          originalPrice: item.amount,
          withTax: isTaxable,
          sharedWith: selected.filter((x) => x !== uid).map((x) => memberMap[x] || 'Roomie'),
        });
      });
    });

    Object.values(totals).forEach((t) => {
      t.subtotal = round2(t.subtotal);
      t.tax = round2(t.tax);
      t.total = round2(t.subtotal + t.tax);
    });

    setResult(Object.values(totals));
    Alert.alert('Asignaciones listas', 'Calculamos los montos según la selección de IVA.');
  };

  const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

  const [concept, setConcept] = useState('');

  const handleSaveToGroup = async () => {
    if (saving) return;
    if (!group) {
      Alert.alert('Grupo no encontrado');
      return;
    }
    if (!result) {
      Alert.alert('Calcula primero', 'Presiona "Confirmar asignaciones" antes de guardar.');
      return;
    }
    if (!payerId) {
      Alert.alert('Selecciona quién pagó el ticket.');
      return;
    }
    if (!concept.trim()) {
      Alert.alert('Falta concepto', 'Ingresa un nombre para la factura (ej: Compra Super).');
      return;
    }

    const receiptBatchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      setSaving(true);
      for (const user of result) {
        if (user.total <= 0) continue;
        const expense = {
          title: `${concept.trim()} (${user.name})`,
          amount: user.total,
          paidById: payerId,
          participantIds: [user.userId],
          items: user.items,
          receiptId: receiptBatchId,
        };
        await actions.addExpense(group.id, expense);
      }
      Alert.alert('Guardado en balances', 'Se crearon cargos individuales en el grupo.');
      router.back();
    } catch (error) {
      console.error('save to group failed', error);
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {!group && (
            <Card>
              <Text style={styles.meta}>No encontramos el grupo. Regresa y abre la factura desde un grupo.</Text>
              <Button label="Volver" onPress={() => router.back()} />
            </Card>
          )}
          <SectionTitle>Revisa y asigna</SectionTitle>
          <Card style={{ gap: 10 }}>
            {items.length === 0 ? (
              <Text style={styles.meta}>No pudimos leer items. Regresa y escanea de nuevo.</Text>
            ) : (
              items.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>{formatMoney(item.amount, '$')}</Text>
                    </View>
                    <View style={styles.chipRow}>
                      <Chip
                        label="IVA"
                        active={taxableItems.has(item.id)}
                        onPress={() => toggleTax(item.id)}
                        colors={{ ...colors, primary: colors.warning }}
                      />
                      <View style={styles.verticalDivider} />
                      <Chip
                        label="Todos"
                        active={allSelected(item.id)}
                        onPress={() => setAll(item.id)}
                        colors={colors}
                      />
                      {members.map((member) => (
                        <Chip
                          key={member.id}
                          label={member.name.split(' ')[0]}
                          active={assignments[item.id]?.has(member.id)}
                          onPress={() => toggleUser(item.id, member.id)}
                          colors={colors}
                        />
                      ))}
                    </View>
                  </View>
                  {index < items.length - 1 && <View style={styles.separator} />}
                </View>
              ))
            )}
          </Card>
          <View style={{ marginTop: 10 }}>
            <Button
              label="Confirmar asignaciones"
              disabled={items.length === 0}
              onPress={handleConfirm}
            />
          </View>

          {result && (
            <Card style={{ gap: 10, marginTop: 20 }}>
              <SectionTitle>Guardar Factura</SectionTitle>
              
              <Text style={styles.inputLabel}>Concepto de la Factura</Text>
              <TextInput
                  style={styles.input}
                  placeholder="Ej: Compra Semanal Super"
                  placeholderTextColor={colors.muted}
                  value={concept}
                  onChangeText={setConcept}
              />

              <Text style={styles.meta}>Selecciona quien pago el ticket:</Text>
              <View style={styles.chipRow}>
                {members.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name.split(' ')[0]}
                    active={payerId === m.id}
                    onPress={() => setPayerId(m.id)}
                    colors={colors}
                  />
                ))}
              </View>
              {result.map((r) => (
                <View key={r.userId} style={{ gap: 4 }}>
                  <Text style={styles.itemName}>
                    {r.name}: {formatMoney(r.total, group?.currency || '$')}
                  </Text>
                  <Text style={styles.meta}>
                    Subtotal {formatMoney(r.subtotal, group?.currency || '$')} · IVA 15% {formatMoney(r.tax, group?.currency || '$')}
                  </Text>
                  {r.items.map((d, idx) => (
                    <Text style={styles.meta} key={idx}>
                      {d.name}: {formatMoney(d.total, group?.currency || '$')} ({d.sharedWith.length > 0 ? `con ${d.sharedWith.join(', ')}` : 'solo tú'})
                    </Text>
                  ))}
                </View>
              ))}
              <Button
                label={saving ? 'Guardando...' : 'Guardar en balances'}
                onPress={handleSaveToGroup}
                disabled={saving}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    input: {
      backgroundColor: colors.background,
      color: colors.text,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: -6,
    },
    meta: { color: colors.muted },
    itemRow: {
      flexDirection: 'column',
      gap: 8,
      paddingVertical: 4,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    itemName: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 16,
      flex: 1,
    },
    itemPrice: {
      color: colors.textSecondary,
      fontWeight: '500',
      fontSize: 16,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    verticalDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 4,
      height: 20, // Fixed height for divider
    },
  });
