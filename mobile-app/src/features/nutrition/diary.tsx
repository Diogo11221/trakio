import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { ClientProfile } from '@/features/auth/types';
import { foods, itemFrom, totals, type FoodItem } from '@/features/nutrition/foods';
import { ageFrom } from '@/features/tools/data';
import { caloriesForGoal, dailyCalories, macrosFor } from '@/features/tools/calc';
import { accountKey, dayKey, isRecord, usePersistentState } from '@/lib/persist';
import { useAuth } from '@/state/auth';

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const slots: { id: MealSlot; name: string }[] = [
  { id: 'breakfast', name: 'Pequeno-almoço' },
  { id: 'lunch', name: 'Almoço' },
  { id: 'snack', name: 'Lanche' },
  { id: 'dinner', name: 'Jantar' },
];

export type MealEntry = {
  id: string;
  slot: MealSlot;
  time: string;
  items: FoodItem[];
  source: 'manual' | 'ai';
  photoUri: string | null;
};

type Diary = Record<string, MealEntry[]>;

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

/** Slot for "now": breakfast until 11h, lunch until 16h, snack until 19h, then dinner. */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
}

export function mealTotals(meals: MealEntry[]): Totals {
  return meals.reduce<Totals>(
    (sum, m) => {
      const t = totals(m.items);
      return { kcal: sum.kcal + t.kcal, protein: sum.protein + t.protein, carbs: sum.carbs + t.carbs, fat: sum.fat + t.fat };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Daily targets from the profile (same maths as the "Calorias por dia" tool). */
export function goalsFor(profile: ClientProfile): Totals {
  const maintenance = dailyCalories(profile.sex, profile.weightKg, profile.heightCm, ageFrom(profile.birthYear), profile.activity);
  const kcal = caloriesForGoal(maintenance, profile.goal);
  return { kcal, ...macrosFor(kcal, profile.weightKg, profile.goal) };
}

export function summary(items: FoodItem[]): string {
  return items.map((i) => i.name).join(', ');
}

function parseDiary(raw: unknown): Diary | null {
  if (!isRecord(raw)) return null;
  const diary: Diary = {};
  for (const [day, meals] of Object.entries(raw)) if (Array.isArray(meals)) diary[day] = meals as MealEntry[];
  return diary;
}

function food(id: string) {
  const found = foods.find((x) => x.id === id);
  if (!found) throw new Error(`Unknown food ${id}`);
  return found;
}

/** Breakfast and lunch already logged today, and a full yesterday — the Figma "Nutrição" screen. */
function demoDiary(): Diary {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const meal = (id: string, slot: MealSlot, time: string, items: FoodItem[], source: MealEntry['source'] = 'manual'): MealEntry => ({
    id,
    slot,
    time,
    items,
    source,
    photoUri: null,
  });
  return {
    [dayKey(today)]: [
      meal('d1', 'breakfast', '08:10', [itemFrom(food('aveia'), 60), itemFrom(food('iogurte-grego'), 170), itemFrom(food('banana'), 120)]),
      meal('d2', 'lunch', '13:02', [itemFrom(food('frango'), 160), itemFrom(food('arroz'), 150), itemFrom(food('salada'), 80), itemFrom(food('azeite'), 5)], 'ai'),
    ],
    [dayKey(yesterday)]: [
      meal('y1', 'breakfast', '08:30', [itemFrom(food('ovo'), 110), itemFrom(food('pao'), 60), itemFrom(food('queijo-fresco'), 60)]),
      meal('y2', 'lunch', '13:15', [itemFrom(food('salmao'), 150), itemFrom(food('batata'), 200), itemFrom(food('salada'), 100)]),
      meal('y3', 'snack', '17:00', [itemFrom(food('skyr'), 150), itemFrom(food('frutos-secos'), 25)]),
      meal('y4', 'dinner', '20:40', [itemFrom(food('vaca'), 160), itemFrom(food('massa'), 180), itemFrom(food('azeite'), 10)]),
    ],
  };
}

type DiaryContextValue = {
  mealsOn: (day: string) => MealEntry[];
  addMeal: (day: string, meal: MealEntry) => void;
  removeMeal: (day: string, mealId: string) => void;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const demo = account?.id === 'demo-miguel';
  const [diary, setDiary] = usePersistentState(accountKey(account?.id, 'diary'), () => (demo ? demoDiary() : {}), parseDiary);

  const value = useMemo<DiaryContextValue>(
    () => ({
      mealsOn: (day) => [...(diary[day] ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
      addMeal: (day, meal) => setDiary((d) => ({ ...d, [day]: [...(d[day] ?? []), meal] })),
      removeMeal: (day, mealId) => setDiary((d) => ({ ...d, [day]: (d[day] ?? []).filter((m) => m.id !== mealId) })),
    }),
    [diary, setDiary],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be used inside <DiaryProvider>');
  return ctx;
}
