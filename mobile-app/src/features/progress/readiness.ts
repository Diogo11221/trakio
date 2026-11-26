import { useEffect, useState } from 'react';

import { useHistory } from '@/features/workout/history';
import { api } from '@/lib/api';
import type { ReadinessDto } from '@/lib/apiTypes';

export type Readiness = { value: number; note: string; level: ReadinessDto['level'] | null };

const verdict: Record<ReadinessDto['level'], string> = {
  ready: 'pronto para carga',
  steady: 'treina sem forçar',
  rest: 'dia para descansar',
};

function note(r: ReadinessDto): string {
  if (r.daysSinceLast === null) return 'Ainda sem treinos · começa com calma';
  const when = r.daysSinceLast === 0 ? 'Treinaste hoje' : r.daysSinceLast === 1 ? 'Último treino ontem' : `Último treino há ${r.daysSinceLast} dias`;
  return `${when} · ${verdict[r.level]}`;
}

/**
 * Readiness to train from backend-ai's model (recent load, rest and how the last sessions felt),
 * or a simple rule when the model isn't reachable. Recomputed after every saved workout.
 */
export function useReadiness(): Readiness {
  const { sessions } = useHistory();
  const latest = sessions[0]?.id;
  const [readiness, setReadiness] = useState<Readiness>({ value: 0, note: 'A calcular…', level: null });

  useEffect(() => {
    let alive = true;
    api
      .get<ReadinessDto>('/api/v1/me/readiness')
      .then((r) => alive && setReadiness({ value: r.score, note: note(r), level: r.level }))
      .catch(() => alive && setReadiness((current) => (current.level ? current : { value: 0, note: 'Sem ligação ao servidor', level: null })));
    return () => {
      alive = false;
    };
  }, [latest]);

  return readiness;
}
