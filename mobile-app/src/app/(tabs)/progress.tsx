import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Reveal, Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card, CardRow, SectionLabel } from '@/components/Surface';
import { haptics } from '@/lib/haptics';
import { colors, fonts, springs } from '@/theme/tokens';

const ranges = [
  { value: '1m', label: '1 mês' },
  { value: '2m', label: '2 meses' },
  { value: '1y', label: '1 ano' },
] as const;

type Range = (typeof ranges)[number]['value'];

const sparklines = {
  sparkline1: require('@/assets/figma/sparkline-1.svg'),
  sparkline2: require('@/assets/figma/sparkline-2.svg'),
  sparkline3: require('@/assets/figma/sparkline-3.svg'),
  sparkline4: require('@/assets/figma/sparkline-4.svg'),
} as const;

/** Mock lifts — sparklines are the static Figma exports until real history exists. */
const lifts: { name: string; change: string | null; stalled?: string; sparkline: keyof typeof sparklines; kg: string }[] = [
  { name: 'Supino inclinado', change: '↑ 10,9%', sparkline: 'sparkline1', kg: '102,0' },
  { name: 'Agachamento', change: '↑ 4,2%', sparkline: 'sparkline2', kg: '140,0' },
  { name: 'Peso morto', change: null, stalled: 'Estagnado · 3 sem', sparkline: 'sparkline3', kg: '165,0' },
  { name: 'Press militar', change: '↑ 2,1%', sparkline: 'sparkline4', kg: '58,0' },
];

/** Cliente · Progresso. */
export default function Progress() {
  const [range, setRange] = useState<Range>('2m');

  return (
    <Screen gap={16}>
      <Reveal index={0} style={styles.header}>
        <AppText variant="title">Progresso</AppText>
        <SegmentedControl options={ranges} value={range} onChange={setRange} />
      </Reveal>

      <Reveal index={1}>
        <MuscleMap />
      </Reveal>

      <Reveal index={2}>
        <SectionLabel>Carga máxima estimada</SectionLabel>
      </Reveal>

      <Reveal index={3}>
        <Card>
          {lifts.map((lift, i) => (
            <CardRow key={lift.name} last={i === lifts.length - 1} style={styles.lift}>
              <View style={styles.flex}>
                <AppText variant="label">{lift.name}</AppText>
                {lift.change ? (
                  <AppText variant="numberSmall" tone="volt">
                    {lift.change}
                  </AppText>
                ) : (
                  <View style={styles.stalled}>
                    <AppText variant="overline" tone="muted">
                      {lift.stalled}
                    </AppText>
                  </View>
                )}
              </View>
              <Sparkline key={`${range}-${i}`} source={sparklines[lift.sparkline]} index={i} />
              <View style={styles.kg}>
                <AppText style={styles.kgValue}>{lift.kg}</AppText>
                <AppText style={styles.kgUnit}>kg</AppText>
              </View>
            </CardRow>
          ))}
        </Card>
      </Reveal>
    </Screen>
  );
}

/** Sparkline drawn in from left to right (re-plays when the range changes). */
function Sparkline({ source, index }: { source: number; index: number }) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(withDelay(380 + index * 90, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [index, reveal]);
  const style = useAnimatedStyle(() => ({ width: 84 * reveal.get() }));
  return (
    <View style={styles.spark}>
      <Animated.View style={[styles.sparkMask, style]}>
        <Image source={source} style={styles.sparkImage} contentFit="fill" />
      </Animated.View>
    </View>
  );
}

const muscles: { label: string; sets: string; hot: boolean }[] = [
  { label: 'Peito', sets: '14', hot: true },
  { label: 'Ombros', sets: '11', hot: true },
  { label: 'Dorsais', sets: '4 ↓', hot: false },
];

/** Weekly volume on the anatomical render — drag to turn it in perspective. */
function MuscleMap() {
  const turn = useSharedValue(0);
  const offset = useSharedValue(0);

  const pan = usePanGesture({
    activeOffsetX: [-8, 8],
    failOffsetY: [-14, 14],
    onActivate: () => {
      'worklet';
      offset.set(turn.get());
      scheduleOnRN(haptics.tick);
    },
    onUpdate: (e) => {
      'worklet';
      turn.set(Math.max(-40, Math.min(40, offset.get() + e.translationX * 0.25)));
    },
    onFinalize: () => {
      'worklet';
      turn.set(withSpring(0, springs.gentle));
    },
  });

  const renderStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${turn.get()}deg` }, { translateX: turn.get() * 0.6 }],
  }));

  return (
    <View style={styles.map}>
      <View style={styles.mapHeader}>
        <AppText style={styles.mapTitle}>Volume esta semana</AppText>
        <AppText variant="overline" tone="muted">
          Arrasta para rodar
        </AppText>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.render, renderStyle]}>
          <Image
            source={require('@/assets/figma/muscle-map.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel="Mapa muscular: peito e ombros mais trabalhados"
          />
        </Animated.View>
      </GestureDetector>
      <View style={styles.muscles}>
        {muscles.map((m) => (
          <View key={m.label} style={styles.muscle}>
            {m.hot ? <Icon name="dotVolt" size={6} /> : null}
            <AppText style={[styles.muscleLabel, !m.hot && { color: colors.textMuted }]}>{m.label}</AppText>
            <AppText style={[styles.muscleSets, !m.hot && { color: colors.textMuted }]}>{m.sets}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3, alignItems: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  map: {
    backgroundColor: colors.viewport3d,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  mapTitle: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  render: { height: 250 },
  muscles: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  muscleLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  muscleSets: { fontFamily: fonts.mono, fontSize: 11, color: colors.text },
  lift: { paddingHorizontal: 16, paddingVertical: 13 },
  stalled: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  spark: { width: 84, height: 24 },
  sparkMask: { height: 24, overflow: 'hidden' },
  sparkImage: { width: 84, height: 24 },
  kg: { width: 74, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3 },
  kgValue: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  kgUnit: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
});
