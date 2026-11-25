import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { fonts, springs } from '@/theme/tokens';

/** Brand mark A — ring + tracking point — winds into place on mount. */
export function Logo({ size = 28 }: { size?: number }) {
  const turn = useSharedValue(-120);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    turn.set(withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }));
    scale.set(withSpring(1, springs.gentle));
  }, [scale, turn]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get()}deg` }, { scale: scale.get() }],
  }));

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Trakio">
      <Animated.View style={ringStyle}>
        <Icon name="logoRing" size={size} />
      </Animated.View>
      <AppText style={[styles.word, { fontSize: size - 4, letterSpacing: -(size - 4) * 0.04 }]}>
        trakio
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontFamily: fonts.displayBold },
});
