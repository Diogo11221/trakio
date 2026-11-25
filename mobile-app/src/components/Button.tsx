import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import type { HapticKind } from '@/lib/haptics';
import { colors, fonts, radii } from '@/theme/tokens';

type Variant = 'primary' | 'outline' | 'light' | 'ghost';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  /** Icon placed before the label (social sign-in buttons). */
  leadingIcon?: IconName;
  height?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: HapticKind | null;
};

const variantStyles: Record<Variant, { container: ViewStyle; text: string }> = {
  primary: { container: { backgroundColor: colors.volt }, text: colors.bg },
  outline: { container: { borderWidth: 1, borderColor: colors.borderStrong }, text: colors.text },
  light: { container: { backgroundColor: colors.text }, text: colors.bg },
  ghost: { container: {}, text: colors.textMuted },
};

/** CTA in the Figma style: 54–56 pt tall, 16 pt radius, Inter SemiBold. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  leadingIcon,
  height = 56,
  style,
  disabled,
  haptic = variant === 'primary' ? 'press' : 'tap',
}: ButtonProps) {
  const { container, text } = variantStyles[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      wrapperStyle={styles.wrapper}
      style={[styles.base, { height }, container, style]}
    >
      <View style={styles.row}>
        {leadingIcon ? <Icon name={leadingIcon} size={18} /> : null}
        <AppText
          style={{
            color: text,
            fontFamily: variant === 'ghost' ? fonts.uiMedium : fonts.uiSemiBold,
            fontSize: height >= 54 ? 16 : 15,
          }}
        >
          {label}
        </AppText>
        {icon ? <Icon name={icon} size={16} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch' },
  base: {
    width: '100%',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
