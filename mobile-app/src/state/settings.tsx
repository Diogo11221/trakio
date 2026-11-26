import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Preferences } from '@/features/auth/types';
import { api } from '@/lib/api';
import type { CheckoutDto } from '@/lib/apiTypes';
import { setHapticsEnabled } from '@/lib/haptics';
import { setPlimEnabled } from '@/lib/sound';
import { useAuth } from '@/state/auth';

export type TrainingMode = 'solo' | 'coached' | 'trainer';

const defaults: Preferences = { vibration: true, lockScreenAlert: true, restSound: true };

type SettingsContextValue = Preferences & {
  /** Choice on Boas-vindas — kept in memory so it survives creating the account. */
  mode: TrainingMode;
  setMode: (mode: TrainingMode) => void;
  setVibration: (value: boolean) => void;
  setLockScreenAlert: (value: boolean) => void;
  setRestSound: (value: boolean) => void;
  /** From a paid subscription on the server — the app can't switch it on. */
  premium: boolean;
  /** Pays for Premium (Stripe Checkout, or instantly in development). True when it's active now. */
  buyPremium: () => Promise<boolean>;
  /** Ends Premium at the end of the paid month (only after the person confirmed). */
  cancelPremium: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Opens a payment page and reads the account again when the person comes back. */
export async function payAt(checkout: CheckoutDto, refresh: () => Promise<unknown>): Promise<void> {
  if (checkout.status === 'pending' && checkout.url) {
    await WebBrowser.openBrowserAsync(checkout.url);
  }
  await refresh();
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { account, refresh } = useAuth();
  const [mode, setMode] = useState<TrainingMode>('solo');
  // Changes made on this phone since the account was last read (tagged with the account).
  const [local, setLocal] = useState<{ owner: string | null; patch: Partial<Preferences> }>({ owner: null, patch: {} });
  const owner = account?.id ?? null;
  const saved = account?.preferences;
  const prefs = useMemo<Preferences>(
    () => ({ ...defaults, ...saved, ...(local.owner === owner ? local.patch : {}) }),
    [local, owner, saved],
  );

  useEffect(() => setHapticsEnabled(prefs.vibration), [prefs.vibration]);
  useEffect(() => setPlimEnabled(prefs.restSound), [prefs.restSound]);

  const update = useCallback(
    (patch: Partial<Preferences>) => {
      const next = { ...prefs, ...patch };
      setLocal({ owner, patch: next });
      if (owner) api.put('/api/v1/me/preferences', next).catch(() => setLocal({ owner, patch: prefs }));
    },
    [owner, prefs],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...prefs,
      mode,
      setMode,
      setVibration: (vibration) => update({ vibration }),
      setLockScreenAlert: (lockScreenAlert) => update({ lockScreenAlert }),
      setRestSound: (restSound) => update({ restSound }),
      premium: account?.premium ?? false,
      buyPremium: async () => {
        const checkout = await api.post<CheckoutDto>('/api/v1/me/premium/checkout');
        let active = false;
        await payAt(checkout, async () => {
          active = (await refresh())?.premium ?? false;
        });
        return active;
      },
      cancelPremium: async () => {
        await api.post('/api/v1/me/premium/cancel', { confirm: true });
        await refresh();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account?.premium, mode, prefs.vibration, prefs.lockScreenAlert, prefs.restSound, refresh, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
