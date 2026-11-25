import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, durations } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0 → 1, drawn clockwise from 12 o'clock. */
  progress: SharedValue<number>;
  color?: string;
  trackColor?: string;
  /** Rest timer style: a Volt knob riding the end of the arc. */
  knob?: boolean;
  children?: ReactNode;
};

/** Data-driven ring (kcal, rest timer, exercise status) — animates on the UI thread. */
export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color = colors.volt,
  trackColor = colors.border,
  knob = false,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const knobRadius = strokeWidth * 0.75;

  const arcProps = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, progress.get()));
    return { strokeDashoffset: circumference * (1 - p) };
  });

  const knobProps = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, progress.get()));
    const angle = p * 2 * Math.PI - Math.PI / 2;
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
      opacity: p > 0.002 ? 1 : 0,
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arcProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {knob ? (
          <AnimatedCircle
            r={knobRadius}
            fill={color}
            stroke={colors.bg}
            strokeWidth={strokeWidth / 3}
            animatedProps={knobProps}
          />
        ) : null}
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

/** Sweeps a ring from 0 to `target` when it mounts (or when the target changes). */
export function useRingSweep(target: number, delay = 120): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(delay, withTiming(target, { duration: durations.ring, easing: Easing.out(Easing.cubic) })),
    );
  }, [delay, progress, target]);
  return progress;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
