import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

type StepperProps = {
  value: string;
  unit: string;
  onStep: (delta: 1 | -1) => void;
  style?: ViewStyle;
  accessibilityLabel: string;
};

/** "Próxima · Série N" stepper. Hold − / + to repeat, speeding up the longer you hold. */
export function Stepper({ value, unit, onStep, style, accessibilityLabel }: StepperProps) {
  const pop = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.set(withSequence(withTiming(1.06, { duration: 90 }), withTiming(1, { duration: 160 })));
  }, [pop, value]);

  const valueStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${value} ${unit}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <RepeatButton label="−" muted onStep={() => onStep(-1)} />
      <Animated.View style={[styles.center, valueStyle]}>
        <AppText style={styles.value}>{value}</AppText>
        <AppText variant="overline" tone="muted" numberOfLines={1}>
          {unit}
        </AppText>
      </Animated.View>
      <RepeatButton label="+" onStep={() => onStep(1)} />
    </View>
  );
}

function RepeatButton({ label, onStep, muted = false }: { label: string; onStep: () => void; muted?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const repeat = (delay: number) => {
    timer.current = setTimeout(() => {
      haptics.tick();
      onStep();
      repeat(Math.max(60, delay * 0.82));
    }, delay);
  };

  useEffect(() => stop, []);

  return (
    <PressableScale
      haptic="tick"
      pressedScale={0.88}
      onPress={onStep}
      onLongPress={() => repeat(140)}
      delayLongPress={350}
      onPressOut={stop}
      style={styles.button}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <AppText style={[styles.sign, muted && { color: colors.textMuted }]}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  value: { fontFamily: fonts.monoMedium, fontSize: 19, color: colors.text, fontVariant: ['tabular-nums'] },
  button: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: { fontFamily: fonts.ui, fontSize: 16, color: colors.text },
});
