import type { Person } from '../components/Portrait';

/** Mock data until backend-core exposes the admin API — values match Figma "06 · Admin". */

export const months = [
  { id: '2026-11', label: 'Novembro 2026' },
  { id: '2026-10', label: 'Outubro 2026' },
  { id: '2026-09', label: 'Setembro 2026' },
];

export const kpis = {
  activeUsers: 4812,
  activeUsersChange: 8,
  marketplacePts: 126,
  newPtsThisMonth: 9,
  revenue: 6930,
  revenueChange: 14,
  processed: 64260,
};

/** Platform revenue per month: Trakio fees + PT marketplace subscriptions. */
export const revenueByMonth = [
  { month: 'jun', fees: 3880, subscriptions: 400 },
  { month: 'jul', fees: 4280, subscriptions: 430 },
  { month: 'ago', fees: 4040, subscriptions: 440 },
  { month: 'set', fees: 5090, subscriptions: 462 },
  { month: 'out', fees: 5626, subscriptions: 482 },
  { month: 'nov', fees: 6426, subscriptions: 504 },
];

export const aiMeals = { logged: 18240, premium: 1390, aiCost: 212 };

export type DocStatus = 'ok' | 'pending';
export type VerificationDoc = { id: string; title: string; detail: string; status: DocStatus; action?: string };

export type VerificationRequest = {
  id: Person;
  name: string;
  where: string;
  specialties: string;
  city: string;
  sentAt: string;
  ago: string;
  summary: string;
  ready: boolean;
  bio: string;
  packages: { name: string; price: number }[];
  docs: VerificationDoc[];
  warning?: string;
};

export const verificationQueue: VerificationRequest[] = [
  {
    id: 'tiago',
    name: 'Tiago Ferreira',
    where: 'Lisboa · Alvalade',
    specialties: 'Perda de peso, Nutrição',
    city: 'Lisboa · Perda de peso',
    sentAt: '22 de novembro',
    ago: 'Há 2 dias',
    summary: 'Falta confirmar 1 documento',
    ready: false,
    bio: '8 anos a ajudar pessoas a perder peso de forma sustentável, com treino e alimentação simples de seguir.',
    packages: [
      { name: 'Só treino', price: 30 },
      { name: 'Treino + Nutrição', price: 40 },
    ],
    docs: [
      { id: 'id', title: 'Documento de identificação', detail: 'Verificado automaticamente', status: 'ok' },
      { id: 'title', title: 'Título profissional de técnico de exercício físico', detail: 'Válido até março de 2028', status: 'ok', action: 'Ver' },
      { id: 'insurance', title: 'Seguro de responsabilidade civil', detail: 'Por confirmar · enviado ontem', status: 'pending', action: 'Ver documento' },
      { id: 'stripe', title: 'Conta de pagamentos (Stripe)', detail: 'Ligada · pronta a receber', status: 'ok' },
    ],
    warning: 'O seguro ainda não foi confirmado. Podes aprovar na mesma ou pedir ao Tiago para reenviar.',
  },
  {
    id: 'ines',
    name: 'Inês Almeida',
    where: 'Online',
    specialties: 'Mobilidade, Pós-parto',
    city: 'Online · Mobilidade',
    sentAt: '21 de novembro',
    ago: 'Há 3 dias',
    summary: 'Tudo enviado',
    ready: true,
    bio: 'Mobilidade, dor lombar e regresso ao treino no pós-parto, sempre com progressões seguras.',
    packages: [
      { name: 'Plano de mobilidade', price: 40 },
      { name: 'Sessão online', price: 25 },
    ],
    docs: [
      { id: 'id', title: 'Documento de identificação', detail: 'Verificado automaticamente', status: 'ok' },
      { id: 'title', title: 'Título profissional de técnico de exercício físico', detail: 'Válido até junho de 2029', status: 'ok', action: 'Ver' },
      { id: 'insurance', title: 'Seguro de responsabilidade civil', detail: 'Confirmado · válido até 2027', status: 'ok', action: 'Ver documento' },
      { id: 'stripe', title: 'Conta de pagamentos (Stripe)', detail: 'Ligada · pronta a receber', status: 'ok' },
    ],
  },
  {
    id: 'bruno',
    name: 'Bruno Lopes',
    where: 'Lisboa · Benfica',
    specialties: 'Powerlifting',
    city: 'Lisboa · Powerlifting',
    sentAt: '19 de novembro',
    ago: 'Há 5 dias',
    summary: 'Conta de pagamentos por ligar',
    ready: false,
    bio: 'Agachamento, supino e peso morto: técnica, periodização e preparação para competição.',
    packages: [{ name: 'Preparação de força', price: 45 }],
    docs: [
      { id: 'id', title: 'Documento de identificação', detail: 'Verificado automaticamente', status: 'ok' },
      { id: 'title', title: 'Título profissional de técnico de exercício físico', detail: 'Válido até janeiro de 2027', status: 'ok', action: 'Ver' },
      { id: 'insurance', title: 'Seguro de responsabilidade civil', detail: 'Confirmado · válido até 2027', status: 'ok', action: 'Ver documento' },
      { id: 'stripe', title: 'Conta de pagamentos (Stripe)', detail: 'Por ligar · o PT ainda não terminou o registo', status: 'pending' },
    ],
    warning: 'Sem conta de pagamentos ligada, o Bruno não consegue receber dos alunos.',
  },
];

