import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'roomiegastos:data';

export async function loadState<T>(suffix = 'default'): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY}:${suffix}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to load state', error);
    return null;
  }
}

export async function saveState<T>(state: T, suffix = 'default'): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEY}:${suffix}`, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save state', error);
  }
}

export async function clearState(suffix = 'default'): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_KEY}:${suffix}`);
  } catch (error) {
    console.warn('Failed to clear state', error);
  }
}
