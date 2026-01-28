import { Stack } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
      }}>
      <Stack.Screen name="index" options={{ title: 'Tus grupos' }} />
      <Stack.Screen name="group/new" options={{ title: 'Nuevo grupo' }} />
      <Stack.Screen name="group/join" options={{ title: 'Unirse a grupo' }} />
      <Stack.Screen name="group/[id]" options={{ title: 'Detalle del grupo' }} />
      <Stack.Screen name="expense/new" options={{ title: 'Nuevo gasto' }} />
      <Stack.Screen name="payments" options={{ title: 'Pagos' }} />
      <Stack.Screen name="receipt/capture" options={{ title: 'Escanear recibo' }} />
      <Stack.Screen name="receipt/review" options={{ title: 'Revisar items' }} />
      <Stack.Screen name="receipt/manual" options={{ title: 'Factura manual' }} />
      <Stack.Screen name="premium" options={{ title: 'Plan Premium' }} />
      <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}
