import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Person } from '@/components/Portrait';
import {
  conversations as initialConversations,
  payments as demoPayments,
  students as demoStudents,
  type Payment,
  type Student,
  myPlans as initialPlans,
  verificationSteps as initialSteps,
  type ChatMessage,
  type Conversation,
  type PlanDay,
  type PlanSummary,
  type VerificationStep,
} from '@/features/pt/data';
import { loadLocalStudents, type LocalStudent } from '@/features/pt/localStudents';
import { paymentsFor, type LedgerEntry } from '@/lib/ledger';
import { accountKey, isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';
import { unreadFor, useChat } from '@/state/chat';

type AiDecision = 'applied' | 'ignored';

/** What the PT changes in the app — saved on the phone per account. */
type TrainerState = {
  marketplaceActive: boolean;
  aiDecisions: Partial<Record<string, AiDecision>>;
  plans: PlanSummary[];
  steps: VerificationStep[];
  verificationSent: boolean;
  /** Edited plan days, by plan id or "student:<id>" for a student's own plan. */
  planDays: Record<string, PlanDay[]>;
};

type TrainerContextValue = TrainerState & {
  /** Demo roster + students who hired this PT on this phone. */
  students: (Student | LocalStudent)[];
  /** Payments this month: demo ones + hires made on this phone. */
  payments: Payment[];
  /** Hires on this phone, newest first (for "Ganhos"). */
  hires: LedgerEntry[];
  /** Received this calendar month from hires on this phone (added to the demo month). */
  hiredThisMonth: number;
  /** Re-reads students and payments (pull to refresh, coming back to a tab). */
  refresh: () => void;
  /** Conversations with students, newest first (messages live in the shared chat store). */
  conversations: Conversation[];
  sendMessage: (conversationId: string, message: ChatMessage) => void;
  markRead: (conversationId: string) => void;
  setMarketplaceActive: (active: boolean) => void;
  decideAi: (student: string, decision: AiDecision) => void;
  addPlan: () => PlanSummary;
  updatePlan: (id: string, patch: Partial<Omit<PlanSummary, 'id'>>) => void;
  savePlanDays: (key: string, days: PlanDay[]) => void;
  completeStep: (stepId: string, status: string) => void;
  sendVerification: () => void;
};

const TrainerContext = createContext<TrainerContextValue | null>(null);

function initialState(): TrainerState {
  return {
    marketplaceActive: true,
    aiDecisions: {},
    plans: initialPlans,
    steps: initialSteps,
    verificationSent: false,
    planDays: {},
  };
}

function parseState(raw: unknown): TrainerState | null {
  if (!isRecord(raw) || !Array.isArray(raw.plans) || !Array.isArray(raw.steps)) return null;
  return { ...initialState(), ...(raw as Partial<TrainerState>) };
}

export function TrainerProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const { threads, send, markRead } = useChat();
  const [state, setState] = usePersistentState(accountKey(account?.id, 'trainer'), initialState, parseState);
  const me: Person = account?.profile?.kind === 'trainer' ? (account.profile.demoPerson ?? 'rita') : 'rita';
  const [local, setLocal] = useState<LocalStudent[]>([]);
  const [hires, setHires] = useState<LedgerEntry[]>([]);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Students are other accounts on this phone: read them when the PT area opens and on refresh.
  useEffect(() => {
    let alive = true;
    const now = Date.now();
    Promise.all([loadLocalStudents(me, now), paymentsFor(me)])
      .then(([students, ledger]) => {
        if (!alive) return;
        setLocal(students);
        setHires(ledger);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [me, version, threads]);

  const students = useMemo(() => [...local, ...demoStudents], [local]);

  const conversations = useMemo<Conversation[]>(
    () =>
      [
        ...local.map<Conversation>((s) => ({
          id: s.id,
          photoUri: s.photoUri,
          name: s.name,
          subtitle: `${s.goal} · semana ${s.week} de ${s.weeks}`,
          time: '',
          unread: 0,
          messages: [],
        })),
        ...initialConversations,
      ]
        .map((c) => {
          const thread = threads[c.id];
          const messages = thread?.messages ?? c.messages;
          return {
            ...c,
            messages,
            unread: unreadFor(thread, 'trainer'),
            time: messages[messages.length - 1]?.time ?? c.time,
            updatedAt: thread?.updatedAt ?? 0,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ updatedAt: _updatedAt, ...c }) => c),
    [local, threads],
  );

  const value = useMemo<TrainerContextValue>(
    () => ({
      ...state,
      students,
      payments: [
        ...hires.map<Payment>((h) => ({
          id: h.id,
          student: h.studentId,
          photoUri: h.photoUri,
          name: h.studentName,
          pack: h.pack,
          amount: h.amount,
        })),
        ...demoPayments,
      ],
      hires,
      hiredThisMonth: hires
        .filter((h) => {
          const d = new Date(h.at);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, h) => sum + h.amount, 0),
      refresh,
      conversations,
      sendMessage: (conversationId, message) => send(conversationId, message, 'trainer'),
      markRead: (conversationId) => markRead(conversationId, 'trainer'),
      setMarketplaceActive: (marketplaceActive) => setState((s) => ({ ...s, marketplaceActive })),
      decideAi: (student, decision) =>
        setState((s) => ({ ...s, aiDecisions: { ...s.aiDecisions, [student]: decision } })),
      addPlan: () => {
        const plan: PlanSummary = {
          id: `novo-${Date.now()}`,
          name: 'Novo plano',
          detail: '4 semanas · 3 treinos por semana',
          students: 0,
        };
        setState((s) => ({ ...s, plans: [plan, ...s.plans] }));
        return plan;
      },
      updatePlan: (id, patch) =>
        setState((s) => ({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      savePlanDays: (key, days) => setState((s) => ({ ...s, planDays: { ...s.planDays, [key]: days } })),
      completeStep: (stepId, status) =>
        setState((s) => ({
          ...s,
          steps: s.steps.map((step) => (step.id === stepId ? { ...step, done: true, status } : step)),
        })),
      sendVerification: () => setState((s) => ({ ...s, verificationSent: true })),
    }),
    [conversations, hires, markRead, refresh, send, setState, state, students],
  );

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): TrainerContextValue {
  const ctx = useContext(TrainerContext);
  if (!ctx) throw new Error('useTrainer must be used inside <TrainerProvider>');
  return ctx;
}
