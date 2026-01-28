import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, Field, Screen } from '@/src/ui';
import { useStore } from '@/src/store';
import { FREE_LIMITS } from '@/src/limits';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { parseAmount } from '@/src/utils';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const resolvedGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const group = state.groups.find((item) => item.id === resolvedGroupId);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const [paidById, setPaidById] = useState(group?.members[0]?.id || '');
  const [participantIds, setParticipantIds] = useState<string[]>(
    group?.members.map((member) => member.id) || []
  );
  const lastGroupIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!group) return;
    if (lastGroupIdRef.current === group.id) return;
    lastGroupIdRef.current = group.id;
    setPaidById(group.members[0]?.id || '');
    setParticipantIds(group.members.map((member) => member.id));
  }, [group]);

  const isPremium = state.user?.premium ?? false;

  const canAddExpense = useMemo(() => {
    if (!group) return false;
    if (isPremium) return true;
    return group.expenses.length < FREE_LIMITS.expensesPerGroup;
  }, [group, isPremium]);

  if (!group) {
    return (
      <Screen>
        <Text style={styles.emptyText}>Grupo no encontrado.</Text>
      </Screen>
    );
  }

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const handleSave = async () => {
    if (!canAddExpense) {
      Alert.alert('Limite del plan gratis', 'Pasa a Premium para gastos ilimitados.');
      router.push('/(app)/premium');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Falta el titulo', 'Describe el gasto.');
      return;
    }

    const value = parseAmount(amount);
    if (value <= 0) {
      Alert.alert('Monto invalido', 'Ingresa un valor mayor a 0.');
      return;
    }

    if (!paidById) {
      Alert.alert('Selecciona quien pago', 'Necesitas elegir al pagador.');
      return;
    }

    if (participantIds.length === 0) {
      Alert.alert('Sin participantes', 'Selecciona al menos un participante.');
      return;
    }

    try {
      await actions.addExpense(group.id, {
        title: title.trim(),
        amount: value,
        paidById,
        participantIds,
      });
      router.replace(`/(app)/group/${group.id}`);
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    }
  };

  return (
    <Screen>
      <Card>
        <Field
          label="Titulo"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Supermercado"
        />
        <Field
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />
      </Card>

      <Card>
        <Text style={styles.section}>Quien pago</Text>
        <View style={styles.chips}>
          {group.members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => setPaidById(member.id)}
              style={[styles.chip, paidById === member.id && styles.chipSelected]}
            >
              <Text style={styles.chipText}>{member.name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Participantes</Text>
        <View style={styles.chips}>
          {group.members.map((member) => {
            const active = participantIds.includes(member.id);
            return (
              <Pressable
                key={member.id}
                onPress={() => toggleParticipant(member.id)}
                style={[styles.chip, active && styles.chipSelected]}
              >
                <Text style={styles.chipText}>{member.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button label="Guardar gasto" onPress={handleSave} />
      {!canAddExpense && (
        <Text style={styles.limitText}>
          Plan gratis: hasta {FREE_LIMITS.expensesPerGroup} gastos por grupo.
        </Text>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
    },
    section: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.card,
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.secondary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    limitText: {
      color: colors.muted,
      fontSize: 12,
      textAlign: 'center',
    },
  });
