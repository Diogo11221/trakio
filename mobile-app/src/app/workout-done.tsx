import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Screen';
import { Card } from '@/components/Surface';
import { useWorkout, workoutSummary, type WorkoutState } from '@/features/workout/store';
import { haptics } from '@/lib/haptics';
import { colors, fonts, pagePadding, springs } from '@/theme/tokens';

const feelings: { value: NonNullable<WorkoutState['feeling']>; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'good', label: 'Bem' },
  { value: 'hard', label: 'Duro' },
  { value: 'max', label: 'No limite' },
];

/** Cliente · Treino concluído. */
export default function WorkoutDone() {
  const insets = useSafeAreaInsets();
  const { state, setFeeling, reset } = useWorkout();
  const summary = workoutSummary(state);

  // Check mark: ring pops in, then the tick lands with a heavy haptic.
  const ring = useSharedValue(0);
  const tick = useSharedValue(0);
  useEffect(() => {
    ring.set(withSpring(1, { damping: 11, stiffness: 180 }));
    tick.set(withDelay(220, withTiming(1, { duration: 360, easing: Easing.out(Easing.back(2)) })));
    const id = setTimeout(() => haptics.success(), 240);
    return () => clearTimeout(id);
  }, [ring, tick]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.get() }], opacity: ring.get() }));
  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + tick.get() * 0.6 }, { rotate: `${(1 - tick.get()) * -20}deg` }],
    opacity: tick.get(),
  }));

  const close = () => {
    reset();
    router.dismissTo('/today');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.check, ringStyle]}>
          <Animated.View style={tickStyle}>
            <Icon name="checkVolt36" size={36} />
          </Animated.View>
        </Animated.View>
        <Reveal index={2}>
          <AppText variant="title" style={styles.center}>
            Treino concluído
          </AppText>
        </Reveal>
        <Reveal index={3}>
          <AppText variant="label" tone="muted" style={[styles.center, styles.subtitle]}>
            {state.plan.title} · {state.plan.focus} · {summary.minutes || 55} min
          </AppText>
        </Reveal>

        <Reveal index={4} style={styles.stretch}>
          <Card style={styles.stats}>
            <Stat value={summary.volume} suffix=" kg" label="volume total" />
            <View style={styles.statDivider} />
            <Stat value={summary.sets} label="séries" />
            <View style={styles.statDivider} />
            <Stat value={1} label="recorde novo" />
          </Card>
        </Reveal>

        <Reveal index={5} style={styles.stretch}>
          <Card style={styles.record}>
            <View style={styles.trophy}>
              <Icon name="trophy" size={24} />
            </View>
            <View style={styles.flex}>
              <AppText style={styles.recordTitle}>Novo recorde no supino inclinado</AppText>
              <AppText variant="caption" tone="muted">
                82,5 kg × 8 · carga máxima estimada 102 kg
              </AppText>
            </View>
          </Card>
        </Reveal>

        <Reveal index={6} style={[styles.stretch, styles.effort]}>
          <AppText style={styles.effortTitle}>Como te sentiste?</AppText>
          <View style={styles.feelings}>
            {feelings.map((feeling) => {
              const selected = state.feeling === feeling.value;
              return (
                <PressableScale
                  key={feeling.value}
                  haptic="tick"
                  pressedScale={0.94}
                  onPress={() => setFeeling(feeling.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  wrapperStyle={styles.flexOnly}
                  style={[styles.feeling, selected && styles.feelingSelected]}
                >
                  <AppText style={[styles.feelingText, selected && { color: colors.bg }]}>{feeling.label}</AppText>
                </PressableScale>
              );
            })}
          </View>
          <AppText variant="caption" tone="muted">
            Ajuda a Rita e a IA a ajustar a próxima semana.
          </AppText>
        </Reveal>
      </View>

      <Animated.View entering={FadeInDown.delay(560).springify().damping(22)} style={styles.bottom}>
        <Button label="Enviar resumo à Rita" height={54} onPress={close} />
        <Button label="Fechar" variant="ghost" height={46} onPress={close} />
      </Animated.View>
    </View>
  );
}

/** Number that counts up from zero — the payoff after a hard session. */
function Stat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    const started = Date.now();
    const duration = 900;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t >= 1) {
        clearInterval(id);
        pop.set(withSequence(withSpring(1.08, springs.press), withSpring(1, springs.snappy)));
      }
    }, 32);
    return () => clearInterval(id);
  }, [pop, value]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <View style={styles.stat}>
      <Animated.View style={popStyle}>
        <AppText style={styles.statValue}>
          {shown}
          {suffix}
        </AppText>
      </Animated.View>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: pagePadding },
  content: { alignItems: 'center', gap: 14 },
  center: { textAlign: 'center' },
  subtitle: { fontFamily: fonts.ui },
  stretch: { alignSelf: 'stretch' },
  flex: { flex: 1, gap: 2 },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.ui, fontSize: 11, color: colors.textMuted },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderColor: 'rgba(212,255,0,0.4)',
  },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  effort: { gap: 10 },
  effortTitle: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  feelings: { flexDirection: 'row', gap: 6 },
  flexOnly: { flex: 1 },
  feeling: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  feelingSelected: { backgroundColor: colors.text, borderColor: colors.text },
  feelingText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  bottom: { marginTop: 'auto', gap: 10 },
});
