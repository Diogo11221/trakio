import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { colors, durations, fonts } from '@/theme/tokens';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** `solid` = light fill (cities), `outline` = Volt outline (specialties). */
  kind?: 'solid' | 'outline';
  /** Optional count shown after the label in mono (Alunos filters). */
  count?: number;
};

/** Filter chip; colours cross-fade instead of snapping. */
export function Chip({ label, selected, onPress, kind = 'solid', count }: ChipProps) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, { duration: durations.fast }));
  }, [on, selected]);

  const solid = kind === 'solid';
  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: solid ? interpolateColor(on.get(), [0, 1], [colors.surface, colors.text]) : colors.surface,
    borderColor: interpolateColor(on.get(), [0, 1], [colors.border, solid ? colors.text : colors.voltBorder]),
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.get(), [0, 1], [colors.textMuted, solid ? colors.bg : colors.volt]),
  }));

  return (
    <PressableScale
      onPress={onPress}
      haptic="tick"
      pressedScale={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.chip, count !== undefined && styles.withCount, chipStyle]}>
        <Animated.Text style={[styles.text, textStyle]}>{label}</Animated.Text>
        {count !== undefined ? <Animated.Text style={[styles.count, textStyle]}>{count}</Animated.Text> : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  text: { fontFamily: fonts.uiMedium, fontSize: 13 },
  withCount: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10 },
  count: { fontFamily: fonts.monoMedium, fontSize: 11 },
});
