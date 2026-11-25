/** Labels shared by the nutrition screens (the diary itself lives in diary.tsx). */

export type MacroKey = 'protein' | 'carbs' | 'fat';

export const macroLabels: Record<MacroKey, string> = {
  protein: 'Proteína',
  carbs: 'Hidratos',
  fat: 'Gordura',
};
