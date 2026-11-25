import type { Person } from '@/components/Portrait';
import type { ClientProfile } from '@/features/auth/types';
import { formatThousands } from '@/lib/format';

import {
  bandFor,
  bmi,
  bmiBands,
  bodyFatPercent,
  caloriesForGoal,
  dailyCalories,
  dailyWater,
  decimal,
  oneRepMax,
  platesPerSide,
  roundTo,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '@/features/tools/calc';

export type ToolId = 'body-mass' | 'calories' | 'max-lift' | 'body-fat' | 'water' | 'plates';

export const toolIds: ToolId[] = ['body-mass', 'calories', 'max-lift', 'body-fat', 'water', 'plates'];

export const toolInfo: Record<ToolId, { title: string; short: string; description: string }> = {
  'body-mass': {
    title: 'Índice de massa corporal',
    short: 'Massa corporal',
    description: 'Relação entre o peso e a altura, e o intervalo de peso saudável.',
  },
  calories: {
    title: 'Calorias por dia',
    short: 'Calorias por dia',
    description: 'Quanto gastas num dia e quanto comer para o teu objetivo, com proteína, hidratos e gordura.',
  },
  'max-lift': {
    title: 'Peso máximo numa repetição',
    short: 'Peso máximo',
    description: 'A partir de uma série que fizeste, quanto conseguirias levantar uma vez — e o peso para cada número de repetições.',
  },
  'body-fat': {
    title: 'Percentagem de gordura',
    short: 'Gordura corporal',
    description: 'Estimativa com fita métrica: cintura, pescoço e, nas mulheres, anca.',
  },
  water: {
    title: 'Água por dia',
    short: 'Água por dia',
    description: 'Quanta água beber, a contar com o treino do dia.',
  },
  plates: {
    title: 'Discos na barra',
    short: 'Discos na barra',
    description: 'Que discos pôr de cada lado para chegar ao peso que queres.',
  },
};

export function isToolId(value: string | undefined): value is ToolId {
  return toolIds.includes(value as ToolId);
}

/** Measurements the calculators start from — edited freely on each screen. */
export type BodyData = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm: number;
  activity: ActivityLevel;
  goal: Goal;
  trainingMinutes: number;
  lift: { exercise: string; weightKg: number; reps: number };
};

/** The signed-in client (Miguel) — mock until backend-core has a profile API. */
export const clientBody: BodyData = {
  sex: 'male',
  age: 29,
  weightKg: 78.4,
  heightCm: 178,
  waistCm: 84,
  neckCm: 38,
  hipCm: 96,
  activity: 'moderate',
  goal: 'gain',
  trainingMinutes: 60,
  lift: { exercise: 'Supino plano', weightKg: 85, reps: 6 },
};

/** Last measurements the PT recorded for each student. */
export const studentBodies: Partial<Record<Person, BodyData>> = {
  miguel: clientBody,
  ana: {
    sex: 'female',
    age: 34,
    weightKg: 64,
    heightCm: 165,
    waistCm: 74,
    neckCm: 32,
    hipCm: 99,
    activity: 'light',
    goal: 'lose',
    trainingMinutes: 45,
    lift: { exercise: 'Agachamento', weightKg: 50, reps: 8 },
  },
  joao: {
    sex: 'male',
    age: 41,
    weightKg: 91.5,
    heightCm: 182,
    waistCm: 97,
    neckCm: 41,
    hipCm: 104,
    activity: 'moderate',
    goal: 'maintain',
    trainingMinutes: 75,
    lift: { exercise: 'Peso morto', weightKg: 140, reps: 5 },
  },
  carla: {
    sex: 'female',
    age: 52,
    weightKg: 68,
    heightCm: 162,
    waistCm: 82,
    neckCm: 33,
    hipCm: 102,
    activity: 'light',
    goal: 'maintain',
    trainingMinutes: 40,
    lift: { exercise: 'Leg press', weightKg: 70, reps: 10 },
  },
  pedro: {
    sex: 'male',
    age: 37,
    weightKg: 84,
    heightCm: 176,
    waistCm: 92,
    neckCm: 39,
    hipCm: 101,
    activity: 'light',
    goal: 'maintain',
    trainingMinutes: 40,
    lift: { exercise: 'Remada sentado', weightKg: 55, reps: 10 },
  },
  sofia: {
    sex: 'female',
    age: 26,
    weightKg: 58,
    heightCm: 168,
    waistCm: 66,
    neckCm: 31,
    hipCm: 94,
    activity: 'moderate',
    goal: 'gain',
    trainingMinutes: 60,
    lift: { exercise: 'Hip thrust', weightKg: 80, reps: 8 },
  },
  tomas: {
    sex: 'male',
    age: 23,
    weightKg: 72,
    heightCm: 181,
    waistCm: 78,
    neckCm: 37,
    hipCm: 92,
    activity: 'high',
    goal: 'gain',
    trainingMinutes: 75,
    lift: { exercise: 'Agachamento', weightKg: 100, reps: 5 },
  },
};

/** Short live value shown on each tool tile, e.g. "24,7". */
export function toolPreview(tool: ToolId, body: BodyData): { value: string; unit: string; note: string } {
  switch (tool) {
    case 'body-mass': {
      const value = bmi(body.weightKg, body.heightCm);
      return { value: decimal(value), unit: '', note: bandFor(value, bmiBands).band.label };
    }
    case 'calories': {
      const kcal = caloriesForGoal(dailyCalories(body.sex, body.weightKg, body.heightCm, body.age, body.activity), body.goal);
      return { value: formatThousands(kcal), unit: 'kcal', note: goalLabel[body.goal] };
    }
    case 'max-lift':
      return {
        value: decimal(roundTo(oneRepMax(body.lift.weightKg, body.lift.reps)), 1, true),
        unit: 'kg',
        note: body.lift.exercise,
      };
    case 'body-fat': {
      const fat = bodyFatPercent(body.sex, body.heightCm, body.waistCm, body.neckCm, body.hipCm);
      return { value: fat === null ? '—' : decimal(fat), unit: '%', note: 'com fita métrica' };
    }
    case 'water':
      return { value: decimal(dailyWater(body.weightKg, body.trainingMinutes)), unit: 'L', note: 'com o treino de hoje' };
    case 'plates': {
      const { plates } = platesPerSide(100, 20);
      return { value: String(plates.length), unit: 'discos', note: 'para 100 kg, por lado' };
    }
  }
}

export const goalLabel: Record<Goal, string> = {
  lose: 'Perder gordura',
  maintain: 'Manter o peso',
  gain: 'Ganhar músculo',
};

/** Age in whole years from the year of birth (close enough for the calculators). */
export function ageFrom(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

/**
 * Calculator inputs from the signed-in client's profile. Tape measurements
 * and the reference lift aren't asked in onboarding, so they start from
 * typical values the person can edit on each tool.
 */
export function bodyFromProfile(profile: ClientProfile, lastLift?: BodyData['lift'] | null): BodyData {
  const male = profile.sex === 'male';
  return {
    sex: profile.sex,
    age: ageFrom(profile.birthYear),
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    waistCm: male ? 84 : 74,
    neckCm: male ? 38 : 32,
    hipCm: male ? 96 : 99,
    activity: profile.activity,
    goal: profile.goal,
    trainingMinutes: profile.daysPerWeek > 0 ? 60 : 0,
    lift: lastLift ?? { exercise: 'Supino plano', weightKg: Math.max(20, Math.round((profile.weightKg * 0.7) / 2.5) * 2.5), reps: 8 },
  };
}