export type PaymentStatus = 'paid' | 'refund-requested' | 'disputed' | 'refunded' | 'rescheduled' | 'refund-declined';

export type Payment = {
  id: string;
  date: string;
  student: { name: string; person?: Person };
  trainer: string;
  pack: string;
  amount: number;
  fee: number | null;
  status: PaymentStatus;
  kind: 'student' | 'subscriptions';
};

export const payments: Payment[] = [
  { id: 'p1', date: '24 nov', student: { name: 'Miguel Costa', person: 'miguel' }, trainer: 'Rita Santos', pack: 'Treino + Nutrição', amount: 45, fee: 4.5, status: 'paid', kind: 'student' },
  { id: 'p2', date: '24 nov', student: { name: 'Carla Sousa', person: 'carla' }, trainer: 'Rita Santos', pack: 'Só treino', amount: 35, fee: 3.5, status: 'paid', kind: 'student' },
  { id: 'p3', date: '23 nov', student: { name: 'Sofia Lopes', person: 'sofia' }, trainer: 'Rita Santos', pack: 'Sessão online', amount: 20, fee: 2, status: 'refund-requested', kind: 'student' },
  { id: 'p4', date: '22 nov', student: { name: 'João Martins', person: 'joao' }, trainer: 'Nuno Carvalho', pack: 'Treino + Nutrição', amount: 50, fee: 5, status: 'disputed', kind: 'student' },
  { id: 'p5', date: '22 nov', student: { name: 'Pedro Gomes', person: 'pedro' }, trainer: 'Rita Santos', pack: 'Treino + Nutrição', amount: 45, fee: 4.5, status: 'paid', kind: 'student' },
  { id: 'p6', date: '21 nov', student: { name: 'Tomás Silva', person: 'tomas' }, trainer: 'Beatriz Faria', pack: 'Só treino', amount: 30, fee: 3, status: 'paid', kind: 'student' },
  { id: 'p7', date: '21 nov', student: { name: 'Ana Ribeiro', person: 'ana' }, trainer: 'Nuno Carvalho', pack: 'Treino + Nutrição', amount: 45, fee: 4.5, status: 'paid', kind: 'student' },
  { id: 'p8', date: '1 nov', student: { name: 'Subscrições' }, trainer: '126 PTs', pack: 'Marketplace', amount: 504, fee: null, status: 'paid', kind: 'subscriptions' },
];

export const refundCase = {
  paymentId: 'p3',
  reason: '“A sessão das 10:00 não aconteceu, a PT não entrou na videochamada.”',
  history: [
    { at: '23 nov, 10:00', text: 'Sessão marcada' },
    { at: '23 nov, 10:20', text: 'Sofia pediu reembolso' },
    { at: '23 nov, 14:02', text: 'Rita: “Tive um problema de ligação, proponho remarcar.”' },
  ],
};

export const disputeCase = {
  paymentId: 'p4',
  reason: 'O banco do João contestou o pagamento: “serviço não reconhecido”.',
  history: [
    { at: '22 nov, 09:12', text: 'Pagamento de 50,00 € a Nuno Carvalho' },
    { at: '24 nov, 18:40', text: 'Banco abriu uma disputa' },
  ],
};

export type UserStatus = 'active' | 'pending' | 'suspended';
export type UserRow = {
  id: string;
  person: Person;
  name: string;
  email: string;
  type: 'Aluno' | 'PT';
  plan: string;
  city: string;
  since: string;
  lastSeen: string;
  status: UserStatus;
  premium: boolean;
};

export const users: UserRow[] = [
  { id: 'u1', person: 'miguel', name: 'Miguel Costa', email: 'miguel@exemplo.pt', type: 'Aluno', plan: 'Com PT · Premium', city: 'Lisboa', since: 'set. 2026', lastSeen: 'Hoje', status: 'active', premium: true },
  { id: 'u2', person: 'rita', name: 'Rita Santos', email: 'rita@exemplo.pt', type: 'PT', plan: 'Verificada · no marketplace', city: 'Lisboa', since: 'mar. 2026', lastSeen: 'Hoje', status: 'active', premium: false },
  { id: 'u3', person: 'ana', name: 'Ana Ribeiro', email: 'ana@exemplo.pt', type: 'Aluno', plan: 'Com PT', city: 'Lisboa', since: 'out. 2026', lastSeen: 'Há 3 dias', status: 'active', premium: false },
  { id: 'u4', person: 'tiago', name: 'Tiago Ferreira', email: 'tiago@exemplo.pt', type: 'PT', plan: 'Pedido de verificação', city: 'Lisboa', since: 'nov. 2026', lastSeen: 'Ontem', status: 'pending', premium: false },
  { id: 'u5', person: 'joao', name: 'João Martins', email: 'joao@exemplo.pt', type: 'Aluno', plan: 'Com PT', city: 'Online', since: 'ago. 2026', lastSeen: 'Hoje', status: 'active', premium: false },
  { id: 'u6', person: 'carla', name: 'Carla Sousa', email: 'carla@exemplo.pt', type: 'Aluno', plan: 'Com PT', city: 'Lisboa', since: 'out. 2026', lastSeen: 'Ontem', status: 'active', premium: false },
  { id: 'u7', person: 'pedro', name: 'Pedro Gomes', email: 'pedro@exemplo.pt', type: 'Aluno', plan: 'Com PT · Premium', city: 'Lisboa', since: 'jun. 2026', lastSeen: 'Hoje', status: 'active', premium: true },
  { id: 'u8', person: 'bruno', name: 'Bruno Lopes', email: 'bruno@exemplo.pt', type: 'PT', plan: 'Pedido de verificação', city: 'Lisboa', since: 'nov. 2026', lastSeen: 'Há 5 dias', status: 'pending', premium: false },
  { id: 'u9', person: 'sofia', name: 'Sofia Lopes', email: 'sofia@exemplo.pt', type: 'Aluno', plan: 'Com PT', city: 'Lisboa', since: 'nov. 2026', lastSeen: 'Hoje', status: 'active', premium: false },
];

