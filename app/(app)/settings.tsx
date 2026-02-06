import { useRouter } from 'expo-router';
import { Key, XCircle } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Screen, SectionTitle } from '@/src/ui';

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
      <Card>
        <Text style={styles.title}>{state.user?.name}</Text>
        <Text style={styles.meta}>{state.user?.email}</Text>
        <Text style={styles.meta}>Plan: {state.user?.premium ? 'Premium' : 'Gratis'}</Text>
      </Card>

      <SectionTitle>Seguridad</SectionTitle>
      <Card>
        {!showPasswordForm ? (
          <>
            <Button
              label="Cambiar contraseña"
              variant="secondary"
              icon={<Key />}
              onPress={() => setShowPasswordForm(true)}
            />
            <Button
              label="Restablecer contraseña por correo"
              variant="ghost"
              onPress={handlePasswordReset}
            />
          </>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={styles.formLabel}>Contraseña actual</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Tu contraseña actual"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />
            <Text style={styles.formLabel}>Nueva contraseña</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña (mínimo 6 caracteres)"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />
            <Text style={styles.formLabel}>Confirmar nueva contraseña</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirma la nueva contraseña"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />
            <Button label="Guardar nueva contraseña" onPress={handleChangePassword} />
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setShowPasswordForm(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            />
          </View>
        )}
      </Card>

      {state.user?.premium && (
        <>
          <SectionTitle>Suscripción</SectionTitle>
          <Card>
            <Text style={styles.premiumText}>Tienes acceso a funciones Premium</Text>
            <Button
              label="Cancelar suscripción Premium"
              variant="ghost"
              icon={<XCircle color={colors.danger} />}
              onPress={handleRevokePremium}
            />
          </Card>
        </>
      )}

      <SectionTitle>Sesión</SectionTitle>
      <Card>
        <Button label="Cerrar sesion" variant="ghost" onPress={handleSignOut} />
      </Card>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    meta: {
      fontSize: 13,
      color: colors.muted,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.card,
      fontSize: 15,
    },
    premiumText: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
  });
