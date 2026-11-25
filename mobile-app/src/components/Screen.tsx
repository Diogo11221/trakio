import { useEffect, useState, type ReactNode } from 'react';
import { Platform, RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/Icon';
import { haptics } from '@/lib/haptics';
import { enterRise } from '@/theme/motion';
import { colors, pagePadding } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Vertical gap between direct children (Figma auto-layout gap). */
  gap?: number;
  /** Extra bottom room, e.g. for a floating button or sticky footer. */
  bottomInset?: number;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Rendered outside the scroll view (sticky footers, FABs, sheets). */
  overlay?: ReactNode;
  /** Enables pull-to-refresh with the spinning Trakio ring. */
  onRefresh?: () => Promise<void>;
};

/** Pull distance (pt) at which the ring is fully drawn and a release refreshes. */
const PULL_READY = 64;
const RING = 28;

/** Dark page with the 20 pt gutter and safe-area aware top spacing (status bar + 12). */
export function Screen({
  children,
  gap = 16,
  bottomInset = 24,
  scroll = true,
  contentStyle,
  overlay,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + 12, paddingBottom: bottomInset, gap };

  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const spin = useSharedValue(0);
  const busy = useSharedValue(0);
  const armed = useSharedValue(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  // A tick when the pull crosses the "release to refresh" point.
  useAnimatedReaction(
    () => -scrollY.get() >= PULL_READY,
    (ready, previous) => {
      if (ready !== previous && ready && !armed.get() && busy.get() === 0) {
        armed.set(true);
        scheduleOnRN(haptics.tick);
      }
      if (!ready) armed.set(false);
    },
  );

  useEffect(() => {
    if (refreshing) {
      busy.set(withTiming(1, { duration: 160 }));
      spin.set(0);
      spin.set(withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1));
    } else {
      busy.set(withTiming(0, { duration: 220 }));
      cancelAnimation(spin);
    }
  }, [busy, refreshing, spin]);

  const ringStyle = useAnimatedStyle(() => {
    const pull = Math.max(0, -scrollY.get());
    const shown = Math.max(interpolate(pull, [8, PULL_READY], [0, 1], 'clamp'), busy.get());
    return {
      opacity: shown,
      transform: [
        { translateY: interpolate(pull, [0, PULL_READY], [-12, 0], 'clamp') * (1 - busy.get()) },
        { scale: 0.6 + shown * 0.4 },
        // Winds with the finger while pulling, then spins on its own while refreshing.
        { rotate: `${pull * 4 + spin.get() * 360}deg` },
      ],
    };
  });

  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    haptics.press();
    try {
      await onRefresh();
    } finally {
      haptics.success();
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      {onRefresh ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { top: insets.top + (Platform.OS === 'ios' ? 14 : 8) }, ringStyle]}
        >
          <Icon name="logoRing" size={RING} />
        </Animated.View>
      ) : null}
      {scroll ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                // The native spinner is hidden — the Trakio ring above replaces it.
                tintColor="transparent"
                colors={['transparent']}
                progressBackgroundColor="transparent"
                progressViewOffset={Platform.OS === 'android' ? -200 : undefined}
              />
            ) : undefined
          }
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, padding, contentStyle]}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

/** Staggered entrance for stacked sections — calm fade + short rise, 50 ms apart. */
export function Reveal({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={enterRise(60 + index * 50)} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: pagePadding },
  ring: { position: 'absolute', alignSelf: 'center', zIndex: 0 },
});
