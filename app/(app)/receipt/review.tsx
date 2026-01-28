import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, SectionTitle, Tag } from '@/src/ui';
import { Chip } from '@/src/components/Chip';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { formatMoney } from '@/src/utils';

type Item = { id: string; name: string; amount: number };
type UserTotal = {
  userId: string;
  name: string;
  subtotal: number;
  tax: number;
  total: number;
  detalle: { item: string; amount: number; sharedWith: string[] }[];
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
        detalle: [],
      };
    });

    items.forEach((item) => {
      const selected = assignments[item.id] && assignments[item.id]!.size > 0
        ? Array.from(assignments[item.id]!)
        : members.map((m) => m.id);
      const share = item.amount / selected.length;
      selected.forEach((uid) => {
        totals[uid].subtotal += share;
        totals[uid].detalle.push({
          item: item.name,
          amount: share,
          sharedWith: selected.filter((x) => x !== uid).map((x) => memberMap[x] || 'Roomie'),
        });
      });
    });

    Object.values(totals).forEach((t) => {
      t.subtotal = round2(t.subtotal);
      t.tax = round2(t.subtotal * taxRate);
      t.total = round2(t.subtotal + t.tax);
    });

    setResult(Object.values(totals));
    Alert.alert('Asignaciones listas', 'Calculamos los montos con IVA 15%.');
  };

  const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

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
    try {
      setSaving(true);
      for (const user of result) {
        if (user.total <= 0) continue;
        const expense = {
          title: `Factura - ${user.name}`,
          amount: user.total,
          paidById: payerId,
          participantIds: [user.userId],
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
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.meta}>{formatMoney(item.amount, '$')}</Text>
                </View>
                <View style={styles.chipsColumn}>
                  <View style={styles.chipRow}>
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
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </Card>
      <Button
        label="Confirmar asignaciones"
        disabled={items.length === 0}
        onPress={handleConfirm}
      />

      {result && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>Resumen</SectionTitle>
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
              {r.detalle.map((d, idx) => (
                <Text style={styles.meta} key={idx}>
                  {d.item}: {formatMoney(d.amount, group?.currency || '$')} ({d.sharedWith.length > 0 ? `con ${d.sharedWith.join(', ')}` : 'solo tú'})
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
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    meta: { color: colors.muted },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    itemName: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
    },
    tagsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    chipsColumn: {
      flex: 1,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
  });
