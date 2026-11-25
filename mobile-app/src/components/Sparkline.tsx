import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** Line drawn from real values, revealed left → right (replays when `values` change). */
export function Sparkline({
  values,
  width = 84,
  height = 24,
  delay = 380,
  color = colors.text,
}: {
  values: number[];
  width?: number;
  height?: number;
  delay?: number;
  color?: string;
}) {
  const reveal = useSharedValue(0);
  const signature = values.join(',');
  useEffect(() => {
    reveal.set(0);
    reveal.set(withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [delay, reveal, signature]);
  const style = useAnimatedStyle(() => ({ width: width * reveal.get() }));

  if (values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1]!;

  return (
    <View style={{ width, height }}>
      <Animated.View style={[{ height, overflow: 'hidden' }, style]}>
        <Svg width={width} height={height}>
          <Polyline
            points={points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={last[0]} cy={last[1]} r={2.5} fill={colors.volt} />
        </Svg>
      </Animated.View>
    </View>
  );
}
