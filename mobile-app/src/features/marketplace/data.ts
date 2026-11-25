import type { Person } from '@/components/Portrait';

/** Mock marketplace until backend-core exposes the PT directory — values match Figma. */

export type City = 'Lisboa' | 'Porto' | 'Braga' | 'Coimbra' | 'Online';
export type Specialty = 'Hipertrofia' | 'Perda de peso' | 'Força' | 'Mobilidade' | 'Powerlifting';

export type Package = { id: string; name: string; description: string; price: number; period: 'mês' | 'avulso' };

export type Trainer = {
  id: Person;
  name: string;
  verified: boolean;
  specialties: string;
  tags: Specialty[];
  rating: string;
  reviews: number;
  where: string;
  cities: City[];
  fromPrice: number;
  stats: { students: number; adherence: string; response: string };
  bio: string;
  packages: Package[];
};

const ritaPackages: Package[] = [
  { id: 'full', name: 'Treino + Nutrição', description: 'Plano, dieta, ajustes semanais e chat', price: 45, period: 'mês' },
  { id: 'train', name: 'Só treino', description: 'Plano e acompanhamento de cargas', price: 35, period: 'mês' },
  { id: 'session', name: 'Sessão online', description: 'Videochamada de 45 min', price: 20, period: 'avulso' },
];

export const trainers: Trainer[] = [
  {
    id: 'rita',
    name: 'Rita Santos',
    verified: true,
    specialties: 'Hipertrofia · Força',
    tags: ['Hipertrofia', 'Força'],
    rating: '4,9',
    reviews: 32,
    where: 'Lisboa + Online',
    cities: ['Lisboa', 'Online'],
    fromPrice: 35,
    stats: { students: 18, adherence: '87%', response: '2 h' },
    bio: '6 anos a treinar atletas amadores e iniciantes. Planos com progressão de carga clara e ajustes semanais com base nos teus dados.',
    packages: ritaPackages,
  },
  {
    id: 'tiago',
    name: 'Tiago Ferreira',
    verified: true,
    specialties: 'Perda de peso · Nutrição',
    tags: ['Perda de peso'],
    rating: '4,8',
    reviews: 21,
    where: 'Lisboa · Alvalade',
    cities: ['Lisboa'],
    fromPrice: 30,
    stats: { students: 24, adherence: '82%', response: '4 h' },
    bio: 'Perda de peso sem dietas extremas: hábitos, treino de força e acompanhamento semanal.',
    packages: [
      { id: 'full', name: 'Treino + Nutrição', description: 'Plano, dieta e check-in semanal', price: 40, period: 'mês' },
      { id: 'train', name: 'Só treino', description: 'Plano e acompanhamento de cargas', price: 30, period: 'mês' },
    ],
  },
  {
    id: 'ines',
    name: 'Inês Almeida',
    verified: false,
    specialties: 'Mobilidade · Pós-parto',
    tags: ['Mobilidade'],
    rating: '5,0',
    reviews: 14,
    where: 'Online',
    cities: ['Online'],
    fromPrice: 40,
    stats: { students: 11, adherence: '91%', response: '1 h' },
    bio: 'Mobilidade, dor lombar e regresso ao treino no pós-parto, sempre com progressões seguras.',
    packages: [
      { id: 'train', name: 'Plano de mobilidade', description: 'Rotina semanal e ajustes', price: 40, period: 'mês' },
      { id: 'session', name: 'Sessão online', description: 'Videochamada de 45 min', price: 25, period: 'avulso' },
    ],
  },
  {
    id: 'bruno',
    name: 'Bruno Lopes',
    verified: true,
    specialties: 'Powerlifting',
    tags: ['Força', 'Powerlifting'],
    rating: '4,7',
    reviews: 40,
    where: 'Lisboa · Benfica',
    cities: ['Lisboa'],
    fromPrice: 45,
    stats: { students: 30, adherence: '85%', response: '3 h' },
    bio: 'Agachamento, supino e peso morto: técnica, periodização e preparação para competição.',
    packages: [
      { id: 'train', name: 'Preparação de força', description: 'Plano por blocos e revisão de vídeos', price: 45, period: 'mês' },
    ],
  },
];

export const cities: City[] = ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Online'];
export const specialties: Specialty[] = ['Hipertrofia', 'Perda de peso', 'Força'];
