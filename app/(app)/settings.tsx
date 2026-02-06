import { useRouter } from 'expo-router';
import { Key, SignOut, Star } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Field, Screen, SectionTitle } from '@/src/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          actions
            .signOut()
            .then(() => {
              router.replace('/(auth)');
            })
            .catch(() => {
              router.replace('/(auth)');
            });
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    const result = await actions.changePassword({
      currentPassword,
      newPassword,
    });

    if (result.ok) {
      Alert.alert('Éxito', result.message || 'Contraseña actualizada');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Error', result.message || 'No se pudo cambiar la contraseña');
    }
  };

  const handlePasswordReset = () => {
    if (!state.user?.email) return;
    Alert.alert(
      'Restablecer contraseña',
      `¿Enviar correo de restablecimiento a ${state.user.email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            const result = await actions.sendPasswordResetEmail(state.user!.email);
            Alert.alert(
              result.ok ? 'Correo enviado' : 'Error',
              result.message || 'Revisa tu bandeja de entrada'
            );
          },
        },
      ]
    );
  };

  const handleRevokePremium = () => {
    Alert.alert(
      'Cancelar suscripción Premium',
      '¿Estás seguro que quieres cancelar tu suscripción Premium? Perderás acceso a las funciones premium.',
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Cancelar suscripción',
          style: 'destructive',
          onPress: async () => {
            try {
              await actions.revokePremium();
              Alert.alert('Suscripción cancelada', 'Ya no tienes acceso a las funciones premium');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
        {/* Profile Section */}
        <View style={styles.profileHeader}>
             <View style={styles.avatar}>
               <Text style={styles.avatarText}>{state.user?.name?.substring(0, 2).toUpperCase()}</Text>
             </View>
             <Text style={styles.title}>{state.user?.name}</Text>
             <Text style={styles.meta}>{state.user?.email}</Text>
             <View style={[styles.badge, state.user?.premium && { backgroundColor: colors.warning + '20' }]}>
                {state.user?.premium && <Star size={12} weight="fill" color={colors.warning} />}
                <Text style={[styles.badgeText, state.user?.premium && { color: colors.warning }]}>
                    Plan {state.user?.premium ? 'Premium' : 'Gratis'}
                </Text>
             </View>
        </View>

        <View>
             <SectionTitle>Seguridad</SectionTitle>
             <Card style={{ paddingVertical: 0 }}>
                {!showPasswordForm ? (
                   <>
                       <Pressable style={[styles.row, styles.borderBottom]} onPress={() => setShowPasswordForm(true)}>
                           <View style={styles.rowContent}>
                               <Key size={20} color={colors.primary} />
                               <Text style={styles.rowLabel}>Cambiar contraseña</Text>
                           </View>
                           <Text style={styles.chevron}>›</Text>
                       </Pressable>
                       <Pressable style={styles.row} onPress={handlePasswordReset}>
                           <View style={styles.rowContent}>
                               <Key size={20} color={colors.muted} />
                               <Text style={styles.rowLabel}>Restablecer contraseña por correo</Text>
                           </View>
                           <Text style={styles.chevron}>›</Text>
                       </Pressable>
                   </>
                ) : (
                    <View style={{ padding: 16, gap: 12 }}>
                        <Text style={styles.formTitle}>Cambiar contraseña</Text>
                        <Field
                            label="Contraseña actual"
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                        <Field
                            label="Nueva contraseña"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <Field
                            label="Confirmar contraseña"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <View style={styles.formActions}>
                            <Button label="Guardar" onPress={handleChangePassword} style={{ flex: 1 }} />
                            <Button label="Cancelar" variant="ghost" onPress={() => setShowPasswordForm(false)} style={{ flex: 1 }} />
                        </View>
                    </View>
                )}
             </Card>
        </View>

        {state.user?.premium && (
            <View>
                 <SectionTitle>Suscripción</SectionTitle>
                 <Card style={{ paddingVertical: 0 }}>
                    <Pressable style={styles.row} onPress={handleRevokePremium}>
                       <View style={styles.rowContent}>
                           <Star size={20} color={colors.muted} />
                           <Text style={styles.rowLabel}>Cancelar suscripción Premium</Text>
                       </View>
                       <Text style={styles.chevron}>›</Text>
                    </Pressable>
                 </Card>
            </View>
        )}

        <View>
             <SectionTitle>Sesión</SectionTitle>
             <Card style={{ paddingVertical: 0 }}>
                <Pressable style={styles.row} onPress={handleSignOut}>
                   <View style={styles.rowContent}>
                       <SignOut size={20} color={colors.danger} />
                       <Text style={[styles.rowLabel, { color: colors.danger }]}>Cerrar sesión</Text>
                   </View>
                </Pressable>
            </Card>
        </View>

        <Text style={styles.version}>Version 1.0.0 (Build 10)</Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    meta: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 8,
    },
    badge: {
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.muted,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowLabel: {
        fontSize: 16,
        color: colors.text,
    },
    borderBottom: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    chevron: {
        fontSize: 20,
        color: colors.mutedSecondary,
        fontWeight: '300',
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    version: {
        textAlign: 'center',
        color: colors.mutedSecondary,
        fontSize: 12,
        marginBottom: 20,
    },
  });
