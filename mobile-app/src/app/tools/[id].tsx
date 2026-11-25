import { Redirect, useLocalSearchParams } from 'expo-router';

import { isToolId, toolInfo } from '@/features/tools/data';
import { useClientBody } from '@/features/tools/useClientBody';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { ToolView } from '@/features/tools/views';

/** Cliente · uma calculadora. */
export default function Tool() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const body = useClientBody();
  if (!isToolId(id)) return <Redirect href="/tools" />;
  return (
    <ToolScreen title={toolInfo[id].title} description={toolInfo[id].description}>
      <ToolView tool={id} initial={body} />
    </ToolScreen>
  );
}
