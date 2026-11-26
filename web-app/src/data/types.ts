/** Shapes returned by backend-core's admin API (money in cents, dates ISO). */

export type Overview = {
  month: string;
  activeUsers: number;
  totalUsers: number;
  clients: number;
  trainers: number;
  marketplaceTrainers: number;
  newTrainersThisMonth: number;
  premiumSubscribers: number;
  revenueCents: number;
  revenueChangePercent: number | null;
  processedCents: number;
  revenueByMonth: { month: string; feesCents: number; subscriptionsCents: number }[];
  aiMealsThisMonth: number;
  pendingVerifications: number;
  openReports: number;
  refundRequests: number;
  disputes: number;
};

export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };

export type UserStatus = 'active' | 'suspended';
export type UserRow = {
  id: string;
  name: string | null;
  photoUrl: string | null;
  email: string;
  role: 'client' | 'trainer' | 'admin';
  city: string | null;
  premium: boolean;
  coached: boolean;
  verified: boolean | null;
  listed: boolean | null;
  since: string;
  lastSeenAt: string | null;
  status: UserStatus;
};
export type Totals = { all: number; clients: number; trainers: number; premium: number; suspended: number };

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refund-requested' | 'refunded' | 'refund-declined' | 'rescheduled' | 'disputed';
export type PaymentRow = {
  id: string;
  date: string;
  payer: string;
  payerPhotoUrl: string | null;
  trainer: string | null;
  kind: 'coaching' | 'premium' | 'marketplace';
  description: string;
  amountCents: number;
  feeCents: number;
  status: PaymentStatus;
  refundReason: string | null;
};

export type VerificationStatus = 'draft' | 'submitted' | 'info-requested' | 'approved' | 'refused';
export type QueueItem = {
  id: string;
  trainerId: string;
  name: string;
  photoUrl: string | null;
  city: string;
  specialties: string[];
  status: VerificationStatus;
  submittedAt: string | null;
  decidedAt: string | null;
  ready: boolean;
  pendingDocuments: number;
};
export type DocumentView = {
  id: string | null;
  type: 'identity' | 'professional-title' | 'insurance';
  status: 'missing' | 'submitted' | 'confirmed' | 'rejected';
  fileUrl: string | null;
  validUntil: string | null;
  uploadedAt: string | null;
};
export type VerificationDetail = {
  id: string;
  trainerId: string;
  name: string;
  photoUrl: string | null;
  email: string;
  city: string;
  where: string;
  specialties: string[];
  bio: string;
  packages: { id: string; name: string; description: string; priceCents: number; period: 'month' | 'once' }[];
  status: VerificationStatus;
  adminNote: string;
  submittedAt: string | null;
  documents: DocumentView[];
  payouts: { connected: boolean; payoutsEnabled: boolean };
};

export type Report = {
  id: string;
  kind: 'review' | 'profile';
  status: 'open' | 'resolved';
  resolution: 'remove-review' | 'ask-profile-fix' | 'keep' | null;
  reason: string;
  createdAt: string;
  reporterName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  reviewId: string | null;
  reviewRating: number | null;
  reviewComment: string | null;
  reviewAuthorName: string | null;
  trainerBio: string | null;
  signals: { authorTrainedWithTrainer: boolean; authorAccountAgeDays: number | null } | null;
};

export type DemoStatus = 'ready' | 'production' | 'todo';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';
export type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  group: MuscleGroup;
  muscles: string;
  equipment: string;
  demoStatus: DemoStatus;
  usedIn: number;
};

export type Settings = {
  platformFeePercent: number;
  premiumPriceCents: number;
  marketplacePriceCents: number;
  paymentsProvider: string;
  aiEnabled: boolean;
  admins: { id: string; email: string; since: string; lastSeenAt: string | null }[];
};

export const groupLabels: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  legs: 'Pernas',
  shoulders: 'Ombros',
  arms: 'Braços',
  core: 'Core',
};

const shortDate = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

export function dayMonth(iso: string | null): string {
  return iso ? shortDate.format(new Date(iso)).replace('.', '') : '—';
}

export function fullDate(iso: string | null): string {
  return iso ? longDate.format(new Date(iso)) : '—';
}

/** "Hoje", "Ontem", "Há 3 dias", or the date. */
export function ago(iso: string | null): string {
  if (!iso) return 'Nunca';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `Há ${days} dias`;
  return dayMonth(iso);
}
