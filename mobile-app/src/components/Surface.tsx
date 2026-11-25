import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, fonts, radii } from '@/theme/tokens';

/** Surface card: #14161A fill, 1 pt #23262E border. */
export function Card({
  children,
  radius = radii.xl,
  style,
}: {
  children: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, { borderRadius: radius }, style]}>{children}</View>;
}

/** Row inside a grouped card, with the hairline divider between rows. */
export function CardRow({
  children,
  last = false,
  style,
}: {
  children: ReactNode;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, !last && styles.divider, style]}>{children}</View>;
}

/** Small section label in sentence case (no uppercase micro-labels). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="overline" tone="muted">
      {children}
    </AppText>
  );
}

type PillTone = 'neutral' | 'volt' | 'raised';

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  return (
    <View style={[styles.pill, pillTones[tone]]}>
      <AppText style={[styles.pillText, { color: tone === 'volt' ? colors.volt : colors.textMuted }]}>{label}</AppText>
    </View>
  );
}

const pillTones: Record<PillTone, ViewStyle> = {
  neutral: { backgroundColor: colors.surface, borderColor: colors.border },
  volt: { backgroundColor: colors.surface, borderColor: 'rgba(212,255,0,0.45)' },
  raised: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
};

/** Round raised icon button (back, close, share). */
export function IconButton({
  icon,
  size = 36,
  iconSize = 18,
  onPress,
  accessibilityLabel,
  glass = false,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  onPress?: () => void;
  accessibilityLabel: string;
  glass?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        glass ? styles.glass : styles.raised,
      ]}
    >
      <Icon name={icon} size={iconSize} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pill: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: fonts.uiMedium, fontSize: 11 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  raised: { backgroundColor: colors.surfaceRaised },
  glass: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
});
