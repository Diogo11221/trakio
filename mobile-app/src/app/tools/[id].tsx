import { Redirect, useLocalSearchParams } from 'expo-router';

import { bodyFromProfile, isToolId, toolInfo } from '@/features/tools/data';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { useClientProfile } from '@/state/auth';
import { ToolView } from '@/features/tools/views';

/** Cliente · uma calculadora. */
export default function Tool() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useClientProfile();
  if (!isToolId(id)) return <Redirect href="/tools" />;
  return (
    <ToolScreen title={toolInfo[id].title} description={toolInfo[id].description}>
      <ToolView tool={id} initial={bodyFromProfile(profile)} />
    </ToolScreen>
  );
}
