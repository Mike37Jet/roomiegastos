import { useThemeColors } from '@/src/theme';
import { Stack } from 'expo-router';

export default function AppLayout() {
  const theme = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerShadowVisible: false, // Cleaner look
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text, fontWeight: '600' },
        contentStyle: { backgroundColor: theme.background },
        animation: 'default',
      }}>
      <Stack.Screen name="index" options={{ title: 'Mis Grupos', headerLargeTitle: true }} />
      <Stack.Screen 
        name="group/new" 
        options={{ 
          title: 'Nuevo Grupo', 
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="group/join" 
        options={{ 
          title: 'Unirse', 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="group/[id]" 
        options={{ 
          title: 'Grupo',
          headerBackTitle: 'Atrás'
        }} 
      />
      <Stack.Screen 
        name="expense/new" 
        options={{ 
          title: 'Nuevo Gasto', 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen name="payments" options={{ title: 'Pagos Pendientes' }} />
      <Stack.Screen 
        name="receipt/capture" 
        options={{ 
          title: 'Escanear', 
          presentation: 'fullScreenModal' 
        }} 
      />
      <Stack.Screen name="receipt/review" options={{ title: 'Revisar Items' }} />
      <Stack.Screen 
        name="receipt/manual" 
        options={{ 
          title: 'Factura Manual',
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="premium" 
        options={{ 
          title: 'Premium', 
          presentation: 'modal' 
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: 'Configuración',
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
}
