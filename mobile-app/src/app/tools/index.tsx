import { router } from 'expo-router';

import { ToolGrid } from '@/features/tools/components';
import { bodyFromProfile } from '@/features/tools/data';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { useClientProfile } from '@/state/auth';

/** Cliente · Ferramentas (calculadoras). */
export default function Tools() {
  const profile = useClientProfile();
  return (
    <ToolScreen title="Ferramentas" description="Calculadoras que começam com os teus dados. Muda os valores à vontade — nada fica guardado.">
      <ToolGrid body={bodyFromProfile(profile)} onOpen={(id) => router.push({ pathname: '/tools/[id]', params: { id } })} />
    </ToolScreen>
  );
}
