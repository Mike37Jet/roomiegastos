import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { NotePencil, PaperPlaneTilt, PlusCircle, QrCode, SignOut, Trash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { calculateBalances, calculateSettlements } from '@/src/calc';
import { Chip } from '@/src/components/Chip';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { formatMoney } from '@/src/utils';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<'1d' | '7d' | '30d' | 'all'>('30d');
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  
  const group = state.groups.find((item) => item.id === groupId);
  const isAdmin = group?.adminId === state.user?.id;
  const currentUserId = state.user?.id;

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    group?.members.forEach((member) => {
      map[member.id] = member.name;
    });
    return map;
  }, [group]);

  const balances = useMemo(() => group ? calculateBalances(group) : [], [group]);
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);
  const inviteMessage = group ? `Unete a mi grupo "${group.name}" en Roomiegastos. Codigo: ${group.inviteCode}` : '';
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
    if (!group) return;
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

  const handleLeaveGroup = () => {
    if (!group) return;
    Alert.alert(
      'Salir del grupo',
      `¿Estas seguro que quieres salir de "${group.name}"? No podras ver los gastos ni balances.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.leaveGroup(groupId);
              router.back();
              Alert.alert('Exito', 'Has salido del grupo');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo salir del grupo');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remover miembro',
      `¿Seguro que quieres remover a ${memberName} del grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.removeMember(groupId, memberId);
              Alert.alert('Exito', `${memberName} fue removido del grupo`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo remover al miembro');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!group) return;
    const groupName = group.name;
    Alert.alert(
      'Eliminar grupo',
      `¿Estas completamente seguro que quieres eliminar "${groupName}"? Esta acción no se puede deshacer y se perderán todos los gastos y datos del grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.deleteGroup(groupId);
              router.replace('/(app)');
              Alert.alert('Grupo eliminado', `El grupo "${groupName}" ha sido eliminado`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el grupo');
            }
          },
        },
      ]
    );
  };

  if (!group) {
    return (
      <Screen>
        <Text style={styles.emptyText}>Grupo no encontrado.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>{group.name}</Text>
                <Text style={styles.subTitle}>
                    {group.members.length} miembros · {group.expenses.length} gastos
                </Text>
            </View>
            {isAdmin && (
                <Pressable onPress={handleShareInvite} style={styles.qrButton}>
                    <QrCode size={20} color={colors.primary} />
                </Pressable>
            )}
        </View>

        {/* Global Actions */}
        <View style={styles.actionGrid}>
             <Button
                label="Nuevo Gasto"
                icon={<PlusCircle size={20} />}
                onPress={() => router.push({ pathname: '/(app)/expense/new', params: { groupId: group.id } })}
                style={{ flex: 1 }}
            />
            <Button
                label="Factura Manual"
                variant="secondary"
                icon={<NotePencil size={20} />}
                onPress={() => router.push({ pathname: '/(app)/receipt/manual', params: { groupId: group.id } })}
                style={{ flex: 1 }}
            />
        </View>

        {/* Invite Code - Compact */}
        {isAdmin && (
            <Card style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                    <Text style={styles.sectionLabel}>CÓDIGO DE INVITACIÓN</Text>
                </View>
                <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{group.inviteCode}</Text>
                    <Button 
                        label="Compartir" 
                        variant="ghost" 
                        icon={<PaperPlaneTilt size={16} />}
                        onPress={handleShareInvite}
                    />
                </View>
            </Card>
        )}

        <View>
            <SectionTitle>Balances</SectionTitle>
            <Card style={{ paddingVertical: 8 }}>
            {balances.map((balance, index) => (
                <View style={[styles.balanceRow, index < balances.length - 1 && styles.borderBottom]} key={balance.memberId}>
                    <Text style={styles.rowLabel}>{memberMap[balance.memberId]}</Text>
                    <Text style={[styles.amount, balance.net < 0 ? styles.negative : styles.positive]}>
                        {formatMoney(balance.net, group.currency)}
                    </Text>
                </View>
            ))}
            </Card>
        </View>

        {(settlementsYouOwe.length > 0 || settlementsOwedToYou.length > 0) && (
            <View>
                <SectionTitle>Sugerencias de pago</SectionTitle>
                <Card style={{ paddingVertical: 8 }}>
                {settlementsYouOwe.map((settlement, index) => {
                    const key = `${settlement.fromId}-${settlement.toId}-${index}`;
                    const receipt = receipts[key];
                    return (
                        <View style={[styles.settlementRow, styles.borderBottom]} key={key}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowLabel}>Debes pagar a {memberMap[settlement.toId]}</Text>
                                <Text style={styles.settlementAmount}>{formatMoney(settlement.amount, group.currency)}</Text>
                            </View>
                             <Button
                                label={receipt ? 'Adjuntado' : 'Pagar'}
                                variant={receipt ? 'ghost' : 'primary'}
                                onPress={() => void handlePayAndAttach(key)}
                                style={{ minWidth: 80, height: 36 }}
                            />
                        </View>
                    );
                })}
                {settlementsOwedToYou.map((settlement, index) => (
                     <View style={[styles.settlementRow, index < settlementsOwedToYou.length - 1 && styles.borderBottom]} key={index}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{memberMap[settlement.fromId]} te debe</Text>
                        </View>
                        <Text style={[styles.settlementAmount, { color: colors.primary }]}>{formatMoney(settlement.amount, group.currency)}</Text>
                    </View>
                ))}
                </Card>
            </View>
        )}

        {/* Expenses List */}
        <View>
            <SectionTitle>Gastos</SectionTitle>
            
            <View style={styles.filterContainer}>
                 <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Buscar..."
                    placeholderTextColor={colors.muted}
                    style={styles.searchCompact}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                    <Chip label="24h" active={range === '1d'} onPress={() => setRange('1d')} colors={colors} />
                    <Chip label="7d" active={range === '7d'} onPress={() => setRange('7d')} colors={colors} />
                    <Chip label="30d" active={range === '30d'} onPress={() => setRange('30d')} colors={colors} />
                    <Chip label="Todo" active={range === 'all'} onPress={() => setRange('all')} colors={colors} />
                </ScrollView>
            </View>

            <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
            {filteredExpenses.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={styles.meta}>No hay gastos recientes.</Text>
                </View>
            ) : (
                filteredExpenses.map((expense, index) => (
                    <View key={expense.id} style={[styles.expenseItem, index < filteredExpenses.length - 1 && styles.borderBottom]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.expenseTitle}>{expense.title}</Text>
                            <Text style={styles.expenseMeta}>
                                {memberMap[expense.paidById]} pagó por {expense.participantIds.length}
                            </Text>
                        </View>
                        <Text style={styles.expenseAmount}>
                            {formatMoney(expense.amount, group.currency)}
                        </Text>
                    </View>
                ))
            )}
            </Card>
        </View>

        {/* Admin / Settings Area */}
        <View>
             <SectionTitle>Administración</SectionTitle>
             <Card style={{ paddingVertical: 0 }}>
                {isAdmin ? (
                    <>
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface }}>
                            <Text style={styles.sectionLabel}>MIEMBROS</Text>
                        </View>
                        {group.members.map((member, idx) => (
                             <View style={[styles.adminRow, idx < group.members.length - 1 && styles.borderBottom]} key={member.id}>
                                <Text style={styles.rowLabel}>{member.name} {member.id === group.adminId && '(Tú)'}</Text>
                                {member.id !== group.adminId && (
                                    <Pressable onPress={() => handleRemoveMember(member.id, member.name)}>
                                        <Text style={{ color: colors.danger, fontWeight: '600' }}>Remover</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                         <Pressable 
                            style={[styles.adminRow, styles.borderBottom]}
                            onPress={handleDeleteGroup}
                        >
                             <Text style={{ color: colors.danger, fontWeight: '600' }}>Eliminar Grupo</Text>
                             <Trash size={18} color={colors.danger} />
                        </Pressable>
                    </>
                ) : (
                    <Pressable 
                        style={styles.adminRow}
                        onPress={handleLeaveGroup}
                    >
                         <Text style={{ color: colors.danger, fontWeight: '600' }}>Salir del grupo</Text>
                         <SignOut size={18} color={colors.danger} />
                    </Pressable>
                )}
             </Card>
        </View>

      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subTitle: {
      color: colors.muted,
      fontSize: 15,
      marginTop: 2,
    },
    qrButton: {
        padding: 10,
        backgroundColor: colors.card,
        borderRadius: 20,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    inviteCard: {
        padding: 16,
    },
    inviteHeader: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeText: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
        fontVariant: ['tabular-nums'],
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    borderBottom: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    rowLabel: {
        fontSize: 16,
        color: colors.text,
    },
    amount: {
        fontSize: 16,
        fontWeight: '600',
    },
    positive: {
        color: colors.primary,
    },
    negative: {
        color: colors.danger,
    },
    settlementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        gap: 12,
    },
    settlementAmount: {
        fontWeight: '700',
        fontSize: 15,
        color: colors.text,
    },
    filterContainer: {
        marginBottom: 12,
        gap: 12,
    },
    searchCompact: {
        backgroundColor: colors.card,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: colors.text,
    },
    expenseItem: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    expenseTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 2,
    },
    expenseMeta: {
        fontSize: 13,
        color: colors.muted,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    adminRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    meta: {
      color: colors.muted,
      fontSize: 13,
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 20,
    },
  });
