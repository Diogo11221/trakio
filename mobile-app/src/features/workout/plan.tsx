import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { groupLabels, type ExerciseTemplate, type PlanTemplate } from '@/features/workout/data';
import { api } from '@/lib/api';
import type { ExerciseDto, MyPlanDto, Page, PlanDayDto } from '@/lib/apiTypes';
import { useRemote } from '@/lib/useRemote';
import { useAuth } from '@/state/auth';

/** Loads for exercises the plan gives no reference load for (scaled by experience like the rest). */
const DEFAULT_KG: Record<string, number> = { Peito: 30, Costas: 30, Pernas: 40, Ombros: 10, Braços: 12, Core: 0 };

function estimatedMinutes(exercises: ExerciseTemplate[]): number {
  const seconds = exercises.reduce((sum, e) => sum + e.sets * (45 + e.restSeconds), 0);
  return Math.max(10, Math.round(seconds / 60 / 5) * 5);
}

export function dayToTemplate(day: PlanDayDto): PlanTemplate {
  const exercises: ExerciseTemplate[] = day.exercises.map((e) => {
    const group = groupLabels[e.group] ?? 'Core';
    return {
      id: e.exercise,
      name: e.name,
      group,
      sets: e.sets,
      reps: e.repsMin,
      repsMax: e.repsMax,
      kg: e.referenceKg ?? DEFAULT_KG[group] ?? 20,
      restSeconds: e.restSeconds,
      note: e.note,
    };
  });
  return {
    id: day.id,
    title: day.label,
    focus: day.focus,
    muscles: [...new Set(exercises.map((e) => e.group))],
    estimatedMinutes: estimatedMinutes(exercises),
    exercises,
  };
}

type PlanContextValue = {
  loaded: boolean;
  /** Server id of the plan (sent with finished workouts). */
  planId: string | null;
  planName: string;
  workoutsPerWeek: number;
  /** Days of the plan, in order (Treino A, B, C…). */
  planTemplates: PlanTemplate[];
  /** The day after the last one done. */
  nextPlanId: string | null;
  /** Every exercise in the library — for "Treino livre". */
  exerciseLibrary: ExerciseTemplate[];
  templateFor: (id: string) => PlanTemplate | undefined;
  reload: () => Promise<void>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const isClient = account?.role === 'client' && account.profile !== null;
  const fetcher = useCallback(async () => {
    const [plan, exercises] = await Promise.all([
      api.get<MyPlanDto>('/api/v1/me/plan'),
      api.get<Page<ExerciseDto>>('/api/v1/exercises?size=100'),
    ]);
    const library: ExerciseTemplate[] = exercises.content.map((e) => {
      const group = groupLabels[e.group] ?? 'Core';
      return { id: e.slug, name: e.name, group, sets: 3, reps: 10, kg: DEFAULT_KG[group] ?? 20, restSeconds: 90 };
    });
    return { plan, library };
  }, []);
  const { data, reload } = useRemote(isClient ? account.id : null, isClient ? fetcher : null);
  const plan = data?.plan ?? null;
  const library = useMemo(() => data?.library ?? [], [data]);

  const value = useMemo<PlanContextValue>(() => {
    const templates = plan?.plan.days.map(dayToTemplate) ?? [];
    return {
      loaded: plan !== null,
      planId: plan?.plan.id ?? null,
      planName: plan?.plan.name ?? '',
      workoutsPerWeek: plan?.plan.workoutsPerWeek ?? 3,
      planTemplates: templates,
      nextPlanId: plan?.nextDayId ?? templates[0]?.id ?? null,
      exerciseLibrary: library,
      templateFor: (id) => templates.find((t) => t.id === id),
      reload,
    };
  }, [library, plan, reload]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside <PlanProvider>');
  return ctx;
}
