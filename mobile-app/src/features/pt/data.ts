import type { Person } from '@/components/Portrait';

/** Mock data for the trainer app until backend-core exposes it — values match Figma "05 · App · PT". */

export type StudentTag = 'attention' | 'new' | null;

export type Student = {
  id: Person;
  name: string;
  firstName: string;
  goal: string;
  week: number;
  weeks: number;
  /** Share of planned workouts completed (0–1); null while the plan hasn't started. */
  adherence: number | null;
  tag: StudentTag;
  /** Plain-language reason shown in "Precisam de atenção". */
  alert?: string;
  pack: string;
  price: number;
  stats?: { workouts: string; maxLoad: string; maxLoadChange: string; maxLoadLabel: string; readiness: number };
  ai?: { title: string; body: string; action: string };
  volumeNote?: string;
};

export const students: Student[] = [
  {
    id: 'miguel',
    name: 'Miguel Costa',
    firstName: 'Miguel',
    goal: 'Hipertrofia',
    week: 6,
    weeks: 12,
    adherence: 0.92,
    tag: 'attention',
    alert: 'Cansaço alto previsto para quinta',
    pack: 'Treino + Nutrição',
    price: 45,
    stats: { workouts: '11 de 12', maxLoad: '102 kg', maxLoadChange: '↑ 11%', maxLoadLabel: 'carga máxima no supino', readiness: 78 },
    ai: {
      title: 'Cansaço alto previsto para quinta',
      body: 'O volume subiu 18% em 3 semanas e o Miguel está a dormir menos de 6 horas. Sugestão: uma semana mais leve.',
      action: 'Aplicar semana leve',
    },
    volumeNote: 'Dorsais abaixo do alvo',
  },
  {
    id: 'ana',
    name: 'Ana Ribeiro',
    firstName: 'Ana',
    goal: 'Perda de peso',
    week: 3,
    weeks: 8,
    adherence: 0.58,
    tag: 'attention',
    alert: 'Faltou 2 treinos esta semana',
    pack: 'Treino + Nutrição',
    price: 45,
    stats: { workouts: '7 de 12', maxLoad: '60 kg', maxLoadChange: '↑ 4%', maxLoadLabel: 'carga máxima no agachamento', readiness: 64 },
    ai: {
      title: 'Faltou 2 treinos esta semana',
      body: 'A Ana disse que não conseguiu ir ao ginásio. Sugestão: trocar o treino de quinta por um treino de 30 minutos em casa.',
      action: 'Enviar treino em casa',
    },
    volumeNote: 'Pernas abaixo do alvo',
  },
  {
    id: 'joao',
    name: 'João Martins',
    firstName: 'João',
    goal: 'Força',
    week: 9,
    weeks: 12,
    adherence: 0.85,
    tag: 'attention',
    alert: 'Peso morto sem evolução há 3 semanas',
    pack: 'Só treino',
    price: 35,
    stats: { workouts: '10 de 12', maxLoad: '165 kg', maxLoadChange: '= 0%', maxLoadLabel: 'carga máxima no peso morto', readiness: 81 },
    ai: {
      title: 'Peso morto parado há 3 semanas',
      body: 'A carga máxima não sobe desde o início do mês. Sugestão: 2 semanas com peso morto romeno antes de voltar a testar.',
      action: 'Aplicar variação',
    },
    volumeNote: 'Costas no alvo',
  },
  {
    id: 'carla',
    name: 'Carla Sousa',
    firstName: 'Carla',
    goal: 'Mobilidade',
    week: 2,
    weeks: 6,
    adherence: 1,
    tag: null,
    pack: 'Só treino',
    price: 35,
  },
  {
    id: 'pedro',
    name: 'Pedro Gomes',
    firstName: 'Pedro',
    goal: 'Mobilidade',
    week: 10,
    weeks: 16,
    adherence: 0.88,
    tag: null,
    pack: 'Treino + Nutrição',
    price: 45,
  },
  {
    id: 'sofia',
    name: 'Sofia Lopes',
    firstName: 'Sofia',
    goal: 'Hipertrofia',
    week: 1,
    weeks: 12,
    adherence: null,
    tag: 'new',
    pack: 'Sessão online',
    price: 20,
  },
  {
    id: 'tomas',
    name: 'Tomás Silva',
    firstName: 'Tomás',
    goal: 'Força',
    week: 1,
    weeks: 12,
    adherence: null,
    tag: 'new',
    pack: 'Só treino',
    price: 35,
  },
];

export const agenda = [
  { id: 'a1', time: '10:00', title: 'Sessão online · Sofia Lopes', detail: 'Videochamada · 45 min', live: true, student: 'sofia' as Person },
  { id: 'a2', time: '18:30', title: 'Avaliação inicial · Tomás Silva', detail: 'Ginásio de Alvalade', live: false, student: 'tomas' as Person },
];

