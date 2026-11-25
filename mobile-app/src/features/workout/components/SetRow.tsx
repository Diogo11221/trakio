import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { SetEntry } from '@/features/workout/data';
import { ScrubValue } from '@/features/workout/components/ScrubValue';
import { formatKg } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { colors, fonts, radii, springs } from '@/theme/tokens';

export const SET_COLUMNS = { set: 28, previous: 86, reps: 56, check: 30 } as const;

const COMPLETE_DISTANCE = 96;

type SetRowProps = {
  number: number;
  entry: SetEntry;
  state: 'done' | 'active' | 'pending';
  onAdjust?: (field: 'kg' | 'reps', steps: number) => void;
  onComplete?: () => void;
};

function previousLabel(entry: SetEntry) {
  return entry.previous ? `${formatKg(entry.previous.kg)} × ${entry.previous.reps}` : '—';
}

/** "Treino/Linha de série" — Feita / Ativa / Por fazer. */
export function SetRow({ number, entry, state, onAdjust, onComplete }: SetRowProps) {
  if (state === 'active') {
    return <ActiveSetRow number={number} entry={entry} onAdjust={onAdjust} onComplete={onComplete} />;
  }
  const done = state === 'done';
  return (
    <View style={styles.row} accessibilityLabel={`Série ${number}${done ? ', feita' : ''}`}>
      <AppText style={[styles.set, { width: SET_COLUMNS.set }]}>{number}</AppText>
      <AppText style={[styles.previous, { width: SET_COLUMNS.previous }]}>{previousLabel(entry)}</AppText>
      <AppText style={[styles.logged, styles.flexCenter, !done && styles.pendingText]}>{formatKg(entry.kg)}</AppText>
      <AppText style={[styles.logged, styles.center, { width: SET_COLUMNS.reps }, !done && styles.pendingText]}>
        {entry.reps}
      </AppText>
      <View style={[styles.checkSlot, { width: SET_COLUMNS.check }]}>
        {done ? (
          <Animated.View entering={ZoomIn.springify().damping(12).stiffness(260)}>
            <Icon name="checkVolt" size={16} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function ActiveSetRow({
  number,
  entry,
  onAdjust,
  onComplete,
}: Omit<SetRowProps, 'state'>) {
  const dx = useSharedValue(0);
  const armed = useSharedValue(false);

  const complete = () => onComplete?.();

  // Swipe the active row to the right to log it — the Volt wash shows how close you are.
  const swipe = usePanGesture({
    activeOffsetX: 14,
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      const x = Math.max(0, e.translationX);
      dx.set(x < COMPLETE_DISTANCE ? x : COMPLETE_DISTANCE + (x - COMPLETE_DISTANCE) * 0.25);
      const beyond = x >= COMPLETE_DISTANCE;
      if (beyond !== armed.get()) {
        armed.set(beyond);
        scheduleOnRN(beyond ? haptics.threshold : haptics.tick);
      }
    },
    onDeactivate: () => {
      'worklet';
      if (armed.get()) scheduleOnRN(complete);
      armed.set(false);
      dx.set(withSpring(0, springs.snappy));
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dx.get() * 0.5 }] }));
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dx.get(), [0, COMPLETE_DISTANCE], [0, 0.22], 'clamp'),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(dx.get(), [0, COMPLETE_DISTANCE], [1, 1.18], 'clamp') }],
    backgroundColor: interpolateColor(
      dx.get(),
      [COMPLETE_DISTANCE * 0.7, COMPLETE_DISTANCE],
      ['rgba(212,255,0,0)', colors.volt],
    ),
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={[styles.row, styles.active, rowStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.wash, washStyle]} pointerEvents="none" />
        <AppText style={[styles.set, styles.activeSet, { width: SET_COLUMNS.set }]}>{number}</AppText>
        <AppText style={[styles.previous, { width: SET_COLUMNS.previous }]}>{previousLabel(entry)}</AppText>
        <ScrubValue
          value={formatKg(entry.kg)}
          onStep={(steps) => onAdjust?.('kg', steps)}
          accessibilityLabel="Peso em quilos"
          style={styles.flex}
        />
        <ScrubValue
          value={String(entry.reps)}
          onStep={(steps) => onAdjust?.('reps', steps)}
          accessibilityLabel="Repetições"
          style={{ width: SET_COLUMNS.reps }}
        />
        <Pressable
          onPress={() => {
            haptics.press();
            complete();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Concluir série ${number}`}
        >
          <Animated.View style={[styles.checkRing, ringStyle]} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radii.md - 2,
  },
  active: {
    height: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.voltBorderSoft,
    overflow: 'hidden',
  },
  wash: { backgroundColor: colors.volt },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  center: { textAlign: 'center' },
  set: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text },
  activeSet: { color: colors.volt },
  previous: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  logged: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.textSoft, fontVariant: ['tabular-nums'] },
  pendingText: { color: colors.textFaint },
  checkSlot: { alignItems: 'center', justifyContent: 'center', height: 30 },
  checkRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(212,255,0,0.8)' },
});
