import { useRouter } from 'expo-router';
import {
    CaretRight,
    CreditCard,
    GearSix,
    LinkSimple,
    PlusCircle,
    Sparkle,
    Users
} from 'phosphor-react-native';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FREE_LIMITS } from '@/src/limits';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Screen, SectionTitle } from '@/src/ui';

export default function HomeScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPremium = state.user?.premium ?? false;
  const remaining = FREE_LIMITS.groups - state.groups.length;

  const quickActions = [
    { label: 'Crear', icon: PlusCircle, route: '/(app)/group/new', highlight: true },
    { label: 'Unirse', icon: LinkSimple, route: '/(app)/group/join' },
    { label: 'Pagos', icon: CreditCard, route: '/(app)/payments' },
    { label: 'Ajustes', icon: GearSix, route: '/(app)/settings', variant: 'ghost' },
  ] as const;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>Hola, {state.user?.name || 'Roomie'}</Text>
        <Pressable 
          onPress={() => !isPremium && router.push('/(app)/premium')}
          style={({ pressed }) => [styles.badge, pressed && { opacity: 0.7 }]}
        >
          <Sparkle size={12} color={isPremium ? colors.warning : colors.muted} weight="fill" />
          <Text style={[styles.badgeText, isPremium && { color: colors.warning }]}>
            {isPremium ? 'Premium Activo' : 'Plan Gratis'}
          </Text>
        </Pressable>
      </View>

      {!isPremium && (
        <Text style={styles.limitText}>
          {Math.max(remaining, 0)} grupos disponibles
        </Text>
      )}

      {/* Quick Actions Grid */}
      <View style={styles.grid}>
        {quickActions.map((action, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.gridItem,
              { backgroundColor: action.highlight ? colors.primary : colors.card },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => router.push(action.route as any)}
          >
            <action.icon 
              size={24} 
              color={action.highlight ? '#FFF' : colors.primary} 
              weight={action.highlight ? 'fill' : 'regular'}
            />
            <Text style={[
              styles.gridLabel, 
              action.highlight && { color: '#FFF', fontWeight: '600' }
            ]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Pending Invites */}
      {state.pendingInvites.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Solicitudes</SectionTitle>
          {state.pendingInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteText}>
                  <Text style={{ fontWeight: '600' }}>{invite.requesterName}</Text> quiere unirse a "{invite.groupName}"
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <Pressable 
                  onPress={() => void actions.acceptInvite(invite.id)}
                  style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.smallBtnText}>Aceptar</Text>
                </Pressable>
                <Pressable 
                  onPress={() => void actions.rejectInvite(invite.id)}
                  style={styles.smallBtnHost}
                >
                  <Text style={[styles.smallBtnText, { color: colors.danger }]}>X</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <SectionTitle>Mis Grupos</SectionTitle>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={state.groups}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Users size={32} color={colors.muted} />
            </View>
            <Text style={styles.emptyText}>No tienes grupos activos.</Text>
            <Text style={styles.emptySubtext}>Crea uno o únete para comenzar.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.groupRow,
              pressed && { backgroundColor: colors.surface }
            ]}
            onPress={() => router.push(`/(app)/group/${item.id}`)}
          >
            <View style={styles.groupIcon}>
              <Text style={styles.groupInitials}>{item.name.substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupDetail}>
                {item.members.length} miembros · {item.expenses.length} gastos
              </Text>
            </View>
            <CaretRight size={16} color={colors.muted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    headerContainer: {
      marginBottom: 0,
    },
    welcomeSection: {
      marginBottom: 16,
      gap: 4,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
    limitText: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 20,
    },
    grid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 32,
    },
    gridItem: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      // Shadow for iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      // Elevation for Android
      elevation: 2,
    },
    gridLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    section: {
      marginBottom: 24,
    },
    inviteRow: { // Card-like row for invites
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    inviteText: {
      fontSize: 14,
      color: colors.text,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: 8,
    },
    smallBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    smallBtnHost: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    smallBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFF',
    },
    // Group List Items
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      marginBottom: 1, // Separator effect
      gap: 12,
      borderRadius: 12, // Rounded items like modern iOS Sidebars or inset grouped lists
      marginVertical: 4, // Spacing between card-rows
    },
    groupIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background, // slight contrast
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInitials: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    groupDetail: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
      opacity: 0.8,
    },
    emptyIconBg: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
  });
