import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { planDetail, type PlanSummary, type Student } from '@/features/pt/data';
import { goalLabel } from '@/features/tools/data';
import { api, apiUrl, uploadFile } from '@/lib/api';
import type {
  AppointmentDto,
  CheckoutDto,
  DocumentType,
  EarningsDto,
  PayoutAccountDto,
  PlanSummaryDto,
  StudentDto,
  SubscriptionDto,
  SuggestionDto,
  VerificationDto,
} from '@/lib/apiTypes';
import { useRemote } from '@/lib/useRemote';
import { useAuth } from '@/state/auth';

export function toStudent(s: StudentDto): Student {
  return {
    id: s.clientId,
    name: s.name,
    firstName: s.name.trim().split(/\s+/)[0] ?? s.name,
    photoUri: s.photoUrl ? apiUrl(s.photoUrl) : null,
    goal: goalLabel[s.goal],
    week: s.week,
    weeks: s.weeks,
    adherence: s.adherence,
    tag: s.tag,
    alert: s.suggestion?.title,
    pack: s.pack,
    price: s.priceCents / 100,
    period: s.period === 'month' ? 'mês' : 'avulso',
    conversationId: s.conversationId,
    readiness: s.readiness,
    suggestion: s.suggestion,
  };
}

const toPlan = (p: PlanSummaryDto): PlanSummary => ({ id: p.id, name: p.name, detail: planDetail(p.weeks, p.workoutsPerWeek), students: p.students });

type TrainerContextValue = {
  loaded: boolean;
  students: Student[];
  plans: PlanSummary[];
  templates: PlanSummary[];
  agenda: AppointmentDto[];
  marketplace: SubscriptionDto | null;
  marketplaceActive: boolean;
  verification: VerificationDto | null;
  payouts: PayoutAccountDto | null;
  /** This month's earnings (Início, Ganhos). */
  thisMonth: EarningsDto | null;
  refresh: () => Promise<void>;
  earnings: (month: string) => Promise<EarningsDto>;
  /** Apply or ignore an AI suggestion about a student. */
  decide: (studentId: string, kind: SuggestionDto['kind'], decision: 'applied' | 'ignored', exercise?: string) => Promise<void>;
  endCoaching: (studentId: string) => Promise<void>;
  /** A new plan copied from a Trakio template (the PT edits it after). Returns its id. */
  addPlan: (templateId: string) => Promise<string>;
  deletePlan: (planId: string) => Promise<void>;
  addAppointment: (input: { clientId: string | null; startsAt: Date; durationMinutes: number; title: string; place: string; online: boolean }) => Promise<void>;
  removeAppointment: (id: string) => Promise<void>;
  /** Pays the marketplace subscription (opens Stripe in production). */
  activateMarketplace: () => Promise<void>;
  cancelMarketplace: () => Promise<void>;
  uploadDocument: (type: DocumentType, file: { uri: string; name: string; mimeType: string }) => Promise<void>;
  submitVerification: () => Promise<void>;
  /** Opens Stripe's onboarding for the PT's payout account. */
  connectPayouts: () => Promise<void>;
};

const TrainerContext = createContext<TrainerContextValue | null>(null);

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function TrainerProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const isTrainer = account?.role === 'trainer' && account.profile !== null;
  const fetcher = useCallback(async () => {
    const [s, p, t, a, m, v, pay, e] = await Promise.all([
      api.get<StudentDto[]>('/api/v1/trainer/students'),
      api.get<PlanSummaryDto[]>('/api/v1/trainer/plans'),
      api.get<PlanSummaryDto[]>('/api/v1/plans/templates'),
      api.get<AppointmentDto[]>('/api/v1/trainer/agenda'),
      api.get<SubscriptionDto>('/api/v1/trainer/marketplace'),
      api.get<VerificationDto>('/api/v1/trainer/verification'),
      api.get<PayoutAccountDto>('/api/v1/trainer/payout-account'),
      api.get<EarningsDto>(`/api/v1/trainer/earnings?month=${currentMonth()}`),
    ]);
    return {
      students: s.map(toStudent),
      plans: p.map(toPlan),
      templates: t.map(toPlan),
      agenda: a,
      marketplace: m as SubscriptionDto | null,
      verification: v as VerificationDto | null,
      payouts: pay as PayoutAccountDto | null,
      thisMonth: e as EarningsDto | null,
    };
  }, []);
  const { data, reload: refresh, update } = useRemote(isTrainer ? account.id : null, isTrainer ? fetcher : null);
  const loaded = data !== null;
  const students = data?.students ?? [];
  const plans = data?.plans ?? [];
  const templates = data?.templates ?? [];
  const agenda = data?.agenda ?? [];
  const marketplace = data?.marketplace ?? null;
  const verification = data?.verification ?? null;
  const payouts = data?.payouts ?? null;
  const thisMonth = data?.thisMonth ?? null;
  const setVerification = (v: VerificationDto) => update((d) => ({ ...d, verification: v }));

  const value = useMemo<TrainerContextValue>(
    () => ({
      loaded,
      students,
      plans,
      templates,
      agenda,
      marketplace,
      marketplaceActive: marketplace?.active ?? false,
      verification,
      payouts,
      thisMonth,
      refresh,
      earnings: (month) => api.get<EarningsDto>(`/api/v1/trainer/earnings?month=${month}`),
      decide: async (studentId, kind, decision, exercise) => {
        await api.post(`/api/v1/trainer/students/${studentId}/suggestions/${kind}`, { decision, exercise });
        await refresh();
      },
      endCoaching: async (studentId) => {
        await api.post(`/api/v1/trainer/students/${studentId}/end`);
        await refresh();
      },
      addPlan: async (templateId) => {
        const plan = await api.post<{ id: string }>(`/api/v1/trainer/plans/from-template/${templateId}`);
        await refresh();
        return plan.id;
      },
      deletePlan: async (planId) => {
        await api.delete(`/api/v1/trainer/plans/${planId}`);
        await refresh();
      },
      addAppointment: async (input) => {
        await api.post('/api/v1/trainer/agenda', { ...input, startsAt: input.startsAt.toISOString() });
        await refresh();
      },
      removeAppointment: async (id) => {
        await api.delete(`/api/v1/trainer/agenda/${id}`);
        update((d) => ({ ...d, agenda: d.agenda.filter((a) => a.id !== id) }));
      },
      activateMarketplace: async () => {
        const checkout = await api.post<CheckoutDto>('/api/v1/trainer/marketplace/checkout');
        if (checkout.status === 'pending' && checkout.url) await WebBrowser.openBrowserAsync(checkout.url);
        await refresh();
      },
      cancelMarketplace: async () => {
        await api.post('/api/v1/trainer/marketplace/cancel', { confirm: true });
        await refresh();
      },
      uploadDocument: async (type, file) => {
        const uploaded = await uploadFile(file.uri, 'verification', file.name, file.mimeType);
        setVerification(await api.put<VerificationDto>(`/api/v1/trainer/verification/documents/${type}`, { fileId: uploaded.id }));
      },
      submitVerification: async () => {
        setVerification(await api.post<VerificationDto>('/api/v1/trainer/verification/submit'));
      },
      connectPayouts: async () => {
        const link = await api.post<PayoutAccountDto>('/api/v1/trainer/payout-account/onboarding');
        if (link.onboardingUrl) await WebBrowser.openBrowserAsync(link.onboardingUrl);
        await refresh();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, refresh, update],
  );

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): TrainerContextValue {
  const ctx = useContext(TrainerContext);
  if (!ctx) throw new Error('useTrainer must be used inside <TrainerProvider>');
  return ctx;
}
