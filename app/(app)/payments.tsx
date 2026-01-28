import React, { useMemo } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StackedBarChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';

import { calculateBalances, calculateSettlements } from '@/src/calc';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { formatMoney } from '@/src/utils';
import { Card, Screen, SectionTitle } from '@/src/ui';

type PaymentItem = {
  id: string;
  direction: 'pay' | 'receive';
  amount: number;
  currency: string;
  counterparty: string;
  groupName: string;
  groupId: string;
};

function sumByCurrency(list: PaymentItem[]) {
  return list.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] || 0) + item.amount;
    return acc;
  }, {});
}

const { width: screenWidth } = Dimensions.get('window');

function hexToRgba(hex: string, opacity = 1) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function PaymentsScreen() {
  const { state } = useStore();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { toPay, toReceive } = useMemo(() => {
    if (!state.user) return { toPay: [], toReceive: [] };

    const pay: PaymentItem[] = [];
    const receive: PaymentItem[] = [];

    state.groups.forEach((group) => {
      if (!group.members.some((member) => member.id === state.user!.id)) return;

      const balances = calculateBalances(group);
      const settlements = calculateSettlements(balances);
      const nameMap = group.members.reduce<Record<string, string>>((acc, member) => {
        acc[member.id] = member.name;
        return acc;
      }, {});

      settlements.forEach((settlement, index) => {
        const base: Omit<PaymentItem, 'direction' | 'counterparty'> = {
          id: `${group.id}-${index}-${settlement.fromId}-${settlement.toId}`,
          amount: settlement.amount,
          currency: group.currency,
          groupName: group.name,
          groupId: group.id,
        };

        if (settlement.fromId === state.user!.id) {
          pay.push({
            ...base,
            direction: 'pay',
            counterparty: nameMap[settlement.toId] || 'Roomie',
          });
        } else if (settlement.toId === state.user!.id) {
          receive.push({
            ...base,
            direction: 'receive',
            counterparty: nameMap[settlement.fromId] || 'Roomie',
          });
        }
      });
    });

    pay.sort((a, b) => b.amount - a.amount);
    receive.sort((a, b) => b.amount - a.amount);

    return { toPay: pay, toReceive: receive };
  }, [state.groups, state.user]);

  const payByCurrency = useMemo(() => sumByCurrency(toPay), [toPay]);
  const receiveByCurrency = useMemo(() => sumByCurrency(toReceive), [toReceive]);
  const netByCurrency = useMemo(() => {
    const map: Record<string, number> = { ...receiveByCurrency };
    Object.entries(payByCurrency).forEach(([currency, amount]) => {
      map[currency] = (map[currency] || 0) - amount;
    });
    Object.entries(map).forEach(([currency, amount]) => {
      if (Math.abs(amount) < 0.01) {
        delete map[currency];
      }
    });
    return map;
  }, [payByCurrency, receiveByCurrency]);

  const renderChips = (
    totals: Record<string, number>,
    variant: 'pay' | 'receive' | 'net',
  ) => {
    const entries = Object.entries(totals);
    if (entries.length === 0) {
      return <Text style={styles.meta}>Sin montos pendientes.</Text>;
    }

    return (
      <View style={styles.chipRow}>
        {entries.map(([currency, amount]) => {
          const isNegative = amount < 0;
          const chipStyle = [
            styles.chip,
            variant === 'pay' && styles.chipPay,
            variant === 'receive' && styles.chipReceive,
            variant === 'net' && (isNegative ? styles.chipPay : styles.chipReceive),
          ];
          const chipTextStyle = [
            styles.chipText,
            variant === 'pay' && styles.chipTextDanger,
            variant === 'receive' && styles.chipTextPrimary,
            variant === 'net' && (isNegative ? styles.chipTextDanger : styles.chipTextPrimary),
          ];

          const label =
            variant === 'net' && isNegative
              ? `-${formatMoney(Math.abs(amount), currency)}`
              : formatMoney(amount, currency);

          return (
            <View style={chipStyle} key={`${variant}-${currency}`}>
              <Text style={chipTextStyle}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const currencyKeys = useMemo(
    () => Array.from(new Set([...Object.keys(payByCurrency), ...Object.keys(receiveByCurrency)])),
    [payByCurrency, receiveByCurrency],
  );

  const chartData = useMemo(
    () => ({
      labels: currencyKeys,
      legend: ['Debes pagar', 'Te deben'],
      data: currencyKeys.map((currency) => [
        Math.max(payByCurrency[currency] || 0, 0),
        Math.max(receiveByCurrency[currency] || 0, 0),
      ]),
    }),
    [currencyKeys, payByCurrency, receiveByCurrency],
  );

  const chartHeight = Math.max(220, currencyKeys.length * 60 + 80);
  const chartWidth = screenWidth - 40; // 20 padding per side from Screen

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <Card style={styles.summaryCard}>
          <Text style={styles.title}>Pagos pendientes</Text>
          <Text style={styles.meta}>Lo que debes y lo que te deben, agrupado por moneda.</Text>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Debes pagar</Text>
            {renderChips(payByCurrency, 'pay')}
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Te deben</Text>
            {renderChips(receiveByCurrency, 'receive')}
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Saldo neto</Text>
            {renderChips(netByCurrency, 'net')}
          </View>
        </Card>

        <SectionTitle>Resumen visual</SectionTitle>
        <Card style={{ gap: 12 }}>
          {currencyKeys.length === 0 ? (
            <Text style={styles.meta}>Sin datos todavia.</Text>
          ) : (
            <StackedBarChart
              style={{ borderRadius: 12 }}
              data={{
                ...chartData,
                barColors: [styles.barFillPay.backgroundColor, styles.barFillReceive.backgroundColor],
              }}
              width={chartWidth}
              height={chartHeight}
              withHorizontalLabels
              hideLegend
              chartConfig={{
                backgroundGradientFrom: styles.chartBg.backgroundColor as string,
                backgroundGradientTo: styles.chartBg.backgroundColor as string,
                color: (opacity = 1) => hexToRgba(colors.text as string, opacity),
                labelColor: (opacity = 1) => hexToRgba(colors.muted as string, opacity),
                barPercentage: 0.6,
                decimalPlaces: 0,
              }}
            />
          )}
        </Card>

        <SectionTitle>Pagos que debes realizar</SectionTitle>
        <Card>
          {toPay.length === 0 ? (
            <Text style={styles.meta}>Estas al dia, no tienes pagos pendientes.</Text>
          ) : (
            <FlatList
              data={toPay}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <PaymentRow
                  item={item}
                  styles={styles}
                  onPress={() => router.push({ pathname: '/(app)/group/[id]', params: { id: item.groupId } })}
                />
              )}
            />
          )}
        </Card>

        <SectionTitle>Pagos que debes recibir</SectionTitle>
        <Card>
          {toReceive.length === 0 ? (
            <Text style={styles.meta}>Nadie te debe por ahora.</Text>
          ) : (
            <FlatList
              data={toReceive}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <PaymentRow
                  item={item}
                  styles={styles}
                  onPress={() => router.push({ pathname: '/(app)/group/[id]', params: { id: item.groupId } })}
                />
              )}
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

type Styles = ReturnType<typeof createStyles>;

function PaymentRow({
  item,
  onPress,
  styles,
}: {
  item: PaymentItem;
  onPress: () => void;
  styles: Styles;
}) {
  const initials = item.counterparty.slice(0, 1).toUpperCase() || '?';
  const isPay = item.direction === 'pay';

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.avatar, isPay ? styles.avatarPay : styles.avatarReceive]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>
            {isPay ? `Pagar a ${item.counterparty}` : `Recibir de ${item.counterparty}`}
          </Text>
          <Text style={styles.rowMeta}>{item.groupName}</Text>
        </View>
      </View>
      <View style={styles.amountColumn}>
        <Text style={isPay ? styles.amountPay : styles.amountReceive}>
          {formatMoney(item.amount, item.currency)}
        </Text>
        <Text style={styles.link}>Ver grupo</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrollContent: {
      gap: 16,
      paddingBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    meta: {
      color: colors.muted,
      fontSize: 13,
    },
    summaryCard: {
      gap: 10,
    },
    summaryBlock: {
      gap: 8,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 0.2,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipPay: {
      borderColor: colors.danger,
      backgroundColor: 'rgba(214,75,75,0.08)',
    },
    chipReceive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(60,167,157,0.12)',
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    chipTextDanger: {
      color: colors.danger,
    },
    chipTextPrimary: {
      color: colors.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      gap: 12,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarPay: {
      backgroundColor: 'rgba(214,75,75,0.08)',
      borderColor: colors.danger,
    },
    avatarReceive: {
      backgroundColor: 'rgba(60,167,157,0.12)',
      borderColor: colors.primary,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    amountColumn: {
      alignItems: 'flex-end',
      gap: 4,
    },
    amountPay: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.danger,
    },
    amountReceive: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    link: {
      fontSize: 12,
      color: colors.muted,
      textDecorationLine: 'underline',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 6,
    },
    barFillPay: {
      height: '100%',
      backgroundColor: colors.danger,
      borderRadius: 999,
    },
    barFillReceive: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    barLabel: {
      width: 90,
      textAlign: 'right',
      fontSize: 12,
      color: colors.text,
      fontWeight: '600',
    },
    legendText: {
      fontSize: 12,
      color: colors.muted,
    },
    chartBg: {
      backgroundColor: colors.card,
    },
  });
