import type { SuggestionDto } from '@/lib/apiTypes';

/** Types for the trainer app; the data itself comes from backend-core (features/pt/store.tsx). */

export type StudentTag = 'attention' | 'new' | null;

export type Student = {
  /** The student's account id. */
  id: string;
  name: string;
  firstName: string;
  photoUri: string | null;
  /** Plain-language goal ("Ganhar músculo"). */
  goal: string;
  week: number;
  weeks: number;
  /** Share of planned workouts done in the last weeks (0–1); null while the plan hasn't started. */
  adherence: number | null;
  tag: StudentTag;
  /** Why this student needs attention, from the top AI suggestion. */
  alert?: string;
  pack: string;
  /** Euros. */
  price: number;
  period: 'mês' | 'avulso';
  conversationId: string | null;
  /** Readiness to train (0–100) from backend-ai, when available. */
  readiness: number | null;
  suggestion: SuggestionDto | null;
};

export type PlanSummary = { id: string; name: string; detail: string; students: number };

export type PlanExercise = {
  /** Row id in the editor (unique within the plan). */
  id: string;
  /** Library slug ("supino-plano"). */
  exercise: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  note: string;
  referenceKg?: number | null;
};

export type PlanDay = { id: string; label: string; focus?: string; exercises: PlanExercise[] };

export type ChatMessage =
  | { id: string; from: 'student' | 'me'; kind: 'text'; text: string; time: string }
  | { id: string; from: 'student' | 'me'; kind: 'photo'; uri: string | null; caption?: string; time: string }
  | { id: string; from: 'student' | 'me'; kind: 'file'; name: string; meta: string; url?: string; time: string }
  | { id: string; from: 'system'; kind: 'workout'; title: string; detail: string; time: string };

/** What the conversation list shows under the name. */
export function lastMessagePreview(last: ChatMessage | null): string {
  if (!last) return 'Ainda sem mensagens';
  const prefix = last.from === 'me' ? 'Tu: ' : '';
  switch (last.kind) {
    case 'text':
      return prefix + last.text;
    case 'photo':
      return last.from === 'me' ? 'Tu: enviaste uma foto' : 'Enviou uma foto';
    case 'file':
      return prefix + last.name;
    case 'workout':
      return last.title;
  }
}

export function planDetail(weeks: number, perWeek: number): string {
  return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} · ${perWeek} ${perWeek === 1 ? 'treino' : 'treinos'} por semana`;
}
