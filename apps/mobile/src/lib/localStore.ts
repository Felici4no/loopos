/**
 * Camada genérica de armazenamento local.
 *
 * Wrapper simples sobre AsyncStorage com serialização JSON.
 * Se o JSON estiver corrompido, retorna o fallback sem quebrar o app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getLocalData<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setLocalData<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[LoopOS] setLocalData(${key}) falhou:`, err);
  }
}

export async function clearLocalData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.error(`[LoopOS] clearLocalData(${key}) falhou:`, err);
  }
}
