import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

/** Explicit acknowledgement before a destructive or paid action. */
export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const on = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(checked ? 1 : 0, { duration: 180 }));
  }, [checked, on]);
  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], ['rgba(212,255,0,0)', colors.volt]),
    borderColor: interpolateColor(on.get(), [0, 1], [colors.borderStrong, colors.volt]),
  }));
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, on.get()) }], opacity: on.get() }));

  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onToggle();
      }}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.View style={tickStyle}>
          <Icon name="checkDark" size={14} />
        </Animated.View>
      </Animated.View>
      <AppText variant="small" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
