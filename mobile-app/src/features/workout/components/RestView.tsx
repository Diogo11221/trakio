import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ProgressRing } from '@/components/ProgressRing';
import { Card } from '@/components/Surface';
import type { Exercise } from '@/features/workout/data';
import { Stepper } from '@/features/workout/components/Stepper';
import { activeSetIndex, type RestState } from '@/features/workout/store';
import { formatClock, formatKg } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { playPlim } from '@/lib/sound';
import { useNow } from '@/lib/useNow';
import { colors, fonts } from '@/theme/tokens';

type RestViewProps = {
  rest: RestState;
  /** The exercise whose set was just logged. */
  finished: Exercise;
  /** The exercise up next (may be the same one). */
  next: Exercise;
  onAdjust: (field: 'kg' | 'reps', delta: number) => void;
  onShift: (seconds: number) => void;
  onDone: () => void;
};

/** Cliente · Treino B · Descanso. */
export function RestView({ rest, finished, next, onAdjust, onShift, onDone }: RestViewProps) {
  const { height } = useWindowDimensions();
  // 256 pt on a 844 pt screen (Figma); shrinks on shorter phones so nothing overlaps.
  const ringSize = Math.round(Math.min(256, Math.max(188, height * 0.3)));
  const compact = height < 800;
  const now = useNow(250);
  const remainingMs = Math.max(0, rest.endsAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const loggedSet = finished.sets[rest.setIndex];
  const nextIndex = activeSetIndex(next);
  const nextSet = next.sets[nextIndex];

  // Ring drains continuously on the UI thread; re-synced whenever ±15 s changes the end time.
  const progress = useSharedValue(1);
  useEffect(() => {
    const left = Math.max(0, rest.endsAt - Date.now());
    progress.set(left / 1000 / rest.totalSeconds);
    progress.set(withTiming(0, { duration: left, easing: Easing.linear }));
  }, [progress, rest.endsAt, rest.totalSeconds]);

  // Soft ticks for the last 3 seconds, then the full "rest over" buzz.
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (remaining === lastTick.current) return;
    lastTick.current = remaining;
    if (remaining > 0 && remaining <= 3) haptics.tap();
    if (remaining === 0) {
      haptics.restOver();
      playPlim();
      onDone();
    }
  }, [onDone, remaining]);

  return (
    <Animated.View entering={FadeIn.duration(320)} style={[styles.root, { gap: compact ? 16 : 22 }]}>
      <View style={styles.logged}>
        <Image source={require('@/assets/figma/render-bench.jpg')} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <AppText style={styles.exercise}>{finished.name}</AppText>
          <AppText variant="small" tone="muted">
            Série {rest.setIndex + 1} feita · {formatKg(loggedSet.kg)} kg × {loggedSet.reps}
          </AppText>
        </View>
        <View style={styles.doneMark}>
          <Icon name="checkVolt18" size={18} />
        </View>
      </View>

      <ProgressRing size={ringSize} strokeWidth={ringSize * 0.045} progress={progress} trackColor={colors.ringTrack} knob>
        <AppText variant="caption" tone="muted" style={styles.ringLabel}>
          Descanso
        </AppText>
        <AppText style={[styles.clock, { fontSize: ringSize / 4, letterSpacing: -ringSize / 80 }]} accessibilityLiveRegion="polite">
          {formatClock(remaining)}
        </AppText>
        <AppText variant="numberSmall" tone="muted" style={styles.ringTotal}>
          de {formatClock(rest.totalSeconds)}
        </AppText>
      </ProgressRing>

      <View style={styles.controls}>
        <ShiftButton label="−15 s" onPress={() => onShift(-15)} />
        <View style={styles.heart}>
          <Icon name="heart" size={13} />
          <AppText style={styles.bpm}>128</AppText>
          <AppText variant="caption" tone="muted">
            batimentos
          </AppText>
        </View>
        <ShiftButton label="+15 s" onPress={() => onShift(15)} />
      </View>

      {nextSet ? (
        <Card style={styles.next}>
          <AppText variant="small" tone="muted" style={styles.nextLabel}>
            Próxima · {next.id === finished.id ? `Série ${nextIndex + 1}` : next.name}
          </AppText>
          <View style={styles.steppers}>
            <Stepper
              value={formatKg(nextSet.kg)}
              unit="kg"
              onStep={(d) => onAdjust('kg', d)}
              style={styles.flex}
              accessibilityLabel="Peso da próxima série"
            />
            <Stepper
              value={String(nextSet.reps)}
              unit="repetições"
              onStep={(d) => onAdjust('reps', d)}
              style={styles.flex}
              accessibilityLabel="Repetições da próxima série"
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.flexFill} />
      <Button label="Saltar descanso" variant="outline" icon="skip" height={52} onPress={onDone} />
    </Animated.View>
  );
}

function ShiftButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="tap" pressedScale={0.92} style={styles.shift} accessibilityRole="button">
      <AppText style={styles.shiftText}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  flex: { flex: 1 },
  flexFill: { flex: 1, minHeight: 0 },
  logged: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, alignSelf: 'stretch' },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  exercise: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  doneMark: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontFamily: fonts.uiMedium },
  clock: {
    fontFamily: fonts.monoMedium,
    fontSize: 64,
    letterSpacing: -3.2,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  ringTotal: { fontSize: 12 },
  controls: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  shift: {
    width: 84,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  heart: { width: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bpm: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text },
  next: { alignSelf: 'stretch', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  nextLabel: { fontFamily: fonts.uiMedium },
  steppers: { flexDirection: 'row', gap: 10 },
});
