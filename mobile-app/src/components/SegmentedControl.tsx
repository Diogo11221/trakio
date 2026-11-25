import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { haptics } from '@/lib/haptics';
import { colors, fonts, springs } from '@/theme/tokens';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  /** Glass look used over the 3D exercise demo. */
  glass?: boolean;
  /** Full-width with equal segments and a dark raised thumb (Planos). */
  stretch?: boolean;
  style?: ViewStyle;
};

/** Segmented control whose light "thumb" glides between options. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  glass = false,
  stretch = false,
  style,
}: SegmentedControlProps<T>) {
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const active = layouts[value];

  const thumbStyle = useAnimatedStyle(() => {
    if (!active) return { opacity: 0 };
    return {
      opacity: 1,
      width: withSpring(active.width, springs.snappy),
      transform: [{ translateX: withSpring(active.x, springs.snappy) }],
    };
  });

  const sm = size === 'sm';

  return (
    <View
      style={[
        styles.track,
        sm ? styles.trackSm : styles.trackMd,
        glass ? styles.glass : styles.solid,
        stretch && styles.stretch,
        style,
      ]}
      accessibilityRole="tablist"
    >
      <Animated.View
        style={[styles.thumb, sm ? styles.thumbSm : styles.thumbMd, stretch && styles.thumbRaised, thumbStyle]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onLayout={(e) => {
              const layout = e.nativeEvent.layout;
              setLayouts((prev) => ({ ...prev, [option.value]: layout }));
            }}
            onPress={() => {
              if (selected) return;
              haptics.tick();
              onChange(option.value);
            }}
            style={[sm ? styles.segmentSm : styles.segmentMd, stretch && styles.segmentStretch]}
          >
            <AppText
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: sm ? 11 : stretch ? 13 : 12,
                color: selected ? (stretch ? colors.text : colors.bg) : colors.textMuted,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, gap: 2 },
  trackSm: { padding: 3, borderRadius: 8 },
  trackMd: { padding: 3, borderRadius: 9 },
  glass: { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: colors.glassBorder },
  solid: { backgroundColor: colors.surface, borderColor: colors.border },
  thumb: { position: 'absolute', backgroundColor: colors.text, left: 0 },
  thumbSm: { top: 3, bottom: 3, borderRadius: 6 },
  thumbMd: { top: 3, bottom: 3, borderRadius: 6 },
  segmentSm: { paddingHorizontal: 8, paddingVertical: 4 },
  segmentMd: { paddingHorizontal: 9, paddingVertical: 4 },
  stretch: { alignSelf: 'stretch', borderRadius: 12 },
  thumbRaised: { backgroundColor: colors.surfaceRaised, borderRadius: 9 },
  segmentStretch: { flex: 1, alignItems: 'center', paddingVertical: 8 },
});
