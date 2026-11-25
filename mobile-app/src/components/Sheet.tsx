import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { colors, durations, radii, springs } from '@/theme/tokens';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Header area — also the drag handle for swipe-to-dismiss. */
  header?: ReactNode;
  children: ReactNode;
  accessibilityLabel: string;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

/**
 * Bottom sheet from the Figma states (Ordem do treino, Premium): springs up
 * over a scrim, and follows the finger when dragged down by its header.
 */
export function Sheet({ visible, onClose, header, children, accessibilityLabel }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(height);
  const drag = useSharedValue(0);
  const passedThreshold = useSharedValue(false);

  // Mount immediately when opened; when closed, let the exit animation finish
  // (see the timing callback below) before unmounting the modal.
  const isOpen = visible || mounted;
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      offset.set(withSpring(0, springs.sheet));
    } else {
      offset.set(
        withTiming(height, { duration: durations.base }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [drag, height, offset, visible]);

  const pan = usePanGesture({
    activeOffsetY: 6,
    failOffsetX: [-24, 24],
    onUpdate: (e) => {
      'worklet';
      // Rubber-band when pulled up, 1:1 when pulled down.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY * 0.15);
      const beyond = e.translationY > DISMISS_DISTANCE;
      if (beyond !== passedThreshold.get()) {
        passedThreshold.set(beyond);
        if (beyond) scheduleOnRN(haptics.threshold);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      passedThreshold.set(false);
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        drag.set(withSpring(0, springs.sheet));
      }
    },
  });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() + drag.get() }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get() + drag.get(), [0, height * 0.6], [1, 0], 'clamp'),
  }));

  if (!isOpen) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Fechar" />
        </Animated.View>
        <Animated.View
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }, panelStyle]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.grabber} />
              {header}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  handleArea: { gap: 16, alignItems: 'stretch' },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
});
