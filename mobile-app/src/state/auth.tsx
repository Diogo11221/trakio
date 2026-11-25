import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as localAuth from '@/features/auth/localAuth';
import type { ClientProfile, Profile, PublicAccount, Role, TrainerProfile } from '@/features/auth/types';

type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; account: PublicAccount };

type AuthContextValue = {
  state: AuthState;
  account: PublicAccount | null;
  signUp: (email: string, password: string, role: Role) => Promise<PublicAccount>;
  signIn: (email: string, password: string) => Promise<PublicAccount>;
  signOut: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<PublicAccount>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Session for the test accounts — restored from the phone on launch. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    localAuth
      .currentAccount()
      .then((account) => alive && setState(account ? { status: 'signedIn', account } : { status: 'signedOut' }))
      .catch(() => alive && setState({ status: 'signedOut' }));
    return () => {
      alive = false;
    };
  }, []);

  const signedIn = useCallback((account: PublicAccount) => {
    setState({ status: 'signedIn', account });
    return account;
  }, []);

  const account = state.status === 'signedIn' ? state.account : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      account,
      signUp: (email, password, role) => localAuth.signUp(email, password, role).then(signedIn),
      signIn: (email, password) => localAuth.signIn(email, password).then(signedIn),
      signOut: async () => {
        await localAuth.signOut();
        setState({ status: 'signedOut' });
      },
      saveProfile: async (profile) => {
        if (!account) throw new Error('Not signed in');
        return signedIn(await localAuth.saveProfile(account.id, profile));
      },
      deleteAccount: async () => {
        if (!account) return;
        await localAuth.deleteAccount(account.id);
        setState({ status: 'signedOut' });
      },
    }),
    [account, signedIn, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where a signed-in account lands: onboarding until the profile exists, then its home tab. */
export function homeFor(account: PublicAccount): '/onboarding' | '/today' | '/pt/home' {
  if (!account.profile) return '/onboarding';
  return account.role === 'trainer' ? '/pt/home' : '/today';
}

const fallbackClient: ClientProfile = {
  kind: 'client',
  name: 'Miguel Costa',
  photoUri: null,
  demoPerson: 'miguel',
  sex: 'male',
  birthYear: 1997,
  heightCm: 178,
  weightKg: 78.4,
  goalWeightKg: null,
  goal: 'gain',
  activity: 'moderate',
  daysPerWeek: 4,
  experience: 'some',
  coached: true,
};

const fallbackTrainer: TrainerProfile = {
  kind: 'trainer',
  name: 'Rita Santos',
  photoUri: null,
  demoPerson: 'rita',
  city: 'Lisboa',
  online: true,
  specialties: ['Hipertrofia'],
};

/** Signed-in client's profile (falls back to the demo client when opened without a session, e.g. deep links). */
export function useClientProfile(): ClientProfile {
  const { account } = useAuth();
  return account?.profile?.kind === 'client' ? account.profile : fallbackClient;
}

export function useTrainerProfile(): TrainerProfile {
  const { account } = useAuth();
  return account?.profile?.kind === 'trainer' ? account.profile : fallbackTrainer;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
