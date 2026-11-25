import { StyleSheet, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { haptics } from '@/lib/haptics';
import { colors, durations, fonts, radii, springs } from '@/theme/tokens';

const STEP_DISTANCE = 14;

type ScrubValueProps = {
  value: string;
  /** Called with +1 / −1 (or more on fast drags) as the finger crosses each step. */
  onStep: (steps: number) => void;
  accessibilityLabel: string;
  style?: ViewStyle;
};

/**
 * Editable number for the active set: drag up to add, down to remove — one
 * haptic tick per step (2,5 kg or 1 repetição), no keyboard mid-workout.
 */
export function ScrubValue({ value, onStep, accessibilityLabel, style }: ScrubValueProps) {
  const active = useSharedValue(0);
  const lastSteps = useSharedValue(0);
  const nudge = useSharedValue(0);

  const step = (delta: number) => {
    haptics.tick();
    onStep(delta);
  };

  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    failOffsetX: [-14, 14],
    onActivate: () => {
      'worklet';
      lastSteps.set(0);
      active.set(withTiming(1, { duration: durations.fast }));
    },
    onUpdate: (e) => {
      'worklet';
      const steps = Math.trunc(-e.translationY / STEP_DISTANCE);
      const delta = steps - lastSteps.get();
      // Keep the number visually tethered to the finger between steps.
      nudge.set(Math.max(-6, Math.min(6, (-e.translationY % STEP_DISTANCE) * 0.4)));
      if (delta !== 0) {
        lastSteps.set(steps);
        scheduleOnRN(step, delta);
      }
    },
    onFinalize: () => {
      'worklet';
      active.set(withTiming(0, { duration: durations.base }));
      nudge.set(withSpring(0, springs.snappy));
    },
  });

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(active.get(), [0, 1], [colors.borderStrong, colors.volt]),
    transform: [{ scale: 1 + active.get() * 0.06 }],
  }));
  const textStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -nudge.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.box, style, boxStyle]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <Animated.View style={textStyle}>
          <AppText style={styles.value}>{value}</AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  value: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
});
