import { Stack } from 'expo-router';

import { TrainerProvider } from '@/features/pt/store';
import { colors } from '@/theme/tokens';

/** Trainer app — same design system as the client app, its own tabs and data. */
export default function TrainerLayout() {
  return (
    <TrainerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="student/[id]" />
        <Stack.Screen name="plan/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="verify" />
      </Stack>
    </TrainerProvider>
  );
}
