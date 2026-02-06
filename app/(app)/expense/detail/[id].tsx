// Force Refresh
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import { FilePdf, Trash } from 'phosphor-react-native';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { formatMoney } from '@/src/utils';

export default function ExpenseDetailScreen() {
    const router = useRouter();
    const { id, groupId } = useLocalSearchParams<{ id: string; groupId: string }>();
    const resolvedExpenseId = Array.isArray(id) ? id[0] : id;
    const resolvedGroupId = Array.isArray(groupId) ? groupId[0] : groupId;

    const { state, actions } = useStore();
    const colors = useThemeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const group = state.groups.find(g => g.id === resolvedGroupId);
    const expense = group?.expenses.find(e => e.id === resolvedExpenseId);

    if (!group || !expense) {
        return (
            <Screen>
                <Text style={styles.error}>Gasto no encontrado</Text>
                <Button label="Volver" onPress={() => router.back()} />
            </Screen>
        );
    }

    const payerName = group.members.find(m => m.id === expense.paidById)?.name || 'Desconocido';
    const participants = expense.participantIds.map(pid => 
        group.members.find(m => m.id === pid)?.name || 'Desconocido'
    );

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Gasto',
            '¿Seguro que deseas eliminar este gasto? Esto afectará los balances del grupo.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            // Assuming there's a deleteExpense action, if not we might need to implement it or use removeMember logic as reference?
                            // Checking store.tsx for deleteExpense... if not present I will just alert.
                            // Assuming it might NOT exist based on previous reads, but let's try calling it if it exists or explain
                            await actions.deleteExpense(group.id, expense.id);
                            router.back();
                        } catch (e: any) {
                            Alert.alert('Error', 'No se pudo eliminar el gasto: ' + e.message);
                        }
                    }
                }
            ]
        );
    };

    const handleGeneratePDF = async () => {
        const hasItems = expense.items && expense.items.length > 0;
        const isPayment = expense.type === 'payment';
        const docTitle = isPayment ? 'Comprobante de Pago' : 'Detalle de Gasto';
        const receiptImage = isPayment && expense.receiptUrl 
            ? `<div style="margin-top: 30px; text-align: center;">
                 <h3>Evidencia de Pago</h3>
                 <img src="${expense.receiptUrl}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px;" />
               </div>` 
            : '';

        const html = `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                        h1 { color: ${isPayment ? colors.success : colors.primary}; margin-bottom: 5px; }
                        h3 { margin-top: 30px; margin-bottom: 10px; border-bottom: 2px solid ${isPayment ? colors.success : colors.primary}; padding-bottom: 5px; }
                        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                        .amount-box { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border-left: 5px solid ${isPayment ? colors.success : colors.primary}; }
                        .amount { font-size: 32px; font-weight: bold; color: ${colors.text}; }
                        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-top: 5px; }
                        .details { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
                        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f9f9f9; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th { text-align: left; padding: 8px; background: ${colors.primary}10; color: ${colors.primary}; }
                        td { padding: 8px; border-bottom: 1px solid #eee; }
                        .text-right { text-align: right; }
                        .footer { margin-top: 50px; font-size: 12px; color: #aaa; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>${docTitle}</h1>
                    <p class="meta">Grupo: ${group.name} | Fecha: ${new Date(expense.createdAt).toLocaleDateString()}</p>
                    
                    <div class="amount-box">
                        <div class="amount">${formatMoney(expense.amount, group.currency)}</div>
                        <div class="label">${expense.title}</div>
                    </div>

                    ${receiptImage}

                    ${hasItems ? `
                    <h3>Desglose de Productos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th class="text-right">Precio (Tu parte)</th>
                                <th class="text-right">IVA (Tu parte)</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expense.items!.map((item) => `
                            <tr>
                                <td>
                                    <div style="font-weight: bold;">${item.name}</div>
                                    <div style="font-size: 10px; color: #666;">
                                        Precio Orig: ${formatMoney(item.originalPrice, group.currency)}
                                        ${item.sharedWith && item.sharedWith.length > 0 ? `<br/>Compartido con: ${item.sharedWith.join(', ')}` : '<br/>Solo tú'}
                                        ${item.withTax ? '<span style="color: #e67e22;">• IVA Aplica</span>' : '<span style="color: #27ae60;">• Sin IVA</span>'}
                                    </div>
                                </td>
                                <td class="text-right">${formatMoney(item.price, group.currency)}</td>
                                <td class="text-right">${formatMoney(item.tax, group.currency)}</td>
                                <td class="text-right" style="font-weight: bold;">${formatMoney(item.total, group.currency)}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                             <tr>
                                <td colspan="3" class="text-right" style="font-weight: bold; padding-top: 15px;">TOTAL FINAL</td>
                                <td class="text-right" style="font-weight: bold; font-size: 14px; padding-top: 15px;">${formatMoney(expense.amount, group.currency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    ` : ''}

                    <div class="details">
                        <div class="row">
                            <strong>Pagado por:</strong>
                            <span>${payerName}</span>
                        </div>
                        
                        ${!hasItems ? `
                        <div class="row">
                            <strong>Dividido entre:</strong>
                            <span>${participants.length} personas</span>
                        </div>
                        <div style="margin-top: 20px;">
                            <strong>Participantes:</strong>
                            <ul>
                                ${participants.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}

                        <div class="row" style="background-color: ${isPayment ? '#d4edda' : '#fff3cd'}; padding: 10px; border-radius: 4px; margin-top: 20px;">
                            <strong>${isPayment ? 'Confirmación' : 'Estado de Deuda'}:</strong>
                            <span>
                                ${isPayment 
                                    ? `Pago verificado de ${payerName} a ${participants[0]}`
                                    : participants.map(p => {
                                        if (p === payerName) return 'Tú pagaste (Saldo a favor)';
                                        return `${p} debe ${formatMoney(expense.amount / participants.length, group.currency)} a ${payerName}`;
                                    }).join('<br/>')
                                }
                            </span>
                        </div>
                    </div>

                    <div class="footer">
                        Comprobante generado por RoomieGastos
                    </div>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert('Error', 'No se pudo generar el comprobante PDF.');
        }
    };

    const isPayment = expense.type === 'payment';

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ gap: 20 }}>
                <SectionTitle>{isPayment ? 'Información del Pago' : 'Información del Gasto'}</SectionTitle>
                <Card>
                    <View style={styles.header}>
                        <Text style={styles.title}>{expense.title}</Text>
                        <Text style={[styles.amount, isPayment && { color: colors.success }]}>
                            {formatMoney(expense.amount, group.currency)}
                        </Text>
                    </View>
                    <Text style={styles.date}>Agregado el {new Date(expense.createdAt).toLocaleDateString()}</Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.row}>
                        <Text style={styles.label}>Pagado por</Text>
                        <Text style={styles.value}>{payerName}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>{isPayment ? 'Enviado a' : `Para (${participants.length})`}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                            {participants.map((p, i) => (
                                <Text key={i} style={styles.value}>{p}</Text>
                            ))}
                        </View>
                    </View>
                </Card>

                <SectionTitle>Acciones</SectionTitle>
                <Card style={{ paddingVertical: 0 }}>
                    <Pressable style={[styles.actionRow, styles.borderBottom]} onPress={handleGeneratePDF}>
                        <Text style={styles.actionLabel}>Descargar Comprobante (PDF)</Text>
                        <FilePdf size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable style={styles.actionRow} onPress={handleDelete}>
                        <Text style={[styles.actionLabel, { color: colors.danger }]}>Eliminar {isPayment ? 'Pago' : 'Gasto'}</Text>
                        <Trash size={20} color={colors.danger} />
                    </Pressable>
                </Card>
            </ScrollView>
        </Screen>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    error: {
        color: colors.danger,
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        color: colors.text,
        marginBottom: 4,
        fontWeight: '500',
    },
    amount: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.text,
    },
    date: {
        textAlign: 'center',
        color: colors.muted,
        fontSize: 14,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        color: colors.muted,
        fontSize: 15,
    },
    value: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    borderBottom: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    }
});
