import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';

/**
 * State that survives app restarts (AsyncStorage). Stands in for backend-core
 * until it exists: each provider keeps one key per account.
 *
 * - `key` null → memory only (signed out).
 * - `parse` turns stored JSON back into T, or null to fall back to `initial`.
 *   Keep it a module-level function so its identity is stable.
 */
export function usePersistentState<T>(
  key: string | null,
  initial: () => T,
  parse: (raw: unknown) => T | null,
): [T, (update: SetStateAction<T>) => void, boolean] {
  const [state, setState] = useState(() => ({ key, value: initial(), loaded: key === null }));

  // Switching account: start from that account's defaults, then load its saved copy.
  if (state.key !== key) setState({ key, value: initial(), loaded: key === null });

  useEffect(() => {
    if (!key) return;
    let alive = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive) return;
        let saved: T | null = null;
        if (raw) {
          try {
            saved = parse(JSON.parse(raw));
          } catch {
            saved = null;
          }
        }
        setState((s) => (s.key === key ? { key, value: saved ?? s.value, loaded: true } : s));
      })
      .catch(() => alive && setState((s) => (s.key === key ? { ...s, loaded: true } : s)));
    return () => {
      alive = false;
    };
  }, [key, parse]);

  useEffect(() => {
    if (!state.key || !state.loaded) return;
    AsyncStorage.setItem(state.key, JSON.stringify(state.value)).catch(() => undefined);
  }, [state]);

  const set = useCallback((update: SetStateAction<T>) => {
    setState((s) => ({
      ...s,
      value: typeof update === 'function' ? (update as (previous: T) => T)(s.value) : update,
    }));
  }, []);

  return [state.value, set, state.loaded];
}

/** Storage key for one account's slice of data. */
export function accountKey(accountId: string | undefined, name: string): string | null {
  return accountId ? `trakio.data.${accountId}.${name}` : null;
}

export function isArrayOf<T>(raw: unknown, check: (item: unknown) => boolean): raw is T[] {
  return Array.isArray(raw) && raw.every(check);
}

export function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

/** Local calendar day "2026-11-25" (not UTC). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
