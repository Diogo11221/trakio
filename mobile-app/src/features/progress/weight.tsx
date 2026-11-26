import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { api } from '@/lib/api';
import type { WeightDto } from '@/lib/apiTypes';
import { dayKey } from '@/lib/persist';
import { useRemote } from '@/lib/useRemote';
import { useAuth } from '@/state/auth';

export type WeightEntry = { at: number; kg: number };

type WeightContextValue = {
  /** Oldest first. */
  entries: WeightEntry[];
  /** Logs today's weight (replaces one from earlier today); the server also updates the profile. */
  logWeight: (kg: number) => Promise<void>;
};

const WeightContext = createContext<WeightContextValue | null>(null);

/** "2026-11-25" → noon that day, local time. */
function at(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12).getTime();
}

export function WeightProvider({ children }: { children: ReactNode }) {
  const { account, refresh } = useAuth();
  const profile = account?.profile?.kind === 'client' ? account.profile : null;
  const fetcher = useCallback(
    () => api.get<WeightDto[]>('/api/v1/me/weights').then((list) => list.map((w) => ({ at: at(w.day), kg: w.kg }))),
    [],
  );
  const owner = profile && account ? account.id : null;
  const { data, reload } = useRemote(owner, owner ? fetcher : null);
  const stored = useMemo(() => data ?? [], [data]);

  const value = useMemo<WeightContextValue>(() => {
    // Before any weigh-in, the weight from onboarding is the starting point.
    const entries = stored.length === 0 && profile && account ? [{ at: Date.parse(account.createdAt), kg: profile.weightKg }] : stored;
    return {
      entries,
      logWeight: async (kg) => {
        await api.post('/api/v1/me/weights', { kg, day: dayKey(new Date()) });
        await Promise.all([reload(), refresh()]);
      },
    };
  }, [account, profile, refresh, reload, stored]);

  return <WeightContext.Provider value={value}>{children}</WeightContext.Provider>;
}

export function useWeight(): WeightContextValue {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used inside <WeightProvider>');
  return ctx;
}
