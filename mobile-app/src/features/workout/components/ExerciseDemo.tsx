import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, springs } from '@/theme/tokens';

export const DEMO_HEIGHT = 318;

const angles = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Lado' },
] as const;

type Angle = (typeof angles)[number]['value'];

/**
 * 3D exercise demo. Until the real model ships, dragging tilts the render in
 * perspective and springs back, so it already feels like an object, not a photo.
 */
export function ExerciseDemo({ name }: { name: string }) {
  const [angle, setAngle] = useState<Angle>('side');
  const tilt = useSharedValue(0);
  const turn = useSharedValue(angle === 'side' ? 0 : 1);

  const pan = usePanGesture({
    activeOffsetX: [-10, 10],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      tilt.set(Math.max(-1, Math.min(1, e.translationX / 220)));
    },
    onFinalize: () => {
      'worklet';
      tilt.set(withSpring(0, springs.gentle));
    },
  });

  const renderStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${tilt.get() * 16 + interpolate(turn.get(), [0, 1], [0, 8])}deg` },
      { scale: 1 + Math.abs(tilt.get()) * 0.03 + turn.get() * 0.04 },
    ],
  }));

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[StyleSheet.absoluteFill, renderStyle]}>
          <Image
            source={require('@/assets/figma/render-bench.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={`Demonstração 3D: ${name}`}
          />
        </Animated.View>
      </GestureDetector>
      <LinearGradient
        colors={['rgba(11,12,14,0)', colors.bg]}
        style={styles.fadeBottom}
        pointerEvents="none"
      />
      <LinearGradient colors={['rgba(11,12,14,0.85)', 'rgba(11,12,14,0)']} style={styles.fadeTop} pointerEvents="none" />
      <View style={styles.controls}>
        <SegmentedControl
          options={angles}
          value={angle}
          size="sm"
          glass
          onChange={(value) => {
            setAngle(value);
            turn.set(withSpring(value === 'side' ? 0 : 1, springs.gentle));
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, height: DEMO_HEIGHT, overflow: 'hidden' },
  fadeBottom: { position: 'absolute', left: 0, right: 0, top: 198, height: 120 },
  fadeTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 110 },
  controls: { position: 'absolute', right: 20, top: 262, height: 30, justifyContent: 'center' },
});
