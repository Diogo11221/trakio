import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { easeOut } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const RING = 64;

/**
 * Opening screen: picks up from the native splash (same ring, same carbon
 * background), winds the ring into place, reveals the wordmark, then fades
 * away to the app. Runs once per launch, ~1.4 s.
 */
export function IntroOverlay() {
  const [done, setDone] = useState(false);
  const turn = useSharedValue(0);
  const word = useSharedValue(0);
  const shift = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    turn.set(withTiming(1, { duration: 760, easing: easeOut }));
    shift.set(withDelay(420, withTiming(1, { duration: 460, easing: easeOut })));
    word.set(withDelay(520, withTiming(1, { duration: 380, easing: easeOut })));
    fade.set(
      withDelay(
        1150,
        withTiming(0, { duration: 320, easing: easeOut }, (finished) => {
          if (finished) scheduleOnRN(setDone, true);
        }),
      ),
    );
  }, [fade, shift, turn, word]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const lockupStyle = useAnimatedStyle(() => ({
    // The ring starts centred like the native splash, then slides left to make room for the word.
    transform: [{ translateX: (1 - shift.get()) * 62 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(1 - turn.get()) * -180}deg` }, { scale: 0.9 + turn.get() * 0.1 }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.get(),
    transform: [{ translateX: (1 - word.get()) * -10 }],
  }));

  if (done) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <Animated.View style={[styles.lockup, lockupStyle]}>
        <Animated.View style={ringStyle}>
          <Icon name="logoRing" size={RING} />
        </Animated.View>
        <Animated.View style={wordStyle}>
          <AppText style={styles.word}>trakio</AppText>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  word: { fontFamily: fonts.displayBold, fontSize: 48, letterSpacing: -1.9, color: colors.text },
});
