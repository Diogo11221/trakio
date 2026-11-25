import { router } from 'expo-router';

import { ToolGrid } from '@/features/tools/components';
import { clientBody } from '@/features/tools/data';
import { ToolScreen } from '@/features/tools/ToolScreen';

/** Cliente · Ferramentas (calculadoras). */
export default function Tools() {
  return (
    <ToolScreen title="Ferramentas" description="Calculadoras que começam com os teus dados. Muda os valores à vontade — nada fica guardado.">
      <ToolGrid body={clientBody} onOpen={(id) => router.push({ pathname: '/tools/[id]', params: { id } })} />
    </ToolScreen>
  );
}
