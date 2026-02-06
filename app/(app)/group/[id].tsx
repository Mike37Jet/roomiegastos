import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import { FilePdf, NotePencil, PaperPlaneTilt, PlusCircle, QrCode, SignOut, Trash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { calculateBalances, calculateSettlements } from '@/src/calc';
import { Chip } from '@/src/components/Chip';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { uploadImage } from '@/src/upload';
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

  const handleSettleDebt = (toId: string, amount: number, toName: string) => {
    if (!group || !currentUserId) return;
    
    Alert.alert(
      'Registrar Pago de Deuda',
      `¿Cómo realizaste el pago de ${formatMoney(amount, group.currency)} a ${toName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Efectivo / Sin recibo',
          onPress: async () => {
             try {
                await actions.addExpense(group.id, {
                    title: `Pago a ${toName}`,
                    amount: amount,
                    paidById: currentUserId,
                    participantIds: [toId],
                    type: 'payment',
                    items: [],
                });
                Alert.alert('Pago registrado', 'Se registró como pago en efectivo.');
             } catch (error) {
                Alert.alert('Error', 'No se pudo registrar el pago.');
             }
          }
        },
        {
          text: 'Adjuntar Comprobante',
          onPress: async () => {
             // Same logic as before for uploading
             try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5,
              });

              if (!result.canceled && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                try {
                    const url = await uploadImage(uri, `groups/${group.id}/payments/`);
                    await actions.addExpense(group.id, {
                        title: `Pago a ${toName}`,
                        amount: amount,
                        paidById: currentUserId,
                        participantIds: [toId],
                        type: 'payment',
                        receiptUrl: url,
                        items: [],
                    });
                    Alert.alert('Pago registrado', 'Comprobante subido correctamente.');
                } catch (uploadError) {
                    console.error(uploadError);
                    Alert.alert('Error', 'No se pudo subir la imagen.');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo iniciar la carga.');
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async () => {
    if (!group) return;

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: ${colors.primary}; margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: ${colors.primary}15; color: ${colors.primary}; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .amount { text-align: right; font-family: monospace; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Reporte de Cuentas: ${group.name}</h1>
          <p class="subtitle">Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
          
          <h2>Resumen de Saldos Pendientes</h2>
          ${settlements.length === 0 ? '<p>No hay deudas pendientes entre los miembros. ¡Están al día!</p>' : `
          <table>
            <thead>
              <tr>
                <th>Debe Pagar (Deudor)</th>
                <th>Debe Recibir (Acreedor)</th>
                <th class="amount">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${settlements.map(s => `
                <tr>
                  <td>${memberMap[s.fromId] || 'Desconocido'}</td>
                  <td>${memberMap[s.toId] || 'Desconocido'}</td>
                  <td class="amount">${formatMoney(s.amount, group.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `}
          
          <div style="margin-top: 30px;">
            <h3>Miembros del Grupo</h3>
            <ul>
              ${group.members.map(m => `<li>${m.name}</li>`).join('')}
            </ul>
          </div>

          <div class="footer">
            RoomieGastos App - Simplificando cuentas compartidas
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el reporte PDF.');
      console.error(error);
    }
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
                    const toName = memberMap[settlement.toId] || 'Usuario';
                    return (
                        <View style={[styles.settlementRow, styles.borderBottom]} key={index}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowLabel}>Debes pagar a {toName}</Text>
                                <Text style={styles.settlementAmount}>{formatMoney(settlement.amount, group.currency)}</Text>
                            </View>
                             <Button
                                label="Pagar"
                                variant="primary"
                                onPress={() => handleSettleDebt(settlement.toId, settlement.amount, toName)}
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
                filteredExpenses.map((expense, index) => {
                    const isPayment = expense.type === 'payment';
                    return (
                        <Pressable 
                            key={expense.id} 
                            style={[styles.expenseItem, index < filteredExpenses.length - 1 && styles.borderBottom]}
                            onPress={() => router.push({ pathname: '/(app)/expense/detail/[id]', params: { id: expense.id, groupId: group.id } })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.expenseTitle, isPayment && { color: colors.success }]}>
                                    {expense.title}
                                </Text>
                                <Text style={styles.expenseMeta}>
                                    {isPayment 
                                        ? `${memberMap[expense.paidById] || 'Alguien'} pagó a ${expense.participantIds.map(id => memberMap[id]).join(', ')}`
                                        : `${memberMap[expense.paidById] || 'Ex-miembro'} pagó por ${expense.participantIds.length}`
                                    }
                                </Text>
                            </View>
                            <Text style={[styles.expenseAmount, isPayment && { color: colors.success }]}>
                                {formatMoney(expense.amount, group.currency)}
                            </Text>
                        </Pressable>
                    );
                })
            )}
            </Card>
        </View>

        {/* Admin / Settings Area */}
        <View>
             <SectionTitle>Opciones del Grupo</SectionTitle>
             <Card style={{ paddingVertical: 0 }}>
                <Pressable
                  style={[styles.adminRow, styles.borderBottom]}
                  onPress={handleGenerateReport}
                >
                  <Text style={styles.rowLabel}>Descargar Reporte de Saldos (PDF)</Text>
                  <FilePdf size={20} color={colors.primary} />
                </Pressable>

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
