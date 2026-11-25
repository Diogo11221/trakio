import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  exercises as initialExercises,
  payments as initialPayments,
  reports as initialReports,
  users as initialUsers,
  verificationQueue,
  type DemoStatus,
  type Exercise,
  type Payment,
  type PaymentStatus,
  type Report,
  type UserRow,
  type UserStatus,
  type VerificationRequest,
} from './mock';

export type VerificationOutcome = 'approved' | 'refused' | 'info-requested';

type AdminState = {
  verification: { request: VerificationRequest; outcome: VerificationOutcome | null; note: string }[];
  payments: Payment[];
  users: UserRow[];
  reports: { report: Report; resolution: string | null }[];
  exercises: Exercise[];
  toast: { id: number; text: string } | null;
};

type AdminContextValue = AdminState & {
  pendingVerifications: number;
  openReports: number;
  decideVerification: (id: string, outcome: VerificationOutcome) => void;
  setVerificationNote: (id: string, note: string) => void;
  setPaymentStatus: (id: string, status: PaymentStatus) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
  resolveReport: (id: string, resolution: string) => void;
  addExercise: (exercise: Omit<Exercise, 'id' | 'usedIn' | 'demo'>) => void;
  setDemoStatus: (id: string, demo: DemoStatus) => void;
  notify: (text: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>({
    verification: verificationQueue.map((request) => ({ request, outcome: null, note: '' })),
    payments: initialPayments,
    users: initialUsers,
    reports: initialReports.map((report) => ({ report, resolution: null })),
    exercises: initialExercises,
    toast: null,
  });

  const notify = useCallback((text: string) => {
    setState((s) => ({ ...s, toast: { id: Date.now(), text } }));
  }, []);

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      pendingVerifications: state.verification.filter((v) => v.outcome === null || v.outcome === 'info-requested').length,
      openReports: state.reports.filter((r) => r.resolution === null).length,
      decideVerification: (id, outcome) =>
        setState((s) => ({
          ...s,
          verification: s.verification.map((v) => (v.request.id === id ? { ...v, outcome } : v)),
          // An approved PT shows up as active in Utilizadores straight away.
          users:
            outcome === 'approved'
              ? s.users.map((u) =>
                  u.person === id ? { ...u, status: 'active', plan: 'Verificado · no marketplace' } : u,
                )
              : s.users,
        })),
      setVerificationNote: (id, note) =>
        setState((s) => ({
          ...s,
          verification: s.verification.map((v) => (v.request.id === id ? { ...v, note } : v)),
        })),
      setPaymentStatus: (id, status) =>
        setState((s) => ({ ...s, payments: s.payments.map((p) => (p.id === id ? { ...p, status } : p)) })),
      setUserStatus: (id, status) =>
        setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),
      resolveReport: (id, resolution) =>
        setState((s) => ({
          ...s,
          reports: s.reports.map((r) => (r.report.id === id ? { ...r, resolution } : r)),
        })),
      addExercise: (exercise) =>
        setState((s) => ({
          ...s,
          exercises: [{ ...exercise, id: `e-${s.exercises.length + 1}`, demo: 'todo', usedIn: 0 }, ...s.exercises],
        })),
      setDemoStatus: (id, demo) =>
        setState((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, demo } : e)) })),
      notify,
    }),
    [notify, state],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}
