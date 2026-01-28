import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  if (Constants.appOwnership === 'expo') return null;

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  if (!projectId) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
