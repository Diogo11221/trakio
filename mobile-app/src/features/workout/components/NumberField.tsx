import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { haptics } from '@/lib/haptics';
import { colors, durations, fonts, radii } from '@/theme/tokens';

type NumberFieldProps = {
  value: number;
  /** Formats the stored value for display, e.g. 82.5 → "82,5". */
  format: (value: number) => string;
  /** Called on every valid keystroke so "Concluir série" always logs what's on screen. */
  onChange: (value: number) => void;
  decimals: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
};

function parse(text: string): number | null {
  const normalised = text.replace(',', '.').trim();
  if (normalised === '') return null;
  const value = Number(normalised);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Weight / reps box of the active set: tap to type with the number pad. */
export function NumberField({ value, format, onChange, decimals, accessibilityLabel, style }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const focus = useSharedValue(0);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [colors.borderStrong, colors.volt]),
  }));

  return (
    <Animated.View style={[styles.box, style, boxStyle]}>
      <TextInput
        value={draft ?? format(value)}
        onChangeText={(text) => {
          setDraft(text);
          const parsed = parse(text);
          if (parsed !== null) onChange(decimals ? parsed : Math.round(parsed));
        }}
        onFocus={() => {
          haptics.tick();
          setDraft(format(value));
          focus.set(withTiming(1, { duration: durations.fast }));
        }}
        onBlur={() => {
          setDraft(null);
          focus.set(withTiming(0, { duration: durations.base }));
        }}
        keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        keyboardAppearance="dark"
        selectionColor={colors.volt}
        maxLength={decimals ? 6 : 3}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
      />
    </Animated.View>
  );
}

/**
 * "OK" bar that rides on top of the keyboard — the iOS number pads have no
 * return key. Render once per screen that uses NumberField.
 */
export function NumberFieldAccessory() {
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardTop(e.endCoordinates.height);
      offset.set(withTiming(1, { duration: e.duration || 250 }));
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      offset.set(withTiming(0, { duration: e.duration || 250 }));
      setKeyboardTop(null);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [offset]);

  const barStyle = useAnimatedStyle(() => ({ opacity: offset.get() }));

  if (keyboardTop === null) return null;
  return (
    <Animated.View style={[styles.accessory, { bottom: keyboardTop }, barStyle]}>
      <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} accessibilityRole="button">
        <AppText style={styles.done}>OK</AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.input,
    justifyContent: 'center',
  },
  input: {
    height: '100%',
    textAlign: 'center',
    fontFamily: fonts.monoMedium,
    fontSize: 17,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  accessory: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  done: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.volt },
});
