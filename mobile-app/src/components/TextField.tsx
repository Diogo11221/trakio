import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { colors, durations, fonts, radii } from '@/theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  trailing?: ReactNode;
};

/** Labelled input — border warms to Volt while focused (Figma "Entrar"). */
export function TextField({ label, trailing, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.set(withTiming(focused ? 1 : 0, { duration: durations.fast }));
  }, [focus, focused]);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [colors.border, colors.voltBorder]),
  }));

  return (
    <View style={styles.field}>
      <AppText variant="small" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <Animated.View style={[styles.box, boxStyle]}>
        <TextInput
          {...rest}
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.volt}
          keyboardAppearance="dark"
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {trailing}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, width: '100%' },
  label: { fontFamily: fonts.uiMedium },
  box: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, height: '100%', color: colors.text, fontFamily: fonts.ui, fontSize: 15 },
});
