import { router } from 'expo-router';

import { ToolGrid } from '@/features/tools/components';
import { useClientBody } from '@/features/tools/useClientBody';
import { ToolScreen } from '@/features/tools/ToolScreen';

/** Cliente · Ferramentas (calculadoras). */
export default function Tools() {
  const body = useClientBody();
  return (
    <ToolScreen title="Ferramentas" description="Calculadoras que começam com os teus dados. Muda os valores à vontade — nada fica guardado.">
      <ToolGrid body={body} onOpen={(id) => router.push({ pathname: '/tools/[id]', params: { id } })} />
    </ToolScreen>
  );
}
