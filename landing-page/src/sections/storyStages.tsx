import type { ReactNode } from 'react';
import { MaxLoadList } from '../screens/MaxLoadList';
import { MealEstimate } from '../screens/MealEstimate';
import { MealLogScreen } from '../screens/MealLogScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SetRow } from '../screens/SetRow';
import { activeSet, TrainScreen } from '../screens/TrainScreen';

export type StoryStage = {
  id: 'treinar' | 'nutricao' | 'evolucao';
  step: 1 | 2 | 3;
  label: string;
  title: [string, string];
  lead: string;
  details: Array<{ label: string; value: string; highlight?: boolean }>;
  phoneLabel: string;
  /** Screen with the highlighted element left as a dashed placeholder. */
  screen: ReactNode;
  /** The element that pops out of the screen, positioned in rig coordinates (px). */
  highlight: { node: ReactNode; left: number; top: number; variant: 'row' | 'card' | 'list' };
};

export const storyStages: readonly StoryStage[] = [
  {
    id: 'treinar',
    step: 1,
    label: 'Treinar',
    title: ['Regista a carga', 'em dois toques.'],
    lead: 'A última série está sempre ao lado. Ajustas o peso, confirmas as repetições e o descanso arranca sozinho — com vibração e um plim no fim, mesmo com o ecrã bloqueado.',
    details: [
      { label: 'Última carga sempre à vista', value: '80,0 × 8' },
      { label: 'Descanso automático com som e vibração', value: '2:00' },
      { label: 'Carga máxima estimada a cada série', value: '102 kg ↑', highlight: true },
    ],
    phoneLabel: 'Ecrã de treino com a série 4 em destaque: 82,5 kg por 8 repetições',
    screen: <TrainScreen activeRow="placeholder" />,
    highlight: { node: <SetRow {...activeSet} state="active" />, left: 114, top: 531, variant: 'row' },
  },
  {
    id: 'nutricao',
    step: 2,
    label: 'Nutrição',
    title: ['Fotografa o prato.', 'Confirma os macros.'],
    lead: 'Envia uma foto, um áudio ou escreve o que comeste. A IA estima alimentos e macros e mostra uma pré-visualização editável — nada entra no diário sem a tua confirmação.',
    details: [
      { label: 'Escreve, fala ou tira uma foto', value: '3 formas' },
      { label: 'Confirmas antes de gravar', value: 'sempre' },
      { label: 'Registo de refeições com IA', value: 'Premium', highlight: true },
    ],
    phoneLabel: 'Registo de refeição por foto: a IA identificou frango, arroz e salada, 519 kcal',
    screen: <MealLogScreen estimate="placeholder" />,
    highlight: { node: <MealEstimate />, left: 114, top: 386, variant: 'card' },
  },
  {
    id: 'evolucao',
    step: 3,
    label: 'Evolução',
    title: ['Vê o que está', 'a resultar.'],
    lead: 'Volume semanal, carga máxima e prontidão calculados a cada treino. Se a carga estagnar, o Trakio avisa — e o teu PT vê exatamente o mesmo.',
    details: [
      { label: 'Carga máxima estimada', value: '102 kg ↑', highlight: true },
      { label: 'Aviso quando a carga estagna', value: 'automático' },
      { label: 'Prontidão: sono e esforço', value: '78 de 100' },
    ],
    phoneLabel: 'Ecrã de progresso com o mapa muscular 3D e a carga máxima estimada por exercício',
    screen: <ProgressScreen list="placeholder" />,
    highlight: { node: <MaxLoadList />, left: 114, top: 451, variant: 'list' },
  },
];
