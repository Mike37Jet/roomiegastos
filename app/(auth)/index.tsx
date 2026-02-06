import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/store';
import { ThemeColors, useThemeColors } from '@/src/theme';
import { Button, Card, Checkbox, Field, Screen, Tag } from '@/src/ui';

export default function AuthScreen() {
  const router = useRouter();
  const { actions } = useStore();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('auth_email').then((savedEmail) => {
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (mode === 'register') {
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Datos incompletos', 'Completa todos los campos para continuar.');
        return;
      }
      const result = await actions.signUp({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      if (!result.ok) {
        Alert.alert('No se pudo registrar', result.message ?? 'Intenta de nuevo.');
        return;
      }
      Alert.alert('Verifica tu correo', result.message ?? 'Revisa tu bandeja.');
      setMode('login');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa tu correo y contrasena.');
      return;
    }

    const result = await actions.signIn({ email: email.trim(), password: password.trim() });
    if (!result.ok) {
      Alert.alert('No se pudo iniciar', result.message ?? 'Revisa tus datos.');
      return;
    }
    
    if (rememberMe) {
      await AsyncStorage.setItem('auth_email', email.trim());
    } else {
      await AsyncStorage.removeItem('auth_email');
    }

    router.replace('/(app)');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>SplitRoom</Text>
        <Text style={styles.subtitle}>
          Comparte gastos con tu equipo de cuarto, viajes o proyectos sin dramas.
        </Text>
        <View style={styles.tags}>
          <Tag text="Gastos claros" />
          <Tag text="Deudas automaticas" />
          <Tag text="Freemium" />
        </View>
      </View>

      <Card>
        <Text style={styles.cardTitle}>
          {mode === 'register' ? 'Crea tu cuenta' : 'Inicia sesion'}
        </Text>
        {mode === 'register' && (
          <Field
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Valeria"
          />
        )}
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="correo@uni.edu"
          keyboardType="email-address"
        />
        <Field
          label="Contrasena"
          value={password}
          onChangeText={setPassword}
          placeholder="Minimo 6 caracteres"
          secureTextEntry
        />
        {mode === 'login' && (
          <Checkbox
            label="Recordarme"
            checked={rememberMe}
            onChange={setRememberMe}
          />
        )}
        <Button
          label={mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          onPress={handleSubmit}
        />
        <Button
          label={mode === 'register' ? 'Ya tengo cuenta' : 'Quiero registrarme'}
          variant="ghost"
          onPress={() => setMode(mode === 'register' ? 'login' : 'register')}
        />
      </Card>

      <Text style={styles.footer}>
        Demo local: los datos se guardan solo en este dispositivo.
      </Text>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hero: {
      gap: 12,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    footer: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.muted,
    },
  });