export type PlanSummary = { id: string; name: string; detail: string; students: number };

export const myPlans: PlanSummary[] = [
  { id: 'hipertrofia', name: 'Hipertrofia', detail: '12 semanas · 3 treinos por semana', students: 7 },
  { id: 'perda-peso', name: 'Perda de peso', detail: '8 semanas · 4 treinos por semana', students: 4 },
  { id: 'forca', name: 'Força', detail: '12 semanas · 3 treinos por semana', students: 3 },
  { id: 'mobilidade', name: 'Mobilidade', detail: '6 semanas · 2 treinos por semana', students: 2 },
  { id: 'regresso', name: 'Regresso ao treino', detail: '4 semanas · 2 treinos por semana', students: 0 },
];

export const trakioTemplates: PlanSummary[] = [
  { id: 't-iniciante', name: 'Primeiro mês no ginásio', detail: '4 semanas · 3 treinos por semana', students: 0 },
  { id: 't-superior-inferior', name: 'Superior e inferior', detail: '8 semanas · 4 treinos por semana', students: 0 },
  { id: 't-forca-base', name: 'Força base', detail: '10 semanas · 3 treinos por semana', students: 0 },
  { id: 't-casa', name: 'Treino em casa', detail: '6 semanas · 3 treinos por semana', students: 0 },
];

export type PlanExercise = {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  note: string;
};

export type PlanDay = { id: string; label: string; exercises: PlanExercise[] };

export function createPlanDays(): PlanDay[] {
  return [
    {
      id: 'a',
      label: 'Treino A · Peito',
      exercises: [
        { id: 'supino-plano', name: 'Supino plano', sets: 4, repsMin: 8, repsMax: 8, restSeconds: 120, note: '' },
        {
          id: 'supino-inclinado',
          name: 'Supino inclinado',
          sets: 4,
          repsMin: 8,
          repsMax: 10,
          restSeconds: 120,
          note: 'Desce a barra devagar, 3 segundos.',
        },
        { id: 'crucifixo', name: 'Crucifixo na polia', sets: 3, repsMin: 12, repsMax: 12, restSeconds: 90, note: '' },
        { id: 'peck-deck', name: 'Peck deck', sets: 3, repsMin: 12, repsMax: 12, restSeconds: 90, note: '' },
        { id: 'elevacoes', name: 'Elevações laterais', sets: 4, repsMin: 15, repsMax: 15, restSeconds: 60, note: '' },
      ],
    },
    {
      id: 'b',
      label: 'Treino B · Costas',
      exercises: [
        { id: 'puxada', name: 'Puxada à frente', sets: 4, repsMin: 8, repsMax: 10, restSeconds: 120, note: '' },
        { id: 'remada', name: 'Remada com barra', sets: 4, repsMin: 8, repsMax: 8, restSeconds: 120, note: '' },
        { id: 'remada-polia', name: 'Remada na polia', sets: 3, repsMin: 12, repsMax: 12, restSeconds: 90, note: '' },
        { id: 'curl', name: 'Curl com halteres', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60, note: '' },
      ],
    },
    {
      id: 'c',
      label: 'C · Pernas',
      exercises: [
        { id: 'agachamento', name: 'Agachamento', sets: 4, repsMin: 6, repsMax: 8, restSeconds: 150, note: '' },
        { id: 'peso-morto-romeno', name: 'Peso morto romeno', sets: 3, repsMin: 8, repsMax: 10, restSeconds: 120, note: '' },
        { id: 'prensa', name: 'Prensa', sets: 3, repsMin: 10, repsMax: 12, restSeconds: 90, note: '' },
        { id: 'gemeos', name: 'Gémeos em pé', sets: 4, repsMin: 15, repsMax: 15, restSeconds: 60, note: '' },
      ],
    },
  ];
}

export const exerciseLibrary = [
  'Supino com halteres',
  'Flexões',
  'Desenvolvimento militar',
  'Tríceps na corda',
  'Face pull',
  'Afundos',
];

export type Payment = { id: string; student: Person; name: string; pack: string; amount: number };

export const payments: Payment[] = [
  { id: 'p1', student: 'miguel', name: 'Miguel Costa', pack: 'Treino + Nutrição', amount: 45 },
  { id: 'p2', student: 'carla', name: 'Carla Sousa', pack: 'Só treino', amount: 35 },
  { id: 'p3', student: 'sofia', name: 'Sofia Lopes', pack: 'Sessão online', amount: 20 },
  { id: 'p4', student: 'pedro', name: 'Pedro Gomes', pack: 'Treino + Nutrição', amount: 45 },
];

/** Platform fee on student payments (assumed 10 %, as in the Figma admin pages). */
export const PLATFORM_FEE = 0.1;

