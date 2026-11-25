import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setHapticsEnabled } from '@/lib/haptics';
import { accountKey, isRecord, usePersistentState } from '@/lib/persist';
import { setPlimEnabled } from '@/lib/sound';
import { useAuth } from '@/state/auth';

export type TrainingMode = 'solo' | 'coached' | 'trainer';

/** Per-account preferences, saved on the phone. */
type Preferences = {
  vibration: boolean;
  lockScreenAlert: boolean;
  premium: boolean;
  restSound: boolean;
};

const defaults: Preferences = { vibration: true, lockScreenAlert: true, premium: false, restSound: true };

function parsePreferences(raw: unknown): Preferences | null {
  if (!isRecord(raw)) return null;
  return {
    vibration: raw.vibration !== false,
    lockScreenAlert: raw.lockScreenAlert !== false,
    premium: raw.premium === true,
    restSound: raw.restSound !== false,
  };
}

type SettingsContextValue = Preferences & {
  /** Choice on Boas-vindas — kept in memory so it survives creating the account. */
  mode: TrainingMode;
  setMode: (mode: TrainingMode) => void;
  setVibration: (value: boolean) => void;
  setLockScreenAlert: (value: boolean) => void;
  setPremium: (value: boolean) => void;
  setRestSound: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [mode, setMode] = useState<TrainingMode>('solo');
  const [prefs, setPrefs] = usePersistentState(accountKey(account?.id, 'settings'), () => defaults, parsePreferences);

  useEffect(() => setHapticsEnabled(prefs.vibration), [prefs.vibration]);
  useEffect(() => setPlimEnabled(prefs.restSound), [prefs.restSound]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...prefs,
      mode,
      setMode,
      setVibration: (vibration) => setPrefs((p) => ({ ...p, vibration })),
      setLockScreenAlert: (lockScreenAlert) => setPrefs((p) => ({ ...p, lockScreenAlert })),
      setPremium: (premium) => setPrefs((p) => ({ ...p, premium })),
      setRestSound: (restSound) => setPrefs((p) => ({ ...p, restSound })),
    }),
    [mode, prefs, setPrefs],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
