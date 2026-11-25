/**
 * Workout templates (the PT's plan) and the live-workout types. The plan is
 * fixed until backend-core serves the PT's real plans; what the athlete
 * actually lifts is saved in the history (features/workout/history.tsx).
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

export type ExerciseTemplate = {
  id: string;
  name: string;
  group: 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Braços';
  sets: number;
  reps: number;
  /** Reference load for an intermediate lifter (scaled by experience for new accounts). */
  kg: number;
  restSeconds: number;
};

export type PlanId = 'treino-a' | 'treino-b' | 'treino-c';

export type PlanTemplate = {
  id: PlanId;
  title: string;
  focus: string;
  muscles: string[];
  estimatedMinutes: number;
  exercises: ExerciseTemplate[];
};

export const planTemplates: PlanTemplate[] = [
  {
    id: 'treino-a',
    title: 'Treino A',
    focus: 'Peito',
    muscles: ['Peito', 'Ombros', 'Tríceps'],
    estimatedMinutes: 55,
    exercises: [
      { id: 'supino-plano', name: 'Supino plano', group: 'Peito', sets: 4, reps: 8, kg: 85, restSeconds: 120 },
      { id: 'supino-inclinado', name: 'Supino inclinado', group: 'Peito', sets: 4, reps: 8, kg: 80, restSeconds: 120 },
      { id: 'crucifixo-polia', name: 'Crucifixo na polia', group: 'Peito', sets: 3, reps: 12, kg: 17.5, restSeconds: 90 },
      { id: 'peck-deck', name: 'Peck deck', group: 'Peito', sets: 3, reps: 12, kg: 45, restSeconds: 90 },
      { id: 'elevacoes-laterais', name: 'Elevações laterais', group: 'Ombros', sets: 4, reps: 15, kg: 10, restSeconds: 60 },
      { id: 'triceps-corda', name: 'Tríceps na corda', group: 'Braços', sets: 3, reps: 12, kg: 25, restSeconds: 60 },
    ],
  },
  {
    id: 'treino-b',
    title: 'Treino B',
    focus: 'Costas',
    muscles: ['Costas', 'Bíceps', 'Ombros'],
    estimatedMinutes: 50,
    exercises: [
      { id: 'puxada-frente', name: 'Puxada à frente', group: 'Costas', sets: 4, reps: 10, kg: 60, restSeconds: 90 },
      { id: 'remada-curvada', name: 'Remada curvada', group: 'Costas', sets: 4, reps: 8, kg: 70, restSeconds: 120 },
      { id: 'remada-sentado', name: 'Remada sentado', group: 'Costas', sets: 3, reps: 12, kg: 55, restSeconds: 90 },
      { id: 'pullover-polia', name: 'Pullover na polia', group: 'Costas', sets: 3, reps: 12, kg: 25, restSeconds: 60 },
      { id: 'rosca-direta', name: 'Rosca direta', group: 'Braços', sets: 3, reps: 10, kg: 30, restSeconds: 60 },
      { id: 'face-pull', name: 'Face pull', group: 'Ombros', sets: 3, reps: 15, kg: 20, restSeconds: 60 },
    ],
  },
  {
    id: 'treino-c',
    title: 'Treino C',
    focus: 'Pernas',
    muscles: ['Quadríceps', 'Glúteos', 'Posteriores'],
    estimatedMinutes: 60,
    exercises: [
      { id: 'agachamento', name: 'Agachamento', group: 'Pernas', sets: 4, reps: 6, kg: 120, restSeconds: 150 },
      { id: 'leg-press', name: 'Leg press', group: 'Pernas', sets: 4, reps: 10, kg: 200, restSeconds: 120 },
      { id: 'peso-morto-romeno', name: 'Peso morto romeno', group: 'Pernas', sets: 3, reps: 8, kg: 100, restSeconds: 120 },
      { id: 'extensao-pernas', name: 'Extensão de pernas', group: 'Pernas', sets: 3, reps: 12, kg: 50, restSeconds: 60 },
      { id: 'curl-femoral', name: 'Curl femoral', group: 'Pernas', sets: 3, reps: 12, kg: 40, restSeconds: 60 },
      { id: 'hip-thrust', name: 'Hip thrust', group: 'Pernas', sets: 3, reps: 10, kg: 100, restSeconds: 90 },
      { id: 'gemeos-pe', name: 'Gémeos em pé', group: 'Pernas', sets: 4, reps: 15, kg: 60, restSeconds: 60 },
    ],
  },
];

/** Every exercise in the plans — the list for "Treino livre". */
export const exerciseLibrary: ExerciseTemplate[] = planTemplates.flatMap((p) => p.exercises);

export function templateFor(id: string): PlanTemplate | undefined {
  return planTemplates.find((p) => p.id === id);
}

export function prescription(sets: number, reps: number): { long: string; short: string } {
  return { long: `${sets} séries de ${reps} repetições`, short: `${sets} × ${reps}` };
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
      const text = prescription(t.sets, t.reps);
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
