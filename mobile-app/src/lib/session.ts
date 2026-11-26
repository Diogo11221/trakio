import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Session tokens. The access token (15 min) only lives in memory; the refresh token is kept in
 * the iOS Keychain / Android Keystore (SecureStore). On web there is no secure store, so the
 * browser preview falls back to local storage.
 */
const REFRESH_KEY = 'trakio.refresh-token';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function loadRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(REFRESH_KEY);
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) await AsyncStorage.setItem(REFRESH_KEY, token);
    else await AsyncStorage.removeItem(REFRESH_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(REFRESH_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}
