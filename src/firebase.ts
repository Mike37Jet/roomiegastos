import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const requiredEnv = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const ensureEnv = (key: (typeof requiredEnv)[number]) => {
  // First try process.env for dev builds, then fall back to expo-constants for production
  const value = process.env[key] || Constants.expoConfig?.extra?.[key];
  if (!value) {
    throw new Error(`Missing required env var ${key}. Check your .env / app config.`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: ensureEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: ensureEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: ensureEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: ensureEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: ensureEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: ensureEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

// Reduce verbose Firestore logging in dev builds.
setLogLevel('error');

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let authInstance: Auth;
if (Platform.OS === 'web') {
  // Web already ships with proper browser persistence.
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (err) {
    // initializeAuth throws if already initialized; reuse existing instance.
    console.warn('initializeAuth() fallback to getAuth()', err);
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

let dbInstance: Firestore;
try {
  const firestoreSettings = {
    // Long-polling helps when WebChannel is blocked (common in some networks/extensions).
    experimentalForceLongPolling: Platform.OS === 'web',
    // Avoid fetch streams which can be blocked in some environments.
    useFetchStreams: Platform.OS === 'web' ? false : undefined,
  } as any;

  dbInstance = initializeFirestore(app, firestoreSettings);
} catch (err) {
  console.warn('initializeFirestore() fallback to getFirestore()', err);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
