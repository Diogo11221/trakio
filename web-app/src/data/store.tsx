import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, hasStoredSession, onExpired, refresh, signIn as apiSignIn, signOut as apiSignOut, type Me } from '../api';
import type { Overview } from './types';

type Session = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; me: Me };

type AdminContextValue = {
  session: Session;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Sidebar badges, refreshed after every decision. */
  pendingVerifications: number;
  openReports: number;
  refreshCounts: () => void;
  toast: { id: number; text: string } | null;
  notify: (text: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() => (hasStoredSession() ? { status: 'loading' } : { status: 'signedOut' }));
  const [counts, setCounts] = useState({ pendingVerifications: 0, openReports: 0 });
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (hasStoredSession()) {
      refresh().then((me) => setSession(me ? { status: 'signedIn', me } : { status: 'signedOut' }));
    }
    return onExpired(() => setSession({ status: 'signedOut' }));
  }, []);

  const refreshCounts = useCallback(() => {
    api
      .get<Overview>('/api/v1/admin/overview')
      .then((o) => setCounts({ pendingVerifications: o.pendingVerifications, openReports: o.openReports }))
      .catch(() => undefined);
  }, []);

  const signedIn = session.status === 'signedIn';
  useEffect(() => {
    if (signedIn) refreshCounts();
  }, [refreshCounts, signedIn]);

  const value = useMemo<AdminContextValue>(
    () => ({
      session,
      signIn: async (email, password) => {
        const me = await apiSignIn(email, password);
        setSession({ status: 'signedIn', me });
      },
      signOut: async () => {
        await apiSignOut();
        setSession({ status: 'signedOut' });
      },
      ...counts,
      refreshCounts,
      toast,
      notify: (text) => setToast({ id: Date.now(), text }),
    }),
    [counts, refreshCounts, session, toast],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

/** GET a path and keep the result; `reload` after a change. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({ path: null, data: null, error: null });
  const load = useCallback(
    () =>
      path
        ? api
            .get<T>(path)
            .then((data) => setState({ path, data, error: null }))
            .catch((e: Error) => setState({ path, data: null, error: e.message }))
        : Promise.resolve(),
    [path],
  );
  useEffect(() => {
    load();
  }, [load]);
  const current = state.path === path ? state : { data: null, error: null };
  return { data: current.data, error: current.error, loading: path !== null && state.path !== path, reload: load };
}
