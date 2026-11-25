import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { createTodayWorkout, type Exercise, type WorkoutPlan } from '@/features/workout/data';

export type RestState = {
  /** Epoch ms when the rest ends — wall-clock based so it survives the app being backgrounded. */
  endsAt: number;
  totalSeconds: number;
  /** The set that was just completed, shown above the timer. */
  exerciseId: string;
  setIndex: number;
};

export type WorkoutState = {
  plan: WorkoutPlan;
  currentId: string;
  startedAt: number | null;
  finishedAt: number | null;
  rest: RestState | null;
  feeling: 'easy' | 'good' | 'hard' | 'max' | null;
};

type Field = 'kg' | 'reps';

type Action =
  | { type: 'start'; now: number }
  | { type: 'adjust'; field: Field; delta: number }
  | { type: 'completeSet'; now: number }
  | { type: 'skipRest' }
  | { type: 'shiftRest'; seconds: number; now: number }
  | { type: 'switchTo'; exerciseId: string }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'feeling'; value: NonNullable<WorkoutState['feeling']> }
  | { type: 'reset' };

const STEP: Record<Field, number> = { kg: 2.5, reps: 1 };
const MIN_REST = 15;

function initialState(): WorkoutState {
  const plan = createTodayWorkout();
  return {
    plan,
    currentId: plan.exercises[0].id,
    startedAt: null,
    finishedAt: null,
    rest: null,
    feeling: null,
  };
}

export function activeSetIndex(exercise: Exercise): number {
  return exercise.sets.findIndex((s) => !s.done);
}

function updateExercise(plan: WorkoutPlan, id: string, update: (e: Exercise) => Exercise): WorkoutPlan {
  return { ...plan, exercises: plan.exercises.map((e) => (e.id === id ? update(e) : e)) };
}

/** Next exercise to do: first pending in plan order, then anything postponed. */
function nextExerciseId(plan: WorkoutPlan): string | null {
  const pending = plan.exercises.find((e) => e.status === 'pending');
  if (pending) return pending.id;
  const postponed = plan.exercises.find((e) => e.status === 'postponed');
  return postponed?.id ?? null;
}

function reducer(state: WorkoutState, action: Action): WorkoutState {
  switch (action.type) {
    case 'start':
      return state.startedAt ? state : { ...state, startedAt: action.now };

    case 'adjust': {
      // Adjusts the set that's up next (works both mid-set and during rest).
      const plan = updateExercise(state.plan, state.currentId, (exercise) => {
        const index = activeSetIndex(exercise);
        if (index < 0) return exercise;
        const sets = exercise.sets.map((set, i) => {
          if (i < index) return set;
          const next = Math.max(0, set[action.field] + action.delta * STEP[action.field]);
          // Changing the active set carries forward to the remaining sets.
          return { ...set, [action.field]: next };
        });
        return { ...exercise, sets };
      });
      return { ...state, plan };
    }

    case 'completeSet': {
      const exercise = state.plan.exercises.find((e) => e.id === state.currentId);
      if (!exercise) return state;
      const index = activeSetIndex(exercise);
      if (index < 0) return state;

      const finishedExercise = index === exercise.sets.length - 1;
      let plan = updateExercise(state.plan, exercise.id, (e) => ({
        ...e,
        status: finishedExercise ? 'done' : 'current',
        sets: e.sets.map((s, i) => (i === index ? { ...s, done: true } : s)),
      }));

      let currentId = state.currentId;
      if (finishedExercise) {
        const next = nextExerciseId(plan);
        if (!next) {
          return { ...state, plan, rest: null, finishedAt: action.now };
        }
        currentId = next;
        plan = updateExercise(plan, next, (e) => ({ ...e, status: 'current' }));
      }

      return {
        ...state,
        plan,
        currentId,
        rest: {
          endsAt: action.now + exercise.restSeconds * 1000,
          totalSeconds: exercise.restSeconds,
          exerciseId: exercise.id,
          setIndex: index,
        },
      };
    }

    case 'skipRest':
      return { ...state, rest: null };

    case 'shiftRest': {
      if (!state.rest) return state;
      const { now } = action;
      const remaining = Math.max(MIN_REST * 1000, state.rest.endsAt - now + action.seconds * 1000);
      return {
        ...state,
        rest: {
          ...state.rest,
          endsAt: now + remaining,
          totalSeconds: Math.max(state.rest.totalSeconds + action.seconds, MIN_REST),
        },
      };
    }

    case 'switchTo': {
      if (action.exerciseId === state.currentId) return state;
      const plan: WorkoutPlan = {
        ...state.plan,
        exercises: state.plan.exercises.map((e) => {
          if (e.id === action.exerciseId) return { ...e, status: 'current' };
          // The exercise being left is postponed — machine busy, come back later.
          if (e.id === state.currentId && e.status !== 'done') return { ...e, status: 'postponed' };
          return e;
        }),
      };
      return { ...state, plan, currentId: action.exerciseId, rest: null };
    }

    case 'reorder': {
      const exercises = [...state.plan.exercises];
      const [moved] = exercises.splice(action.from, 1);
      exercises.splice(action.to, 0, moved);
      return { ...state, plan: { ...state.plan, exercises } };
    }

    case 'feeling':
      return { ...state, feeling: action.value };

    case 'reset':
      return initialState();
  }
}

type WorkoutContextValue = {
  state: WorkoutState;
  current: Exercise;
  currentIndex: number;
  start: () => void;
  adjust: (field: Field, delta: number) => void;
  completeSet: () => void;
  skipRest: () => void;
  shiftRest: (seconds: number) => void;
  switchTo: (exerciseId: string) => void;
  reorder: (from: number, to: number) => void;
  setFeeling: (value: NonNullable<WorkoutState['feeling']>) => void;
  reset: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Actions only close over `dispatch` (stable), so they keep their identity across renders.
  const actions = useMemo(
    () => ({
      start: () => dispatch({ type: 'start', now: Date.now() }),
      adjust: (field: Field, delta: number) => dispatch({ type: 'adjust', field, delta }),
      completeSet: () => dispatch({ type: 'completeSet', now: Date.now() }),
      skipRest: () => dispatch({ type: 'skipRest' }),
      shiftRest: (seconds: number) => dispatch({ type: 'shiftRest', seconds, now: Date.now() }),
      switchTo: (exerciseId: string) => dispatch({ type: 'switchTo', exerciseId }),
      reorder: (from: number, to: number) => dispatch({ type: 'reorder', from, to }),
      setFeeling: (value: NonNullable<WorkoutState['feeling']>) => dispatch({ type: 'feeling', value }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [],
  );

  const value = useMemo<WorkoutContextValue>(() => {
    const currentIndex = state.plan.exercises.findIndex((e) => e.id === state.currentId);
    return { state, current: state.plan.exercises[currentIndex], currentIndex, ...actions };
  }, [actions, state]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside <WorkoutProvider>');
  return ctx;
}

/** Summary numbers for the "Treino concluído" screen. */
export function workoutSummary(state: WorkoutState) {
  let volume = 0;
  let sets = 0;
  for (const exercise of state.plan.exercises) {
    for (const set of exercise.sets) {
      if (!set.done) continue;
      sets += 1;
      volume += set.kg * set.reps;
    }
  }
  const minutes =
    state.startedAt && state.finishedAt ? Math.max(1, Math.round((state.finishedAt - state.startedAt) / 60000)) : 0;
  return { volume, sets, minutes };
}
