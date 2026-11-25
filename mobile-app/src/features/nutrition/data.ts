/** Mock diary until backend-core / backend-ai expose it — values match Figma. */

export type MacroKey = 'protein' | 'carbs' | 'fat';

export const macroLabels: Record<MacroKey, string> = {
  protein: 'Proteína',
  carbs: 'Hidratos',
  fat: 'Gordura',
};

export const dailyGoal = { kcal: 2400, protein: 180, carbs: 260, fat: 70 } as const;

export type Meal = {
  id: string;
  name: string;
  time?: string;
  summary?: string;
  kcal?: number;
  fromAi?: boolean;
  photo?: boolean;
};

export const meals: Meal[] = [
  { id: 'breakfast', name: 'Pequeno-almoço', time: '08:10', summary: 'Aveia, iogurte grego, banana', kcal: 420 },
  { id: 'lunch', name: 'Almoço', time: '13:02', summary: 'Frango, arroz, salada', kcal: 519, fromAi: true, photo: true },
  { id: 'snack', name: 'Lanche' },
  { id: 'dinner', name: 'Jantar' },
];

export const eaten = { kcal: 1361, protein: 112, carbs: 140, fat: 34 } as const;

export type EstimatedFood = { id: string; name: string; grams: number; kcalPerGram: number };

/** What the AI "saw" on the lunch photo — editable before saving. */
export const lunchEstimate: EstimatedFood[] = [
  { id: 'chicken', name: 'Frango grelhado', grams: 160, kcalPerGram: 1.65 },
  { id: 'rice', name: 'Arroz branco', grams: 150, kcalPerGram: 1.3 },
  { id: 'salad', name: 'Salada + azeite', grams: 90, kcalPerGram: 0.667 },
];
