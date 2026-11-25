import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { IntroOverlay } from '@/components/IntroOverlay';
import { WorkoutProvider } from '@/features/workout/store';
import { DiaryProvider } from '@/features/nutrition/diary';
import { WeightProvider } from '@/features/progress/weight';
import { HistoryProvider } from '@/features/workout/history';
import { AuthProvider } from '@/state/auth';
import { ChatProvider } from '@/state/chat';
import { SettingsProvider } from '@/state/settings';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 200, fade: true });

const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.volt, border: colors.border },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <AuthProvider>
          <SettingsProvider>
            <ChatProvider>
              <HistoryProvider>
                <DiaryProvider>
                  <WeightProvider>
                    <WorkoutProvider>
                      <StatusBar style="light" />
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          contentStyle: { backgroundColor: colors.bg },
                          animation: 'slide_from_right',
                        }}
                      >
                        <Stack.Screen name="index" options={{ animation: 'none' }} />
                        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                        <Stack.Screen name="sign-in" />
                        <Stack.Screen name="sign-up" />
                        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
                        <Stack.Screen name="edit-profile" />
                        <Stack.Screen name="chat" />
                        <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
                        <Stack.Screen
                          name="workout"
                          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
                        />
                        <Stack.Screen name="workout-done" options={{ animation: 'fade', gestureEnabled: false }} />
                        <Stack.Screen name="meal-log" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="trainers/index" />
                        <Stack.Screen name="trainers/[id]" />
                        <Stack.Screen name="tools/index" />
                        <Stack.Screen name="tools/[id]" />
                        <Stack.Screen name="pt" options={{ animation: 'fade', gestureEnabled: false }} />
                      </Stack>
                      <IntroOverlay />
                    </WorkoutProvider>
                  </WeightProvider>
                </DiaryProvider>
              </HistoryProvider>
            </ChatProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
