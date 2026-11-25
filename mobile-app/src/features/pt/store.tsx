import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { Person } from '@/components/Portrait';
import {
  conversations as initialConversations,
  myPlans as initialPlans,
  verificationSteps as initialSteps,
  type ChatMessage,
  type Conversation,
  type PlanDay,
  type PlanSummary,
  type VerificationStep,
} from '@/features/pt/data';
import { accountKey, isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';
import { unreadFor, useChat } from '@/state/chat';

type AiDecision = 'applied' | 'ignored';

/** What the PT changes in the app — saved on the phone per account. */
type TrainerState = {
  marketplaceActive: boolean;
  aiDecisions: Partial<Record<Person, AiDecision>>;
  plans: PlanSummary[];
  steps: VerificationStep[];
  verificationSent: boolean;
  /** Edited plan days, by plan id or "student:<id>" for a student's own plan. */
  planDays: Record<string, PlanDay[]>;
};

type TrainerContextValue = TrainerState & {
  /** Conversations with students, newest first (messages live in the shared chat store). */
  conversations: Conversation[];
  sendMessage: (conversationId: Person, message: ChatMessage) => void;
  markRead: (conversationId: Person) => void;
  setMarketplaceActive: (active: boolean) => void;
  decideAi: (student: Person, decision: AiDecision) => void;
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

  const conversations = useMemo<Conversation[]>(
    () =>
      initialConversations
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
    [threads],
  );

  const value = useMemo<TrainerContextValue>(
    () => ({
      ...state,
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
    [conversations, markRead, send, setState, state],
  );

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): TrainerContextValue {
  const ctx = useContext(TrainerContext);
  if (!ctx) throw new Error('useTrainer must be used inside <TrainerProvider>');
  return ctx;
}
