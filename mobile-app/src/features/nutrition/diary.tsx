import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { ClientProfile } from '@/features/auth/types';
import { totals, type FoodItem } from '@/features/nutrition/foods';
import { ageFrom } from '@/features/tools/data';
import { caloriesForGoal, dailyCalories, macrosFor } from '@/features/tools/calc';
import { api, apiUrl, uploadFile } from '@/lib/api';
import type { DayDto, MealDto } from '@/lib/apiTypes';
import { registerRefresher } from '@/lib/refresh';
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

function toEntry(m: MealDto): MealEntry {
  return {
    id: m.id,
    slot: m.slot,
    time: m.time.slice(0, 5),
    source: m.source,
    photoUri: m.photoUrl ? apiUrl(m.photoUrl) : null,
    items: m.items.map((i) => ({ id: i.foodId ?? `est-${i.name}`, name: i.name, grams: i.grams, per: i.per, custom: i.foodId === null })),
  };
}

type DiaryContextValue = {
  /** Meals of one day (loads them the first time a day is asked for). */
  mealsOn: (day: string) => MealEntry[];
  /** Saves a confirmed meal on the server. A photo picked on the phone is uploaded with it. */
  addMeal: (day: string, meal: Omit<MealEntry, 'id'> & { photoFileId?: string }) => Promise<void>;
  removeMeal: (day: string, mealId: string) => Promise<void>;
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const isClient = account?.role === 'client' && account.profile !== null;
  const owner = isClient ? (account?.id ?? null) : null;
  // Days loaded for the signed-in account (tagged, so another account never sees them).
  const [state, setState] = useState<{ owner: string | null; days: Record<string, MealEntry[]> }>({ owner: null, days: {} });
  const diary = useMemo(() => (state.owner === owner ? state.days : {}), [owner, state]);
  const requested = useRef(new Set<string>());
  const setDay = useCallback(
    (day: string, change: (meals: MealEntry[]) => MealEntry[]) =>
      setState((s) => {
        const days = s.owner === owner ? s.days : {};
        return { owner, days: { ...days, [day]: change(days[day] ?? []) } };
      }),
    [owner],
  );

  const load = useCallback(
    (day: string) => {
      if (!owner) return Promise.resolve();
      requested.current.add(`${owner}:${day}`);
      return api.get<DayDto>(`/api/v1/me/meals?day=${day}`).then((result) => setDay(day, () => result.meals.map(toEntry)));
    },
    [owner, setDay],
  );

  // Pull-to-refresh reloads the days already on screen.
  useEffect(
    () =>
      registerRefresher(() =>
        Promise.all(
          [...requested.current].filter((k) => k.startsWith(`${owner}:`)).map((k) => load(k.slice(k.indexOf(':') + 1))),
        ),
      ),
    [load, owner],
  );

  const value = useMemo<DiaryContextValue>(
    () => ({
      mealsOn: (day) => {
        const key = `${owner}:${day}`;
        if (owner && !requested.current.has(key)) {
          requested.current.add(key);
          queueMicrotask(() => load(day).catch(() => requested.current.delete(key)));
        }
        return [...(diary[day] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
      },
      addMeal: async (day, meal) => {
        let photoFileId: string | null = meal.photoFileId ?? null;
        if (meal.photoUri && !photoFileId) {
          const type = meal.photoUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          photoFileId = (await uploadFile(meal.photoUri, 'meal', type === 'image/png' ? 'refeicao.png' : 'refeicao.jpg', type)).id;
        }
        const saved = await api.post<MealDto>('/api/v1/me/meals', {
          day,
          slot: meal.slot,
          time: meal.time,
          source: meal.source,
          photoFileId,
          items: meal.items
            .filter((i) => i.grams > 0)
            .map((i) => (i.custom ? { name: i.name, grams: i.grams, per: i.per } : { foodId: i.id, grams: i.grams })),
        });
        setDay(day, (meals) => [...meals, toEntry(saved)]);
      },
      removeMeal: async (day, mealId) => {
        await api.delete(`/api/v1/me/meals/${mealId}`);
        setDay(day, (meals) => meals.filter((m) => m.id !== mealId));
      },
    }),
    [diary, load, owner, setDay],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be used inside <DiaryProvider>');
  return ctx;
}
