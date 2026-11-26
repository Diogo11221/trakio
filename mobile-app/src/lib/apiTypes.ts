/** Shapes returned by backend-core (/api/v1). Money in cents, dates as ISO strings. */

export type Role = 'client' | 'trainer' | 'admin';
export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
export type Experience = 'new' | 'some' | 'advanced';
export type Period = 'month' | 'once';
export type Feeling = 'easy' | 'good' | 'hard' | 'max';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

export type ClientProfileDto = {
  kind: 'client';
  name: string;
  photoFileId: string | null;
  photoUrl: string | null;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number | null;
  goal: Goal;
  activity: ActivityLevel;
  daysPerWeek: number;
  experience: Experience;
  coached: boolean;
};

export type TrainerProfileDto = {
  kind: 'trainer';
  name: string;
  photoFileId: string | null;
  photoUrl: string | null;
  article: 'a' | 'o';
  city: string;
  area: string;
  online: boolean;
  bio: string;
  specialties: string[];
  verified: boolean;
};

export type TrainerLinkDto = {
  relationshipId: string;
  trainerId: string;
  name: string;
  article: 'a' | 'o';
  photoUrl: string | null;
  pack: string;
  priceCents: number;
  period: Period;
  conversationId: string | null;
};

export type MeDto = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  profile: ClientProfileDto | TrainerProfileDto | null;
  preferences: { vibration: boolean; lockScreenAlert: boolean; restSound: boolean };
  premium: boolean;
  trainer: TrainerLinkDto | null;
};

export type AuthResponse = { accessToken: string; tokenType: string; expiresIn: number; refreshToken: string; account: MeDto };

export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };

export type ExerciseDto = { id: string; slug: string; name: string; group: MuscleGroup; muscles: string; equipment: string };

export type PlanExerciseDto = {
  id: string;
  exercise: string;
  name: string;
  group: MuscleGroup;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  referenceKg: number | null;
  note: string;
};

export type PlanDayDto = { id: string; label: string; focus: string; exercises: PlanExerciseDto[] };
export type PlanDto = { id: string; name: string; weeks: number; workoutsPerWeek: number; template: boolean; days: PlanDayDto[] };
export type PlanSummaryDto = { id: string; name: string; weeks: number; workoutsPerWeek: number; template: boolean; students: number };
export type MyPlanDto = { plan: PlanDto; nextDayId: string | null };

export type SessionDto = {
  id: string;
  clientRef: string;
  planId: string | null;
  planDayId: string | null;
  title: string;
  focus: string;
  startedAt: string;
  finishedAt: string;
  volumeKg: number;
  sets: number;
  feeling: Feeling | null;
  records: string[];
  exercises: { exercise: string; name: string; record: boolean; sets: { kg: number; reps: number }[] }[];
};

export type WeightDto = { id: string; day: string; kg: number };
export type ReadinessDto = { score: number; level: 'ready' | 'steady' | 'rest'; daysSinceLast: number | null; model: boolean };

export type Per = { kcal: number; protein: number; carbs: number; fat: number };
export type MealItemDto = { foodId: string | null; name: string; grams: number; per: Per };
export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealDto = {
  id: string;
  day: string;
  slot: MealSlot;
  time: string;
  source: 'manual' | 'ai';
  photoUrl: string | null;
  items: MealItemDto[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
};
export type DayDto = { day: string; goals: MealDto['totals'] | null; eaten: MealDto['totals']; meals: MealDto[] };
export type EstimateDto = {
  items: { foodId: string | null; name: string; grams: number; per100: Per; confidence: 'high' | 'medium' | 'low' }[];
  unrecognised: string[];
  note: string;
  ai: boolean;
};

export type MessageDto = {
  id: number;
  from: 'trainer' | 'client' | 'removed';
  kind: 'text' | 'photo' | 'file' | 'workout';
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  detail?: string;
  createdAt: string;
};
export type ConversationDto = {
  id: string;
  other: { id: string; name: string; photoUrl: string | null };
  lastMessage: MessageDto | null;
  unread: number;
  canSend: boolean;
  updatedAt: string | null;
};
export type MessagesPageDto = { messages: MessageDto[]; lastReadByOther: number };

export type PackageDto = { id: string; name: string; description: string; priceCents: number; period: Period };
export type TrainerCardDto = {
  id: string;
  name: string;
  article: 'a' | 'o';
  photoUrl: string | null;
  verified: boolean;
  specialties: string[];
  city: string;
  where: string;
  online: boolean;
  rating: number | null;
  reviews: number;
  fromPriceCents: number | null;
  students: number;
};
export type TrainerDetailDto = { trainer: TrainerCardDto; bio: string; packages: PackageDto[] };
export type ReviewDto = { id: string; author: string; rating: number; comment: string; createdAt: string };
export type CheckoutDto = { status: 'active' | 'pending'; url: string | null };
export type SubscriptionDto = {
  kind: 'premium' | 'marketplace';
  status: 'incomplete' | 'active' | 'past-due' | 'canceled';
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceCents: number;
};

export type SuggestionDto = { kind: 'light-week' | 'home-workout' | 'variation'; title: string; body: string; action: string };
export type StudentDto = {
  clientId: string;
  relationshipId: string;
  name: string;
  photoUrl: string | null;
  goal: Goal;
  week: number;
  weeks: number;
  adherence: number | null;
  tag: 'attention' | 'new' | null;
  readiness: number | null;
  suggestion: SuggestionDto | null;
  pack: string;
  priceCents: number;
  period: Period;
  since: string;
  conversationId: string | null;
};
export type StudentDetailDto = {
  student: StudentDto;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number | null;
  activity: ActivityLevel;
  workoutsDone: number;
  workoutsExpected: number;
  topLift: { exercise: string; name: string; currentMax: number; changePercent: number } | null;
  suggestions: SuggestionDto[];
};
export type ProgressDto = {
  weeks: number;
  thisWeek: { workouts: number; volumeKg: number; setsByGroup: Partial<Record<MuscleGroup, number>> };
  exercises: { exercise: string; name: string; group: MuscleGroup; currentMax: number; changePercent: number; stalled: boolean }[];
};
export type EarningsDto = {
  month: string;
  receivedCents: number;
  feeCents: number;
  netCents: number;
  changePercent: number | null;
  payments: { id: string; studentId: string | null; student: string; description: string; amountCents: number; feeCents: number; netCents: number; status: string; paidAt: string }[];
};
export type AppointmentDto = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  title: string;
  place: string;
  online: boolean;
  with: { id: string; name: string; photoUrl: string | null } | null;
};
export type DocumentType = 'identity' | 'professional-title' | 'insurance';
export type VerificationDto = {
  status: 'draft' | 'submitted' | 'info-requested' | 'approved' | 'refused';
  adminNote: string;
  documents: { id: string | null; type: DocumentType; status: 'missing' | 'submitted' | 'confirmed' | 'rejected'; fileUrl: string | null; validUntil: string | null; uploadedAt: string | null }[];
  payouts: { connected: boolean; payoutsEnabled: boolean };
  canSubmit: boolean;
};
export type PayoutAccountDto = { connected: boolean; payoutsEnabled: boolean; onboardingUrl: string | null };
