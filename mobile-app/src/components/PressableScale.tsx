import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics, type HapticKind } from '@/lib/haptics';
import { springs } from '@/theme/tokens';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout style for the touch target itself (flex, alignSelf…). */
  wrapperStyle?: StyleProp<ViewStyle>;
  /** How far the element sinks while pressed. */
  pressedScale?: number;
  /** Haptic played on press-in; `null` for silent controls. */
  haptic?: HapticKind | null;
};

/**
 * Base for every tappable surface: sinks slightly on touch with a spring and
 * fires a haptic on press-in, so feedback arrives before the finger lifts.
 */
export function PressableScale({
  children,
  style,
  wrapperStyle,
  pressedScale = 0.97,
  haptic = 'tap',
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      {...rest}
      style={wrapperStyle}
      disabled={disabled}
      onPressIn={(event) => {
        scale.set(withSpring(pressedScale, springs.press));
        if (haptic) haptics[haptic]();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, springs.press));
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}
