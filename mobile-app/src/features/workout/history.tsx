import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { oneRepMax } from '@/features/tools/calc';
import { planTemplates, rackRound, templateFor, type PlanId, type WorkoutPlan } from '@/features/workout/data';
import { accountKey, isArrayOf, isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';

export type Feeling = 'easy' | 'good' | 'hard' | 'max';

export type SessionSet = { kg: number; reps: number };

export type Session = {
  id: string;
  /** Template id, or "livre" for a free workout. */
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

function isSession(raw: unknown): boolean {
  return isRecord(raw) && typeof raw.id === 'string' && typeof raw.finishedAt === 'number' && Array.isArray(raw.exercises);
}

export function parseSessions(raw: unknown): Session[] | null {
  return isArrayOf<Session>(raw, isSession) ? raw : null;
}

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

/** The plan after the last one done (A → B → C → A). */
export function nextPlanId(sessions: Session[]): PlanId {
  const last = sessions.find((s) => templateFor(s.planId));
  if (!last) return 'treino-a';
  const index = planTemplates.findIndex((p) => p.id === last.planId);
  return planTemplates[(index + 1) % planTemplates.length]!.id;
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

const DAY_MS = 24 * 3600 * 1000;

/**
 * Readiness from training load until the watch data (HealthKit) is wired:
 * rest days push it up, a hard session yesterday pulls it down.
 */
export function readinessFrom(sessions: Session[], now: number): { value: number; note: string } {
  const last = sessions[0];
  if (!last) return { value: 85, note: 'Ainda sem treinos · começa com calma' };
  const daysSince = Math.floor((now - last.finishedAt) / DAY_MS);
  let value = 80;
  if (last.feeling === 'max') value -= 16;
  else if (last.feeling === 'hard') value -= 8;
  if (daysSince === 0) value -= 12;
  else if (daysSince === 1) value -= 4;
  else if (daysSince >= 3) value += 6;
  const recent = sessions.filter((s) => now - s.finishedAt < 7 * DAY_MS).length;
  if (recent >= 5) value -= 8;
  value = Math.max(30, Math.min(98, value));
  const when = daysSince === 0 ? 'Treinaste hoje' : daysSince === 1 ? 'Último treino ontem' : `Último treino há ${daysSince} dias`;
  const verdict = value >= 75 ? 'pronto para carga' : value >= 55 ? 'treina sem forçar' : 'dia para descansar';
  return { value, note: `${when} · ${verdict}` };
}


// ── Demo history ────────────────────────────────────────────────────────────

/** Eight weeks of A/B/C for the demo client, ending two days ago so "Treino A" is next. */
function demoSessions(): Session[] {
  const sessions: Session[] = [];
  const day = 24 * 3600 * 1000;
  const now = Date.now();
  const count = 24;
  for (let i = 0; i < count; i++) {
    // i = 0 is the most recent (Treino C, two days ago).
    const template = planTemplates[(2 - (i % 3) + 3) % 3]!;
    const daysAgo = 2 + Math.round(i * 2.34);
    const date = new Date(now - daysAgo * day);
    date.setHours(19, 0, 0, 0);
    const finishedAt = date.getTime();
    const progress = 1 - i * 0.006; // ~0,6 % stronger per session
    const exercises = template.exercises.map((t) => {
      // Peso morto romeno stalls for the last three weeks (shows "sem evolução").
      const stalled = t.id === 'peso-morto-romeno' && i < 9;
      const kg = rackRound(t.kg * (stalled ? 1 - 9 * 0.006 : progress));
      return {
        id: t.id,
        name: t.name,
        sets: Array.from({ length: t.sets }, (_, s) => ({ kg, reps: Math.max(1, t.reps - (s === t.sets - 1 && i % 2 === 0 ? 1 : 0)) })),
      };
    });
    const volume = exercises.reduce((sum, e) => sum + e.sets.reduce((v, s) => v + s.kg * s.reps, 0), 0);
    sessions.push({
      id: `demo-${i}`,
      planId: template.id,
      title: template.title,
      focus: template.focus,
      startedAt: finishedAt - template.estimatedMinutes * 60000,
      finishedAt,
      volume,
      sets: exercises.reduce((n, e) => n + e.sets.length, 0),
      feeling: i % 4 === 0 ? 'hard' : 'good',
      records: i === 0 ? ['Agachamento'] : [],
      exercises,
    });
  }
  return sessions;
}

// ── Provider ────────────────────────────────────────────────────────────────

type HistoryContextValue = {
  sessions: Session[];
  /** Saves a finished workout and works out which exercises set a record. */
  addSession: (session: Omit<Session, 'records'>) => Session;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const demo = account?.id === 'demo-miguel';
  const [sessions, setSessions] = usePersistentState(
    accountKey(account?.id, 'history'),
    () => (demo ? demoSessions() : []),
    parseSessions,
  );

  const value = useMemo<HistoryContextValue>(
    () => ({
      sessions,
      addSession: (draft) => {
        const records = recordsIn(sessions, draft.exercises).map((r) => r.name);
        const session: Session = { ...draft, records };
        setSessions((list) => [session, ...list]);
        return session;
      },
    }),
    [sessions, setSessions],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used inside <HistoryProvider>');
  return ctx;
}
