import type { Person } from '@/components/Portrait';
import type { ActivityLevel, Goal, Sex } from '@/features/tools/calc';

export type Role = 'client' | 'trainer';

export type Experience = 'new' | 'some' | 'advanced';

export type ClientProfile = {
  kind: 'client';
  name: string;
  /** Local photo picked on this phone; null shows the "add photo" circle. */
  photoUri: string | null;
  /** Demo accounts reuse the portraits from the Figma contact sheets. */
  demoPerson?: Person;
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
  /** Chosen on Boas-vindas: "Com o meu PT" vs "Sozinho". */
  coached: boolean;
  /** The PT hired in the marketplace (or the demo PT for "Com o meu PT"). */
  trainer: TrainerLink | null;
};

export type TrainerLink = { id: Person; name: string; article: 'a' | 'o'; pack: string; price: number; period: string };

/** Rita — the PT behind "Com o meu PT" until the marketplace links real accounts. */
export const demoTrainerLink: TrainerLink = {
  id: 'rita',
  name: 'Rita Santos',
  article: 'a',
  pack: 'Treino + Nutrição',
  price: 45,
  period: 'mês',
};

export type TrainerProfile = {
  kind: 'trainer';
  name: string;
  photoUri: string | null;
  demoPerson?: Person;
  city: string;
  online: boolean;
  specialties: string[];
};

export type Profile = ClientProfile | TrainerProfile;

export type Account = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  /** null until onboarding is finished. */
  profile: Profile | null;
  /** Test only: salted SHA-256, kept on this phone. backend-core will own real credentials. */
  passwordHash: string;
  salt: string;
};

/** What screens get — never the password hash. */
export type PublicAccount = Omit<Account, 'passwordHash' | 'salt'>;

export type AuthErrorCode = 'invalid-email' | 'weak-password' | 'email-taken' | 'wrong-credentials' | 'not-found';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(authErrorMessages[code]);
  }
}

export const authErrorMessages: Record<AuthErrorCode, string> = {
  'invalid-email': 'Este email não parece estar certo.',
  'weak-password': 'A palavra-passe precisa de pelo menos 8 caracteres.',
  'email-taken': 'Já existe uma conta com este email. Entra em vez de criar outra.',
  'wrong-credentials': 'Email ou palavra-passe errados.',
  'not-found': 'Esta conta já não existe.',
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
