import { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CreditCard,
  Eye,
  GearSix,
  LinkSimple,
  NotePencil,
  PlusCircle,
  Sparkle,
  Camera,
} from 'phosphor-react-native';

import { Button, Card, Screen, SectionTitle } from '@/src/ui';
import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { FREE_LIMITS } from '@/src/limits';

export default function HomeScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPremium = state.user?.premium ?? false;
  const remaining = FREE_LIMITS.groups - state.groups.length;

  return (
    <Screen>
      <Card>
        <View style={styles.brandRow}>
          <Image source={require('@/assets/images/icon.png')} style={styles.brandIcon} />
          <View>
            <Text style={styles.brandName}>Roomiegastos</Text>
            <Text style={styles.brandTagline}>Control simple y claro</Text>
          </View>
        </View>
        <Text style={styles.greeting}>Hola {state.user?.name || 'Roomie'}</Text>
        <Text style={styles.meta}>
          Plan {isPremium ? 'Premium' : 'Gratis'} · {state.groups.length} grupos activos
        </Text>
        {!isPremium && (
          <Text style={styles.meta}>Te quedan {Math.max(remaining, 0)} grupos gratis.</Text>
        )}
        <View style={styles.actions}>
          <Button
            label="Crear grupo"
            icon={<PlusCircle />}
            onPress={() => router.push('/(app)/group/new')}
          />
          <Button
            label="Pagos pendientes"
            variant="secondary"
            icon={<CreditCard />}
            onPress={() => router.push('/(app)/payments')}
          />
          <Button
            label="Unirme a un grupo"
            variant="secondary"
            icon={<LinkSimple />}
            onPress={() => router.push('/(app)/group/join')}
          />
          <Button
            label="Ajustes"
            variant="ghost"
            icon={<GearSix />}
            onPress={() => router.push('/(app)/settings')}
          />
          {!isPremium && (
            <Button
              label="Desbloquear Premium"
              variant="secondary"
              icon={<Sparkle />}
              onPress={() => router.push('/(app)/premium')}
            />
          )}
        </View>
      </Card>

      {state.pendingInvites.length > 0 && (
        <>
          <SectionTitle>Solicitudes pendientes</SectionTitle>
          {state.pendingInvites.map((invite) => (
            <Card key={invite.id} style={styles.inviteCard}>
              <Text style={styles.groupName}>{invite.groupName}</Text>
              <Text style={styles.groupMeta}>
                {invite.requesterName} quiere unirse al grupo.
              </Text>
              <View style={styles.inviteActions}>
                <Button
                  label="Aceptar"
                  onPress={() => void actions.acceptInvite(invite.id)}
                />
                <Button
                  label="Rechazar"
                  variant="ghost"
                  onPress={() => void actions.rejectInvite(invite.id)}
                />
              </View>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Grupos recientes</SectionTitle>
      <FlatList
        data={state.groups}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aun no tienes grupos. Crea uno para empezar.</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.groupCard}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMeta}>
              {item.members.length} miembros · {item.expenses.length} gastos
            </Text>
            <Button
              label="Ver detalles"
              variant="ghost"
              icon={<Eye />}
              onPress={() => router.push(`/(app)/group/${item.id}`)}
            />
          </Card>
        )}
      />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    greeting: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    brandIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    brandName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    brandTagline: {
      fontSize: 12,
      color: colors.muted,
    },
    meta: {
      color: colors.muted,
      fontSize: 13,
    },
    actions: {
      gap: 10,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
    },
    groupCard: {
      marginBottom: 12,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    groupMeta: {
      color: colors.muted,
      fontSize: 12,
    },
    inviteCard: {
      gap: 8,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: 10,
    },
  });
