import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { Text } from '@/components/Themed';
import { calculateBalances } from '@/src/calc';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Card, Screen, SectionTitle } from '@/src/ui';

const screenWidth = Dimensions.get('window').width;

export default function TabTwoScreen() {
  const { state } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = state.user?.id;

  // 1. Calculate Global Net Balance
  const globalBalance = useMemo(() => {
    if (!userId) return 0;
    let total = 0;
    state.groups.forEach(group => {
      const balances = calculateBalances(group);
      const myBalance = balances.find(b => b.memberId === userId);
      if (myBalance) {
        total += myBalance.net;
      }
    });
    return total;
  }, [state.groups, userId]);

  // 2. Prepare Data for Monthly Spending (Last 6 Months)
  const chartData = useMemo(() => {
    const months = [];
    const values = [];
    const now = new Date();
    
    // Initialize last 6 months map
    const monthMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`; // format "M/YYYY"
      monthMap.set(key, 0);
    }

    // Sum expenses where I am a participant
    if (userId) {
      state.groups.forEach(group => {
        group.expenses.forEach(exp => {
          if (exp.participantIds.includes(userId)) {
            const date = new Date(exp.createdAt);
            const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
            if (monthMap.has(key)) {
              // My share
              const share = exp.amount / exp.participantIds.length;
              monthMap.set(key, (monthMap.get(key) || 0) + share);
            }
          }
        });
      });
    }

    // Convert map to arrays
    Array.from(monthMap.entries()).forEach(([label, value]) => {
      // Short label: 3/2026 -> Mar
      const [m] = label.split('/');
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      months.push(monthNames[parseInt(m) - 1]);
      values.push(value);
    });

    return {
      labels: months,
      datasets: [{ data: values }],
    };
  }, [state.groups, userId]);

  // 3. Spending by Group (Pie Chart)
  const pieData = useMemo(() => {
    if (!userId) return [];
    const data = state.groups.map(g => {
        const mySpending = g.expenses
            .filter(e => e.participantIds.includes(userId))
            .reduce((sum, e) => sum + (e.amount / e.participantIds.length), 0);
        
        return {
            name: g.name,
            spending: mySpending,
            color: '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'),
            legendFontColor: colors.text,
            legendFontSize: 12
        };
    }).filter(d => d.spending > 0);

    return data;
  }, [state.groups, userId, colors.text]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle>Resumen Financiero</SectionTitle>
        
        <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Balance Global</Text>
            <Text style={[
                styles.summaryValue, 
                { color: globalBalance >= 0 ? colors.success || '#4CAF50' : colors.danger || '#F44336' }
            ]}>
                {globalBalance >= 0 ? '+' : ''}${globalBalance.toFixed(2)}
            </Text>
            <Text style={styles.summaryHint}>
                {globalBalance >= 0 ? 'Te deben en total' : 'Debes en total'}
            </Text>
        </Card>

        <SectionTitle>Mis Gastos (6 meses)</SectionTitle>
        {chartData.datasets[0].data.some(v => v > 0) ? (
            <LineChart
                data={chartData}
                width={screenWidth - 48} // Screen padding correction
                height={220}
                chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(10, 132, 255, ${opacity})`, // Primary Blue-ish
                    labelColor: (opacity = 1) => colors.textSecondary,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
                }}
                bezier
                style={{ borderRadius: 16, marginVertical: 8 }}
            />
        ) : (
            <Text style={{textAlign: 'center', color: colors.muted, margin: 20}}>
                No hay movimientos recientes
            </Text>
        )}

        <SectionTitle>Gastos por Grupo</SectionTitle>
        {pieData.length > 0 ? (
             <PieChart
                data={pieData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"spending"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
             />
        ) : (
            <Text style={{textAlign: 'center', color: colors.muted, margin: 20}}>
                Únete a un grupo para ver desglose
            </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        summaryCard: {
            alignItems: 'center',
            paddingVertical: 24,
        },
        summaryLabel: {
            fontSize: 14,
            textTransform: 'uppercase',
            color: colors.textSecondary,
            fontWeight: '600',
        },
        summaryValue: {
            fontSize: 36,
            fontWeight: '800',
            marginVertical: 8,
        },
        summaryHint: {
            fontSize: 13,
            color: colors.muted,
        }
    });
}
