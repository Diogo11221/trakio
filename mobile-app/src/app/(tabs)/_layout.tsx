import { Tabs } from 'expo-router/js-tabs';

import { clientTabs, TabBar } from '@/components/TabBar';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} items={clientTabs} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="train" options={{ title: 'Treinar' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrição' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progresso' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
