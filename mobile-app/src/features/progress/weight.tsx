import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { accountKey, isArrayOf, isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';

export type WeightEntry = { at: number; kg: number };

function parseWeights(raw: unknown): WeightEntry[] | null {
  return isArrayOf<WeightEntry>(raw, (e) => isRecord(e) && typeof e.at === 'number' && typeof e.kg === 'number') ? raw : null;
}

/** Weekly weigh-ins for the demo client: 76,0 → 78,4 kg over two months. */
function demoWeights(): WeightEntry[] {
  const week = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const values = [76.0, 76.3, 76.4, 76.9, 77.1, 77.0, 77.6, 77.9, 78.4];
  return values.map((kg, i) => ({ at: now - (values.length - 1 - i) * week - 3600 * 1000, kg }));
}

type WeightContextValue = {
  /** Oldest first. */
  entries: WeightEntry[];
  /** Logs today's weight (replaces an entry from earlier today) and updates the profile. */
  logWeight: (kg: number) => Promise<void>;
};

const WeightContext = createContext<WeightContextValue | null>(null);

export function WeightProvider({ children }: { children: ReactNode }) {
  const { account, saveProfile } = useAuth();
  const demo = account?.id === 'demo-miguel';
  const profile = account?.profile?.kind === 'client' ? account.profile : null;
  const [stored, setEntries] = usePersistentState(
    accountKey(account?.id, 'weight'),
    () => (demo ? demoWeights() : []),
    parseWeights,
  );

  const value = useMemo<WeightContextValue>(() => {
    // New accounts start from the weight given in onboarding.
    const entries = stored.length === 0 && profile && account ? [{ at: Date.parse(account.createdAt), kg: profile.weightKg }] : stored;
    return {
      entries,
      logWeight: async (kg) => {
        const now = new Date();
        const startOfDay = new Date(now).setHours(0, 0, 0, 0);
        setEntries((list) => {
          const base = list.length === 0 ? entries : list;
          return [...base.filter((e) => e.at < startOfDay), { at: now.getTime(), kg }];
        });
        if (profile) await saveProfile({ ...profile, weightKg: kg });
      },
    };
  }, [account, profile, saveProfile, setEntries, stored]);

  return <WeightContext.Provider value={value}>{children}</WeightContext.Provider>;
}

export function useWeight(): WeightContextValue {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used inside <WeightProvider>');
  return ctx;
}
