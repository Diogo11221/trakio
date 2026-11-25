/** Mock plan until backend-core exposes workouts — values match the Figma screens. */

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

function sets(count: number, kg: number, reps: number, previous: [number, number][] = []): SetEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    kg,
    reps,
    previous: previous[i] ? { kg: previous[i][0], reps: previous[i][1] } : null,
    done: false,
  }));
}

export function createTodayWorkout(): WorkoutPlan {
  return {
    id: 'treino-a',
    title: 'Treino A',
    focus: 'Peito',
    estimatedMinutes: 55,
    exercises: [
      {
        id: 'supino-plano',
        name: 'Supino plano',
        prescription: '4 séries de 8 repetições',
        short: '4 × 8',
        restSeconds: 120,
        sets: sets(4, 85, 8, [[82.5, 8], [82.5, 8], [85, 7], [85, 6]]),
        status: 'current',
      },
      {
        id: 'supino-inclinado',
        name: 'Supino inclinado',
        prescription: '4 séries de 8 a 10 repetições',
        short: '4 × 8',
        restSeconds: 120,
        sets: [
          { kg: 80, reps: 8, previous: { kg: 77.5, reps: 8 }, done: false },
          { kg: 82.5, reps: 8, previous: { kg: 80, reps: 8 }, done: false },
          { kg: 82.5, reps: 8, previous: { kg: 80, reps: 7 }, done: false },
          { kg: 82.5, reps: 8, previous: { kg: 80, reps: 7 }, done: false },
        ],
        status: 'pending',
      },
      {
        id: 'crucifixo-polia',
        name: 'Crucifixo na polia',
        prescription: '3 séries de 12 repetições',
        short: '3 × 12',
        restSeconds: 90,
        sets: sets(3, 17.5, 12, [[15, 12], [15, 12], [15, 11]]),
        status: 'pending',
      },
      {
        id: 'peck-deck',
        name: 'Peck deck',
        prescription: '3 séries de 12 repetições',
        short: '3 × 12',
        restSeconds: 90,
        sets: sets(3, 45, 12, [[42.5, 12], [42.5, 12], [42.5, 10]]),
        status: 'pending',
      },
      {
        id: 'elevacoes-laterais',
        name: 'Elevações laterais',
        prescription: '4 séries de 15 repetições',
        short: '4 × 15',
        restSeconds: 60,
        sets: sets(4, 10, 15, [[10, 15], [10, 14], [10, 12], [8, 15]]),
        status: 'pending',
      },
      {
        id: 'triceps-corda',
        name: 'Tríceps na corda',
        prescription: '3 séries de 12 repetições',
        short: '3 × 12',
        restSeconds: 60,
        sets: sets(3, 25, 12, [[22.5, 12], [22.5, 12], [22.5, 10]]),
        status: 'pending',
      },
    ],
  };
}

export const weekPlan = [
  { id: 'treino-a', title: 'Treino A · Peito', when: 'Hoje', exercises: 6, minutes: 55, today: true },
  { id: 'treino-b', title: 'Treino B · Costas', when: 'Quinta', exercises: 6, minutes: 50, today: false },
  { id: 'treino-c', title: 'Treino C · Pernas', when: 'Sábado', exercises: 7, minutes: 60, today: false },
] as const;

export const recentWorkouts = [
  { id: 'c-22', title: 'Treino C · Pernas', when: 'Segunda, 22 nov', minutes: 62, records: 1 },
  { id: 'b-20', title: 'Treino B · Costas', when: 'Sábado, 20 nov', minutes: 48, records: 0 },
] as const;
