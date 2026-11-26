import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { oneRepMax } from '@/features/tools/calc';
import type { WorkoutPlan } from '@/features/workout/data';
import { api } from '@/lib/api';
import type { Page, SessionDto } from '@/lib/apiTypes';
import { useRemote } from '@/lib/useRemote';
import { useAuth } from '@/state/auth';

export type Feeling = 'easy' | 'good' | 'hard' | 'max';

export type SessionSet = { kg: number; reps: number };

export type Session = {
  /** Server id (also what a workout card in the chat points to). */
  id: string;
  /** Plan day id, or "livre" for a free workout. */
  planId: string;
  title: string;
  focus: string;
  startedAt: number;
  finishedAt: number;
  volume: number;
  sets: number;
  feeling: Feeling | null;
  /** Exercises where this session beat the previous best estimated max. */
  records: string[];
  exercises: { id: string; name: string; sets: SessionSet[] }[];
};

// ── Queries ─────────────────────────────────────────────────────────────────

/** Best estimated one-rep max of an exercise in one session (0 if absent). */
export function sessionBest(session: Session, exerciseId: string): number {
  const exercise = session.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return 0;
  return Math.max(0, ...exercise.sets.map((s) => oneRepMax(s.kg, s.reps)));
}

/** Sets done last time for this exercise (newest session first). */
export function lastSets(sessions: Session[], exerciseId: string): SessionSet[] | null {
  for (const session of sessions) {
    const exercise = session.exercises.find((e) => e.id === exerciseId);
    if (exercise && exercise.sets.length > 0) return exercise.sets;
  }
  return null;
}

/** Monday 00:00 of the current week. */
export function startOfWeek(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Estimated max over time for one exercise, oldest first. */
export function maxSeries(sessions: Session[], exerciseId: string, since: number): { at: number; kg: number }[] {
  return sessions
    .filter((s) => s.finishedAt >= since)
    .map((s) => ({ at: s.finishedAt, kg: sessionBest(s, exerciseId) }))
    .filter((p) => p.kg > 0)
    .reverse();
}

/** Exercises in `exercises` that beat the best estimated max in `sessions`. */
export function recordsIn(sessions: Session[], exercises: Session['exercises']): { name: string; kg: number; reps: number; max: number }[] {
  const records: { name: string; kg: number; reps: number; max: number }[] = [];
  for (const e of exercises) {
    const best = Math.max(0, ...sessions.map((s) => sessionBest(s, e.id)));
    let top: SessionSet | null = null;
    let max = 0;
    for (const s of e.sets) {
      const m = oneRepMax(s.kg, s.reps);
      if (m > max) {
        max = m;
        top = s;
      }
    }
    if (top && best > 0 && max > best + 0.01) records.push({ name: e.name, kg: top.kg, reps: top.reps, max });
  }
  return records;
}

/** A finished live workout as a history entry (only the sets actually done). */
export function sessionFromWorkout(
  plan: WorkoutPlan,
  startedAt: number,
  finishedAt: number,
  feeling: Feeling | null,
): Omit<Session, 'records'> {
  const exercises = plan.exercises
    .map((e) => ({ id: e.id, name: e.name, sets: e.sets.filter((s) => s.done).map((s) => ({ kg: s.kg, reps: s.reps })) }))
    .filter((e) => e.sets.length > 0);
  return {
    id: `s-${finishedAt.toString(36)}`,
    planId: plan.id,
    title: plan.title,
    focus: plan.focus,
    startedAt,
    finishedAt,
    volume: exercises.reduce((sum, e) => sum + e.sets.reduce((v, s) => v + s.kg * s.reps, 0), 0),
    sets: exercises.reduce((n, e) => n + e.sets.length, 0),
    feeling,
    exercises,
  };
}

// ── Provider ────────────────────────────────────────────────────────────────

function fromDto(dto: SessionDto): Session {
  return {
    id: dto.id,
    planId: dto.planDayId ?? 'livre',
    title: dto.title,
    focus: dto.focus,
    startedAt: Date.parse(dto.startedAt),
    finishedAt: Date.parse(dto.finishedAt),
    volume: dto.volumeKg,
    sets: dto.sets,
    feeling: dto.feeling,
    records: dto.records,
    exercises: dto.exercises.map((e) => ({ id: e.exercise, name: e.name, sets: e.sets })),
  };
}

type HistoryContextValue = {
  sessions: Session[];
  loaded: boolean;
  /**
   * Saves a finished workout on the server, which works out volume and records. Retrying the
   * same workout (same start time) never saves it twice.
   */
  addSession: (session: Omit<Session, 'records'>, serverPlanId: string | null) => Promise<Session>;
  reload: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const isClient = account?.role === 'client' && account.profile !== null;
  const fetcher = useCallback(
    () => api.get<Page<SessionDto>>('/api/v1/me/workouts?size=100').then((page) => page.content.map(fromDto)),
    [],
  );
  const { data, reload, update } = useRemote(isClient ? account.id : null, isClient ? fetcher : null);

  const value = useMemo<HistoryContextValue>(
    () => ({
      sessions: data ?? [],
      loaded: data !== null,
      reload,
      addSession: async (draft, serverPlanId) => {
        const fromPlan = draft.planId !== 'livre';
        const saved = await api.post<SessionDto>('/api/v1/me/workouts', {
          clientRef: `w-${draft.startedAt}`,
          planId: fromPlan ? serverPlanId : null,
          planDayId: fromPlan ? draft.planId : null,
          title: draft.title,
          focus: draft.focus,
          startedAt: new Date(draft.startedAt).toISOString(),
          finishedAt: new Date(draft.finishedAt).toISOString(),
          feeling: draft.feeling,
          exercises: draft.exercises.map((e) => ({ exercise: e.id, sets: e.sets })),
        });
        const session = fromDto(saved);
        update((sessions) => [session, ...sessions.filter((x) => x.id !== session.id)]);
        return session;
      },
    }),
    [data, reload, update],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used inside <HistoryProvider>');
  return ctx;
}