export const userTotals = { all: 4812, students: 4686, pts: 126, premium: 1390, suspended: 3 };

export type Report = {
  id: string;
  kind: 'review' | 'profile';
  title: string;
  summary: string;
  ago: string;
  author: { name: string; detail: string };
  quote: string;
  stars?: number;
  reporter: { person: Person; name: string; quote: string };
  signals: string[];
  primaryAction: string;
  keepAction: string;
};

export const reports: Report[] = [
  {
    id: 'r1',
    kind: 'review',
    title: 'Avaliação suspeita',
    summary: 'Sobre Rita Santos · reportada pela própria',
    ago: 'Há 2 horas',
    author: { name: 'Marco P.', detail: 'Avaliou Rita Santos · há 2 dias' },
    quote: '“Não percam tempo, é uma fraude.”',
    stars: 1,
    reporter: { person: 'rita', name: 'Rita Santos', quote: '“Esta pessoa nunca foi minha aluna.”' },
    signals: [
      'Nunca houve pagamentos nem treinos entre os dois',
      'A conta do autor foi criada há 2 dias',
      'Deixou mais 2 avaliações de 1 estrela a outros PTs hoje',
    ],
    primaryAction: 'Remover avaliação',
    keepAction: 'Manter avaliação',
  },
  {
    id: 'r2',
    kind: 'profile',
    title: 'Perfil com promessas enganosas',
    summary: 'Nuno Carvalho · “resultados garantidos em 2 semanas”',
    ago: 'Ontem',
    author: { name: 'Nuno Carvalho', detail: 'PT verificado · Lisboa' },
    quote: '“Perde 10 kg em 2 semanas — resultados garantidos ou devolvo o dinheiro.”',
    reporter: { person: 'ana', name: 'Ana Ribeiro', quote: '“Isto não é realista e pode enganar quem está a começar.”' },
    signals: [
      'A frase está na descrição pública do perfil',
      'Já foi avisado uma vez sobre promessas de resultados (agosto)',
      'Tem 12 alunos ativos e boas avaliações',
    ],
    primaryAction: 'Pedir para corrigir o perfil',
    keepAction: 'Manter como está',
  },
];

export type DemoStatus = 'ready' | 'production' | 'todo';
export type Exercise = {
  id: string;
  name: string;
  group: 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Braços' | 'Core';
  muscles: string;
  equipment: string;
  demo: DemoStatus;
  usedIn: number;
  thumb?: boolean;
};

export const exercises: Exercise[] = [
  { id: 'e1', name: 'Supino inclinado', group: 'Peito', muscles: 'Peito superior, ombros', equipment: 'Barra e banco', demo: 'ready', usedIn: 214, thumb: true },
  { id: 'e2', name: 'Supino plano', group: 'Peito', muscles: 'Peito, tríceps', equipment: 'Barra e banco', demo: 'ready', usedIn: 301 },
  { id: 'e3', name: 'Crucifixo na polia', group: 'Peito', muscles: 'Peito', equipment: 'Polia', demo: 'ready', usedIn: 158 },
  { id: 'e4', name: 'Peck deck', group: 'Peito', muscles: 'Peito', equipment: 'Máquina', demo: 'production', usedIn: 96 },
  { id: 'e5', name: 'Elevações laterais', group: 'Ombros', muscles: 'Ombros', equipment: 'Halteres', demo: 'ready', usedIn: 267 },
  { id: 'e6', name: 'Hip thrust', group: 'Pernas', muscles: 'Glúteos, posterior da coxa', equipment: 'Barra e banco', demo: 'production', usedIn: 143 },
  { id: 'e7', name: 'Remada com cabo sentado', group: 'Costas', muscles: 'Costas, bíceps', equipment: 'Polia', demo: 'todo', usedIn: 88 },
];

/** Totals for the whole library (the table shows a page of it). */
export const demoTotals = { ready: 248, production: 38, todo: 26 };
