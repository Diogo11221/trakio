import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { OptionCard } from '@/components/OptionCard';
import { Reveal } from '@/components/Screen';
import type { IconName } from '@/components/Icon';
import { haptics } from '@/lib/haptics';
import { useSettings, type TrainingMode } from '@/state/settings';
import { colors, fonts, pagePadding } from '@/theme/tokens';

const options: { mode: TrainingMode; title: string; description: string; icon: IconName }[] = [
  { mode: 'solo', title: 'Sozinho', description: 'Cria os teus planos ou usa templates.', icon: 'dumbbell' },
  { mode: 'coached', title: 'Com o meu PT', description: 'Recebe planos e partilha a tua evolução.', icon: 'users' },
  {
    mode: 'trainer',
    title: 'Sou Personal Trainer',
    description: 'Acompanha alunos e aparece no marketplace.',
    icon: 'star',
  },
];

const HERO_HEIGHT = 250;

/** Cliente · Boas-vindas — pick how you train. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useSettings();

  // The 3D render "breathes" very slowly so the screen never feels static.
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.set(withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breath]);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.02 + breath.get() * 0.04 }, { translateY: breath.get() * -6 }],
  }));

  return (
    <View style={styles.root}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 10 }]}
      >
        <Animated.View
          entering={FadeIn.duration(900)}
          style={[styles.hero, { marginTop: insets.top + 50 }]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
            <Image
              source={require('@/assets/figma/render-bench.jpg')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel="Atleta em 3D no supino inclinado"
            />
          </Animated.View>
          <LinearGradient colors={['rgba(11,12,14,0.9)', 'rgba(11,12,14,0)']} style={styles.fadeTop} />
          <LinearGradient colors={['rgba(11,12,14,0)', colors.bg]} style={styles.fadeBottom} />
        </Animated.View>

        <View style={[styles.logo, { top: insets.top + 12 }]}>
          <Logo size={28} />
        </View>

        <View style={styles.content}>
          <Reveal index={0}>
            <AppText variant="hero">Como vais treinar?</AppText>
          </Reveal>
          <Reveal index={1}>
            <AppText variant="body" tone="muted">
              Podes mudar isto mais tarde.
            </AppText>
          </Reveal>
          <View style={styles.gap} />
          {options.map((option, i) => (
            <Reveal key={option.mode} index={i + 2}>
              <OptionCard
                title={option.title}
                description={option.description}
                icon={option.icon}
                selected={mode === option.mode}
                onPress={() => setMode(option.mode)}
              />
            </Reveal>
          ))}
        </View>

        <View style={styles.bottom}>
          <Button label="Continuar" onPress={() => router.replace('/today')} />
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push('/sign-in');
            }}
            hitSlop={10}
            accessibilityRole="link"
          >
            <AppText style={styles.signIn}>
              Já tens conta? <AppText style={[styles.signIn, { color: colors.text }]}>Entrar</AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  hero: { height: HERO_HEIGHT, overflow: 'hidden' },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 70 },
  fadeBottom: { position: 'absolute', top: 80, left: 0, right: 0, height: 170 },
  logo: { position: 'absolute', left: 24 },
  content: { marginTop: -36, paddingHorizontal: pagePadding, gap: 12 },
  gap: { height: 4 },
  bottom: { marginTop: 'auto', paddingTop: 28, paddingHorizontal: pagePadding, gap: 16, alignItems: 'center' },
  signIn: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
});
