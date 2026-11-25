import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { easeOut } from '@/theme/motion';
import { colors, durations, fonts } from '@/theme/tokens';

type OptionCardProps = {
  title: string;
  description: string;
  icon?: IconName;
  /** Muted icon tint when not selected; Volt when selected. */
  selected: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
  compact?: boolean;
};

/** Selectable card with a radio that fills on a spring (Boas-vindas, Pacotes). */
export function OptionCard({ title, description, icon, selected, onPress, trailing, compact = false }: OptionCardProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(selected ? 1 : 0, { duration: durations.base }));
  }, [progress, selected]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.get(), [0, 1], [colors.border, 'rgba(212,255,0,0.7)']),
    backgroundColor: compact
      ? interpolateColor(progress.get(), [0, 1], [colors.surface, colors.surfaceRaised])
      : colors.surface,
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="tick"
      pressedScale={0.985}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${description}`}
    >
      <Animated.View style={[styles.card, compact ? styles.compact : styles.regular, cardStyle]}>
        {icon ? (
          <View style={styles.iconWell}>
            <Icon name={icon} size={22} tint={selected ? colors.volt : colors.textMuted} />
          </View>
        ) : (
          <Radio selected={selected} size={20} />
        )}
        <View style={styles.text}>
          <AppText variant={compact ? 'label' : 'bodyStrong'} style={compact ? styles.compactTitle : styles.title}>
            {title}
          </AppText>
          <AppText variant={compact ? 'caption' : 'small'} tone="muted">
            {description}
          </AppText>
        </View>
        {trailing}
        {icon ? <Radio selected={selected} size={22} /> : null}
      </Animated.View>
    </PressableScale>
  );
}

export function Radio({ selected, size }: { selected: boolean; size: number }) {
  const fill = useSharedValue(selected ? 1 : 0);

  // Timing, not a spring: a spring overshooting below 0 flips the dot and makes it flash.
  useEffect(() => {
    fill.set(withTiming(selected ? 1 : 0, { duration: selected ? 220 : 160, easing: easeOut }));
  }, [fill, selected]);

  const outerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.get(), [0, 1], ['rgba(212,255,0,0)', colors.volt]),
    borderColor: interpolateColor(fill.get(), [0, 1], [colors.borderStrong, colors.volt]),
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(0, fill.get()) }],
    opacity: fill.get(),
  }));

  const dot = Math.round(size * 0.36);
  return (
    <Animated.View style={[styles.radio, { width: size, height: size, borderRadius: size / 2 }, outerStyle]}>
      <Animated.View
        style={[{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.bg }, dotStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  regular: { padding: 16, gap: 14, borderRadius: 18 },
  compact: { paddingLeft: 14, paddingRight: 16, paddingVertical: 12, gap: 12, borderRadius: 16 },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 16 },
  compactTitle: { fontFamily: fonts.uiSemiBold },
  radio: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
