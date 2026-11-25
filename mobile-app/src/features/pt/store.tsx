import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Person } from '@/components/Portrait';
import {
  conversations as initialConversations,
  myPlans as initialPlans,
  verificationSteps as initialSteps,
  type ChatMessage,
  type Conversation,
  type PlanSummary,
  type VerificationStep,
} from '@/features/pt/data';

type AiDecision = 'applied' | 'ignored';

type TrainerState = {
  conversations: Conversation[];
  marketplaceActive: boolean;
  aiDecisions: Partial<Record<Person, AiDecision>>;
  plans: PlanSummary[];
  steps: VerificationStep[];
  verificationSent: boolean;
};

type TrainerContextValue = TrainerState & {
  sendMessage: (conversationId: Person, message: ChatMessage) => void;
  markRead: (conversationId: Person) => void;
  setMarketplaceActive: (active: boolean) => void;
  decideAi: (student: Person, decision: AiDecision) => void;
  addPlan: () => PlanSummary;
  completeStep: (stepId: string, status: string) => void;
  sendVerification: () => void;
};

const TrainerContext = createContext<TrainerContextValue | null>(null);

export function TrainerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TrainerState>({
    conversations: initialConversations,
    marketplaceActive: true,
    aiDecisions: {},
    plans: initialPlans,
    steps: initialSteps,
    verificationSent: false,
  });

  const value = useMemo<TrainerContextValue>(
    () => ({
      ...state,
      sendMessage: (conversationId, message) =>
        setState((s) => {
          const list = s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, message], time: message.time, unread: 0 } : c,
          );
          // The conversation you just wrote to moves to the top of the list.
          const sent = list.find((c) => c.id === conversationId);
          return { ...s, conversations: sent ? [sent, ...list.filter((c) => c.id !== conversationId)] : list };
        }),
      markRead: (conversationId) =>
        setState((s) => ({
          ...s,
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
        })),
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
      completeStep: (stepId, status) =>
        setState((s) => ({
          ...s,
          steps: s.steps.map((step) => (step.id === stepId ? { ...step, done: true, status } : step)),
        })),
      sendVerification: () => setState((s) => ({ ...s, verificationSent: true })),
    }),
    [state],
  );

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): TrainerContextValue {
  const ctx = useContext(TrainerContext);
  if (!ctx) throw new Error('useTrainer must be used inside <TrainerProvider>');
  return ctx;
}
