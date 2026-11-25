import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { setHapticsEnabled } from '@/lib/haptics';

export type TrainingMode = 'solo' | 'coached' | 'trainer';

type Settings = {
  mode: TrainingMode;
  vibration: boolean;
  lockScreenAlert: boolean;
  premium: boolean;
};

type SettingsContextValue = Settings & {
  setMode: (mode: TrainingMode) => void;
  setVibration: (value: boolean) => void;
  setLockScreenAlert: (value: boolean) => void;
  setPremium: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    mode: 'solo',
    vibration: true,
    lockScreenAlert: true,
    premium: false,
  });

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setMode: (mode) => setSettings((s) => ({ ...s, mode })),
      setVibration: (vibration) => {
        setHapticsEnabled(vibration);
        setSettings((s) => ({ ...s, vibration }));
      },
      setLockScreenAlert: (lockScreenAlert) => setSettings((s) => ({ ...s, lockScreenAlert })),
      setPremium: (premium) => setSettings((s) => ({ ...s, premium })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
