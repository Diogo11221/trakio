import Constants from 'expo-constants';

/**
 * Where backend-core lives. Set EXPO_PUBLIC_API_URL for a deployed API; in development it
 * defaults to port 8080 on the machine running Expo (so a phone on the same Wi-Fi reaches it).
 */
function defaultApiUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:8080` : 'http://localhost:8080';
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl()).replace(/\/$/, '');