export const months = [
  { id: 'nov', label: 'Novembro', received: 1240, change: 12, previous: 'outubro', transfer: 860, transferDate: '3 de dezembro' },
  { id: 'out', label: 'Outubro', received: 1105, change: 6, previous: 'setembro', transfer: 0, transferDate: '' },
  { id: 'set', label: 'Setembro', received: 1040, change: -3, previous: 'agosto', transfer: 0, transferDate: '' },
];

export type ChatMessage =
  | { id: string; from: 'student' | 'me'; kind: 'text'; text: string; time: string }
  | { id: string; from: 'student' | 'me'; kind: 'photo'; uri: string | null; caption?: string; time: string }
  | { id: string; from: 'student' | 'me'; kind: 'file'; name: string; meta: string; time: string }
  | { id: string; from: 'system'; kind: 'workout'; title: string; detail: string; time: string };

export type Conversation = {
  id: Person;
  name: string;
  subtitle: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
};

export const conversations: Conversation[] = [
  {
    id: 'miguel',
    name: 'Miguel Costa',
    subtitle: 'Hipertrofia · semana 6 de 12',
    time: '10:34',
    unread: 0,
    messages: [
      { id: 'm1', from: 'system', kind: 'workout', title: 'Treino A · Peito concluído', detail: '55 min · novo recorde no supino inclinado (102 kg)', time: '09:58' },
      { id: 'm2', from: 'student', kind: 'text', text: 'O supino hoje estava leve. Subo o peso na próxima?', time: '10:14' },
      { id: 'm3', from: 'me', kind: 'text', text: 'Sim! Sobe 2,5 kg e mantém as 8 repetições.', time: '10:20' },
      { id: 'm4', from: 'student', kind: 'photo', uri: null, caption: 'Isto serve para o almoço?', time: '10:31' },
      { id: 'm5', from: 'me', kind: 'file', name: 'Plano alimentar · semana 7.pdf', meta: 'PDF · 240 KB', time: '10:34' },
    ],
  },
  {
    id: 'ana',
    name: 'Ana Ribeiro',
    subtitle: 'Perda de peso · semana 3 de 8',
    time: '09:12',
    unread: 2,
    messages: [
      { id: 'a1', from: 'me', kind: 'text', text: 'Como correu a semana, Ana?', time: 'Ontem' },
      { id: 'a2', from: 'student', kind: 'text', text: 'Esta semana não consegui ir ao ginásio…', time: '09:10' },
      { id: 'a3', from: 'student', kind: 'text', text: 'Tens algum treino que dê para fazer em casa?', time: '09:12' },
    ],
  },
  {
    id: 'sofia',
    name: 'Sofia Lopes',
    subtitle: 'Hipertrofia · semana 1 de 12',
    time: '08:40',
    unread: 1,
    messages: [
      { id: 's1', from: 'me', kind: 'text', text: 'Olá Sofia! Ficamos para as 10h, por videochamada?', time: '08:31' },
      { id: 's2', from: 'student', kind: 'text', text: 'Combinado, às 10h estou online!', time: '08:40' },
    ],
  },
  {
    id: 'joao',
    name: 'João Martins',
    subtitle: 'Força · semana 9 de 12',
    time: 'Ontem',
    unread: 0,
    messages: [{ id: 'j1', from: 'student', kind: 'photo', uri: null, caption: 'Postura no peso morto', time: 'Ontem' }],
  },
  {
    id: 'carla',
    name: 'Carla Sousa',
    subtitle: 'Mobilidade · semana 2 de 6',
    time: 'Ontem',
    unread: 0,
    messages: [{ id: 'c1', from: 'student', kind: 'text', text: 'Obrigada pelas dicas', time: 'Ontem' }],
  },
  {
    id: 'pedro',
    name: 'Pedro Gomes',
    subtitle: 'Mobilidade · semana 10 de 16',
    time: 'Segunda',
    unread: 0,
    messages: [{ id: 'p1', from: 'system', kind: 'workout', title: 'Treino C · Pernas concluído', detail: '48 min', time: 'Segunda' }],
  },
];

/** What the conversation list shows under the name. */
export function lastMessagePreview(conversation: Conversation): string {
  const last = conversation.messages[conversation.messages.length - 1];
  if (!last) return '';
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

export type VerificationStep = { id: string; title: string; status: string; done: boolean };

export const verificationSteps: VerificationStep[] = [
  { id: 'id', title: 'Documento de identificação', status: 'Verificado', done: true },
  { id: 'title', title: 'Título profissional de técnico de exercício físico', status: 'Enviado · válido até 2028', done: true },
  { id: 'stripe', title: 'Conta de pagamentos (Stripe)', status: 'Ligada', done: true },
  { id: 'insurance', title: 'Seguro de responsabilidade civil', status: 'Falta enviar', done: false },
];
