import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { haptics } from '@/lib/haptics';
import { colors, fonts, springs } from '@/theme/tokens';

export type MuscleTag = { label: string; sets: string; hot: boolean };

type MuscleMapProps = {
  title: string;
  /** Right-hand note in the header, e.g. "Arrasta para rodar". */
  note: string;
  height?: number;
  muscles?: MuscleTag[];
  accessibilityLabel: string;
};

/** Weekly volume on the anatomical render — drag to turn it in perspective. */
export function MuscleMap({ title, note, height = 250, muscles, accessibilityLabel }: MuscleMapProps) {
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
      <View style={styles.header}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText variant="caption" tone="muted">
          {note}
        </AppText>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ height }, renderStyle]}>
          <Image
            source={require('@/assets/figma/muscle-map.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      </GestureDetector>
      {muscles ? (
        <View style={styles.muscles}>
          {muscles.map((m) => (
            <View key={m.label} style={styles.muscle}>
              {m.hot ? <Icon name="dotVolt" size={6} /> : null}
              <AppText style={[styles.muscleLabel, !m.hot && { color: colors.textMuted }]}>{m.label}</AppText>
              <AppText style={[styles.muscleSets, !m.hot && { color: colors.textMuted }]}>{m.sets}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: colors.viewport3d,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  title: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
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
});
