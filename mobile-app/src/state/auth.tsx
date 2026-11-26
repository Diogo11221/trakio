import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as remote from '@/features/auth/remoteAuth';
import type { ClientProfile, Profile, PublicAccount, Role, TrainerProfile } from '@/features/auth/types';
import { onSessionExpired } from '@/lib/api';

type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; account: PublicAccount };

type AuthContextValue = {
  state: AuthState;
  account: PublicAccount | null;
  signUp: (email: string, password: string, role: Role) => Promise<PublicAccount>;
  signIn: (email: string, password: string) => Promise<PublicAccount>;
  signOut: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<PublicAccount>;
  /** Re-reads the account (after a payment, a weigh-in, hiring a PT…). */
  refresh: () => Promise<PublicAccount | null>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Session on backend-core — restored from the phone's secure storage on launch. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    remote
      .currentAccount()
      .then((account) => alive && setState(account ? { status: 'signedIn', account } : { status: 'signedOut' }))
      .catch(() => alive && setState({ status: 'signedOut' }));
    const off = onSessionExpired(() => setState({ status: 'signedOut' }));
    return () => {
      alive = false;
      off();
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
      signUp: (email, password, role) => remote.signUp(email, password, role).then(signedIn),
      signIn: (email, password) => remote.signIn(email, password).then(signedIn),
      signOut: async () => {
        await remote.signOut();
        setState({ status: 'signedOut' });
      },
      saveProfile: async (profile) => signedIn(await remote.saveProfile(profile)),
      refresh: async () => {
        if (state.status !== 'signedIn') return null;
        try {
          return signedIn(await remote.reload());
        } catch {
          return null;
        }
      },
      changePassword: async (current, next) => {
        signedIn(await remote.changePassword(current, next));
      },
      deleteAccount: async (password) => {
        await remote.deleteAccount(password);
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

/** Shown for a moment while signing out or when a screen opens without a session. */
const emptyClient: ClientProfile = {
  kind: 'client',
  name: '',
  photoUri: null,
  sex: 'male',
  birthYear: 1995,
  heightCm: 175,
  weightKg: 75,
  goalWeightKg: null,
  goal: 'maintain',
  activity: 'light',
  daysPerWeek: 3,
  experience: 'new',
  coached: false,
  trainer: null,
};

const emptyTrainer: TrainerProfile = {
  kind: 'trainer',
  name: '',
  photoUri: null,
  article: 'o',
  city: '',
  area: '',
  online: false,
  bio: '',
  specialties: [],
  verified: false,
};

export function useClientProfile(): ClientProfile {
  const { account } = useAuth();
  return account?.profile?.kind === 'client' ? account.profile : emptyClient;
}

export function useTrainerProfile(): TrainerProfile {
  const { account } = useAuth();
  return account?.profile?.kind === 'trainer' ? account.profile : emptyTrainer;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
