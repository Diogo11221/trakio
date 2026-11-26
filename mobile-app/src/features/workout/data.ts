/**
 * Live-workout types and how a workout is built from a plan day. The plan itself comes from
 * backend-core (features/workout/plan.tsx); what the athlete lifts is saved in the history.
 */

export type SetEntry = {
  /** Weight in kg and reps for this set. */
  kg: number;
  reps: number;
  /** What the athlete did last time on this set, for reference. */
  previous: { kg: number; reps: number } | null;
  done: boolean;
};

export type ExerciseStatus = 'pending' | 'current' | 'postponed' | 'done';

export type Exercise = {
  id: string;
  name: string;
  /** Plain-language prescription, e.g. "4 séries de 8 a 10 repetições". */
  prescription: string;
  /** Short form for lists: "3 × 12". */
  short: string;
  restSeconds: number;
  sets: SetEntry[];
  status: ExerciseStatus;
};

export type WorkoutPlan = {
  id: string;
  title: string;
  focus: string;
  estimatedMinutes: number;
  exercises: Exercise[];
};

export type MuscleGroupLabel = 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Braços' | 'Core';

export type ExerciseTemplate = {
  /** Library slug ("supino-plano") — the same id the server uses. */
  id: string;
  name: string;
  group: MuscleGroupLabel;
  sets: number;
  reps: number;
  /** Top of the rep range when the plan gives one ("8 a 10"). */
  repsMax?: number;
  /** Reference load for an intermediate lifter (scaled by experience for new accounts). */
  kg: number;
  restSeconds: number;
  note?: string;
};

/** One workout day of the plan (Treino A, B, C…). Its id is the plan day's id on the server. */
export type PlanId = string;

export type PlanTemplate = {
  id: PlanId;
  title: string;
  focus: string;
  muscles: string[];
  estimatedMinutes: number;
  exercises: ExerciseTemplate[];
};

export const groupLabels: Record<string, MuscleGroupLabel> = {
  chest: 'Peito',
  back: 'Costas',
  legs: 'Pernas',
  shoulders: 'Ombros',
  arms: 'Braços',
  core: 'Core',
};

export function prescription(sets: number, reps: number, repsMax?: number): { long: string; short: string } {
  const range = repsMax && repsMax > reps ? `${reps} a ${repsMax}` : String(reps);
  return { long: `${sets} séries de ${range} repetições`, short: `${sets} × ${repsMax && repsMax > reps ? `${reps}–${repsMax}` : reps}` };
}

/** Loads rounded to what's on a rack (2,5 kg; 1,25 kg under 20 kg). */
export function rackRound(kg: number): number {
  const step = kg < 20 ? 1.25 : 2.5;
  return Math.max(step, Math.round(kg / step) * step);
}

/**
 * The live workout for a set of exercise templates. Each set starts from what
 * was done last time (shown as "anterior"); without history it starts from
 * the template load × `scale` (experience).
 */
export function buildWorkout(
  meta: { id: string; title: string; focus: string; estimatedMinutes: number },
  templates: ExerciseTemplate[],
  last: (exerciseId: string) => { kg: number; reps: number }[] | null,
  scale: number,
): WorkoutPlan {
  return {
    ...meta,
    exercises: templates.map((t, i) => {
      const previous = last(t.id);
      const text = prescription(t.sets, t.reps, t.repsMax);
      return {
        id: t.id,
        name: t.name,
        prescription: text.long,
        short: text.short,
        restSeconds: t.restSeconds,
        status: i === 0 ? 'current' : 'pending',
        sets: Array.from({ length: t.sets }, (_, s) => {
          const prev = previous?.[s] ?? previous?.[previous.length - 1] ?? null;
          return {
            kg: prev ? prev.kg : rackRound(t.kg * scale),
            reps: t.reps,
            previous: prev,
            done: false,
          };
        }),
      };
    }),
  };
}
