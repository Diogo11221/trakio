/**
 * Health and training calculators. Pure functions — no React — so the same
 * maths serves the client app, the trainer app and (later) backend-core.
 *
 * All results are estimates for adults; the UI says so next to every result.
 */

export type Sex = 'male' | 'female';

export type Band = { label: string; from: number; to: number };

// ── Body mass index ─────────────────────────────────────────────────────────

/** WHO adult categories. `to` is exclusive; the last band is open-ended. */
export const bmiBands: Band[] = [
  { label: 'Abaixo do peso', from: 0, to: 18.5 },
  { label: 'Peso saudável', from: 18.5, to: 25 },
  { label: 'Excesso de peso', from: 25, to: 30 },
  { label: 'Obesidade', from: 30, to: Infinity },
];

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bandFor(value: number, bands: Band[]): { band: Band; index: number } {
  const index = Math.max(
    0,
    bands.findIndex((b) => value >= b.from && value < b.to),
  );
  return { band: bands[index] ?? bands[0]!, index };
}

/** Weight range that gives a healthy index (18,5–24,9) for this height. */
export function healthyWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [18.5 * m * m, 24.9 * m * m];
}

// ── Daily calories ──────────────────────────────────────────────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';

export const activityLevels: { value: ActivityLevel; title: string; description: string; factor: number }[] = [
  { value: 'sedentary', title: 'Pouco ativo', description: 'Trabalho sentado e quase sem treino', factor: 1.2 },
  { value: 'light', title: 'Ligeiramente ativo', description: '1 a 3 treinos por semana', factor: 1.375 },
  { value: 'moderate', title: 'Ativo', description: '3 a 5 treinos por semana', factor: 1.55 },
  { value: 'high', title: 'Muito ativo', description: '6 a 7 treinos por semana', factor: 1.725 },
  { value: 'athlete', title: 'Atleta', description: 'Treino bidiário ou trabalho físico pesado', factor: 1.9 },
];

export type Goal = 'lose' | 'maintain' | 'gain';

/** Calories burned at rest (Mifflin–St Jeor). */
export function restingCalories(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function dailyCalories(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
): number {
  const factor = activityLevels.find((a) => a.value === activity)?.factor ?? 1.2;
  return restingCalories(sex, weightKg, heightCm, age) * factor;
}

/** −20 % to lose fat, +10 % to build muscle — moderate, sustainable targets. */
export function caloriesForGoal(maintenance: number, goal: Goal): number {
  const factor = goal === 'lose' ? 0.8 : goal === 'gain' ? 1.1 : 1;
  return Math.round((maintenance * factor) / 10) * 10;
}

export type Macros = { protein: number; carbs: number; fat: number };

/**
 * Protein 1,8–2,2 g/kg (higher while losing fat), fat at 25 % of calories,
 * carbohydrates fill the rest. Grams, rounded.
 */
export function macrosFor(calories: number, weightKg: number, goal: Goal): Macros {
  const protein = Math.round(weightKg * (goal === 'lose' ? 2.2 : 1.8));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

// ── Max weight for one repetition ───────────────────────────────────────────

/**
 * Estimated heaviest weight for a single repetition from a set of `reps`
 * (average of Epley and Brzycki — both are reliable up to ~10 reps).
 */
export function oneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  const epley = weightKg * (1 + reps / 30);
  const brzycki = reps < 37 ? (weightKg * 36) / (37 - reps) : epley;
  return (epley + brzycki) / 2;
}

/** Typical share of the one-rep max you can lift for N repetitions. */
export const repPercentages: { reps: number; percent: number }[] = [
  { reps: 1, percent: 100 },
  { reps: 2, percent: 95 },
  { reps: 3, percent: 93 },
  { reps: 4, percent: 90 },
  { reps: 5, percent: 87 },
  { reps: 6, percent: 85 },
  { reps: 8, percent: 80 },
  { reps: 10, percent: 75 },
  { reps: 12, percent: 70 },
  { reps: 15, percent: 65 },
];

/** Rounds to what can actually be loaded (2,5 kg steps by default). */
export function roundTo(value: number, step = 2.5): number {
  return Math.round(value / step) * step;
}

// ── Body fat (tape measure, US Navy method) ─────────────────────────────────

export function bodyFatPercent(
  sex: Sex,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm: number,
): number | null {
  const log = Math.log10;
  if (sex === 'male') {
    if (waistCm <= neckCm) return null;
    return 495 / (1.0324 - 0.19077 * log(waistCm - neckCm) + 0.15456 * log(heightCm)) - 450;
  }
  if (waistCm + hipCm <= neckCm) return null;
  return 495 / (1.29579 - 0.35004 * log(waistCm + hipCm - neckCm) + 0.221 * log(heightCm)) - 450;
}

/** American Council on Exercise ranges. */
export function bodyFatBands(sex: Sex): Band[] {
  return sex === 'male'
    ? [
        { label: 'Muito baixa', from: 0, to: 6 },
        { label: 'Atlética', from: 6, to: 14 },
        { label: 'Em forma', from: 14, to: 18 },
        { label: 'Média', from: 18, to: 25 },
        { label: 'Elevada', from: 25, to: Infinity },
      ]
    : [
        { label: 'Muito baixa', from: 0, to: 14 },
        { label: 'Atlética', from: 14, to: 21 },
        { label: 'Em forma', from: 21, to: 25 },
        { label: 'Média', from: 25, to: 32 },
        { label: 'Elevada', from: 32, to: Infinity },
      ];
}

// ── Water ───────────────────────────────────────────────────────────────────

/** 35 ml per kg, plus 500 ml per hour of training. Litres. */
export function dailyWater(weightKg: number, trainingMinutes: number): number {
  return (weightKg * 35 + (trainingMinutes / 60) * 500) / 1000;
}

// ── Plates on the bar ───────────────────────────────────────────────────────

export const plateSizes = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export type Plate = (typeof plateSizes)[number];

/**
 * Plates for ONE side of the bar, heaviest first. `rest` is what couldn't be
 * matched with the plates available (0 when the target is exact).
 */
export function platesPerSide(targetKg: number, barKg: number): { plates: Plate[]; rest: number } {
  let side = (targetKg - barKg) / 2;
  if (side <= 0) return { plates: [], rest: Math.max(0, targetKg - barKg) };
  const plates: Plate[] = [];
  for (const plate of plateSizes) {
    while (side >= plate - 1e-9) {
      plates.push(plate);
      side -= plate;
    }
  }
  return { plates, rest: Math.round(side * 2 * 100) / 100 };
}

// ── Formatting (pt-PT) ──────────────────────────────────────────────────────

/** 24.5 → "24,5"; trims a trailing ",0" when `trim` is set. */
export function decimal(value: number, digits = 1, trim = false): string {
  const fixed = value.toFixed(digits);
  const text = trim ? String(Number(fixed)) : fixed;
  return text.replace('.', ',');
}

