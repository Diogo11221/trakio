import { Tabs } from 'expo-router/js-tabs';

import { TabBar, trainerTabs } from '@/components/TabBar';
import { colors } from '@/theme/tokens';

export default function TrainerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} items={trainerTabs} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="home" options={{ title: 'Início' }} />
      <Tabs.Screen name="students" options={{ title: 'Alunos' }} />
      <Tabs.Screen name="plans" options={{ title: 'Planos' }} />
      <Tabs.Screen name="messages" options={{ title: 'Mensagens' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Ganhos' }} />
    </Tabs>
  );
}
