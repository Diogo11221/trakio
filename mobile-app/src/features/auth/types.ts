import type { ActivityLevel, Goal, Sex } from '@/features/tools/calc';

export type Role = 'client' | 'trainer';

export type Experience = 'new' | 'some' | 'advanced';

export type ClientProfile = {
  kind: 'client';
  name: string;
  /** Server photo (absolute URL) or, while editing, a photo just picked on this phone. null = "add photo". */
  photoUri: string | null;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  /** Only asked when the goal is to lose fat or gain muscle. */
  goalWeightKg: number | null;
  goal: Goal;
  activity: ActivityLevel;
  daysPerWeek: number;
  experience: Experience;
  /** Has a PT right now (from a paid relationship — set by the server, not by the app). */
  coached: boolean;
  /** The PT this person pays (null when training alone). */
  trainer: TrainerLink | null;
};

export type TrainerLink = {
  id: string;
  name: string;
  article: 'a' | 'o';
  photoUri: string | null;
  pack: string;
  /** Euros. */
  price: number;
  period: 'mês' | 'avulso';
  conversationId: string | null;
};

export type TrainerProfile = {
  kind: 'trainer';
  name: string;
  photoUri: string | null;
  /** "a Rita" / "o Tiago" — chosen by the PT, never guessed from the name. */
  article: 'a' | 'o';
  city: string;
  area: string;
  online: boolean;
  bio: string;
  specialties: string[];
  /** Set by Trakio after checking the documents. */
  verified: boolean;
};

export type Profile = ClientProfile | TrainerProfile;

export type Preferences = { vibration: boolean; lockScreenAlert: boolean; restSound: boolean };

/** The signed-in account as the screens see it. */
export type PublicAccount = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  /** null until onboarding is finished. */
  profile: Profile | null;
  premium: boolean;
  preferences: Preferences;
};

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? authErrorMessages[code] ?? 'Algo correu mal. Tenta outra vez.');
  }
}

export const authErrorMessages: Record<string, string> = {
  'invalid-email': 'Este email não parece estar certo.',
  'weak-password': 'A palavra-passe precisa de pelo menos 8 caracteres.',
  'email-taken': 'Já existe uma conta com este email. Entra em vez de criar outra.',
  'wrong-credentials': 'Email ou palavra-passe errados.',
  'not-found': 'Esta conta já não existe.',
  'admin-account': 'Esta é uma conta de administração. Usa o backoffice no browser.',
};

export const experienceLabel: Record<Experience, string> = {
  new: 'A começar',
  some: 'Já treino',
  advanced: 'Treino há anos',
};

export const specialtyOptions = [
  'Hipertrofia',
  'Perda de peso',
  'Força',
  'Mobilidade',
  'Pós-parto',
  'Corrida',
  'Powerlifting',
  'Reabilitação',
  'Nutrição',
] as const;
