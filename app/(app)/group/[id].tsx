import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, NotePencil, PaperPlaneTilt, PlusCircle } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { useStore } from '@/src/store';
import { calculateBalances, calculateSettlements } from '@/src/calc';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { formatMoney } from '@/src/utils';
import { Chip } from '@/src/components/Chip';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { state } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const group = state.groups.find((item) => item.id === groupId);
  const isAdmin = group?.adminId === state.user?.id;
  const currentUserId = state.user?.id;
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<'1d' | '7d' | '30d' | 'all'>('30d');
  const [receipts, setReceipts] = useState<Record<string, string>>({});

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    group?.members.forEach((member) => {
      map[member.id] = member.name;
    });
    return map;
  }, [group]);

  if (!group) {
    return (
      <Screen>
        <Text style={styles.emptyText}>Grupo no encontrado.</Text>
      </Screen>
    );
  }

  const balances = calculateBalances(group);
  const settlements = calculateSettlements(balances);
  const inviteMessage = `Unete a mi grupo "${group.name}" en Roomiegastos. Codigo: ${group.inviteCode}`;
  const now = Date.now();

  const settlementsYouOwe = currentUserId
    ? settlements.filter((s) => s.fromId === currentUserId)
    : [];
  const settlementsOwedToYou = currentUserId
    ? settlements.filter((s) => s.toId === currentUserId)
    : settlements;

  const handlePayAndAttach = async (settlementKey: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Habilita el acceso a fotos para subir el comprobante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setReceipts((prev) => ({ ...prev, [settlementKey]: uri }));
    Alert.alert('Comprobante adjuntado', 'Se guardó la imagen como evidencia de pago.');
  };

  const filteredExpenses = useMemo(() => {
    if (!group) return [];
    const cutoff =
      range === '1d'
        ? now - 1 * 86400000
        : range === '7d'
          ? now - 7 * 86400000
          : range === '30d'
            ? now - 30 * 86400000
            : 0;
    const q = query.trim().toLowerCase();

    return group.expenses
      .filter((exp) => (cutoff === 0 ? true : exp.createdAt >= cutoff))
      .filter((exp) => {
        if (!q) return true;
        const title = exp.title.toLowerCase();
        const payer = (memberMap[exp.paidById] || '').toLowerCase();
        const participants = exp.participantIds
          .map((id) => memberMap[id]?.toLowerCase() || '')
          .join(' ');
        return title.includes(q) || payer.includes(q) || participants.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [group, query, range, now, memberMap]);

  const handleShareInvite = async () => {
    try {
      const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('WhatsApp no disponible', 'Copia el codigo y compartelo manualmente.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se pudo compartir', 'Intenta de nuevo.');
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.meta}>
          {group.members.length} miembros · {group.expenses.length} gastos
        </Text>
        {isAdmin && (
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>Codigo de invitacion</Text>
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <Text style={styles.meta}>
              Comparte este codigo por WhatsApp para invitar a nuevos miembros.
            </Text>
            <Button
              label="Enviar por WhatsApp"
              variant="secondary"
              icon={<PaperPlaneTilt />}
              onPress={handleShareInvite}
            />
          </View>
        )}
        <Button
          label="Agregar gasto"
          icon={<PlusCircle />}
          onPress={() => router.push({ pathname: '/(app)/expense/new', params: { groupId: group.id } })}
        />
        <Button
          label="Factura manual"
          variant="secondary"
          icon={<NotePencil />}
          onPress={() => router.push({ pathname: '/(app)/receipt/manual', params: { groupId: group.id } })}
        />
      </Card>

      <SectionTitle>Balances</SectionTitle>
      <Card>
        {balances.map((balance) => (
          <View style={styles.row} key={balance.memberId}>
            <Text style={styles.rowLabel}>{memberMap[balance.memberId]}</Text>
            <Text style={[styles.amount, balance.net < 0 && styles.negative]}>
              {formatMoney(balance.net, group.currency)}
            </Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Sugerencias de pago</SectionTitle>
      <Card>
        {settlements.length === 0 ? (
          <Text style={styles.meta}>Todo esta balanceado.</Text>
        ) : (
          <>
            {settlementsYouOwe.length === 0 && settlementsOwedToYou.length === 0 && (
              <Text style={styles.meta}>Todo esta balanceado.</Text>
            )}
            {settlementsYouOwe.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={styles.rowLabel}>Tus pagos pendientes</Text>
                {settlementsYouOwe.map((settlement, index) => {
                  const key = `${settlement.fromId}-${settlement.toId}-${index}`;
                  const receipt = receipts[key];
                  return (
                    <View style={{ gap: 6 }} key={key}>
                      <Text style={styles.meta}>
                        Pagas a {memberMap[settlement.toId]} {formatMoney(settlement.amount, group.currency)}
                      </Text>
                      <Button
                        label={receipt ? 'Comprobante adjuntado' : 'Marcar pagado / subir comprobante'}
                        variant={receipt ? 'secondary' : 'ghost'}
                        onPress={() => void handlePayAndAttach(key)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
            {settlementsOwedToYou.length > 0 && (
              <View style={{ gap: 6, marginTop: 10 }}>
                <Text style={styles.rowLabel}>Te deben</Text>
                {settlementsOwedToYou.map((settlement, index) => (
                  <Text style={styles.meta} key={`${settlement.fromId}-${settlement.toId}-owed-${index}`}>
                    {memberMap[settlement.fromId]} te paga {formatMoney(settlement.amount, group.currency)}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Gastos recientes</SectionTitle>
      <Card style={styles.filterCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por titulo, pagador o participante"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <View style={styles.chipRow}>
          <Chip label="24 h" active={range === '1d'} onPress={() => setRange('1d')} colors={colors} />
          <Chip label="7 días" active={range === '7d'} onPress={() => setRange('7d')} colors={colors} />
          <Chip label="30 días" active={range === '30d'} onPress={() => setRange('30d')} colors={colors} />
          <Chip label="Todo" active={range === 'all'} onPress={() => setRange('all')} colors={colors} />
        </View>
      </Card>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        {filteredExpenses.length === 0 ? (
          <Text style={styles.meta}>No hay gastos que coincidan con el filtro.</Text>
        ) : (
          filteredExpenses.map((expense) => (
            <Card key={expense.id}>
              <Text style={styles.rowLabel}>{expense.title}</Text>
              <Text style={styles.meta}>
                Pagado por {memberMap[expense.paidById]} ·{' '}
                {formatMoney(expense.amount, group.currency)}
              </Text>
              <Text style={styles.meta}>
                Participan: {expense.participantIds.map((id) => memberMap[id]).join(', ')}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    meta: {
      color: colors.muted,
      fontSize: 13,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    inviteBox: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 4,
    },
    inviteLabel: {
      fontSize: 12,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    inviteCode: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 2,
    },
    rowLabel: {
      color: colors.text,
      fontWeight: '600',
    },
    filterCard: {
      gap: 10,
    },
    search: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.card,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
    },
    amount: {
      color: colors.primary,
      fontWeight: '600',
    },
    negative: {
      color: colors.danger,
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
    },
  });
