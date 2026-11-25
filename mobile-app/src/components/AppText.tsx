import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

/**
 * Type scale lifted from the client screens in Figma. Display = Space Grotesk,
 * UI = Inter, numbers = JetBrains Mono (tabular, so timers never jump).
 */
const variants = {
  hero: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.02 },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.84 },
  heading: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.44 },
  subheading: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 },
  bodyStrong: { fontFamily: fonts.uiSemiBold, fontSize: 15 },
  body: { fontFamily: fonts.ui, fontSize: 15 },
  label: { fontFamily: fonts.uiMedium, fontSize: 14 },
  small: { fontFamily: fonts.ui, fontSize: 13 },
  caption: { fontFamily: fonts.ui, fontSize: 12 },
  overline: { fontFamily: fonts.uiMedium, fontSize: 11 },
  number: { fontFamily: fonts.monoMedium, fontSize: 15, fontVariant: ['tabular-nums'] },
  numberSmall: { fontFamily: fonts.mono, fontSize: 11, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof variants;

type Tone = 'default' | 'soft' | 'muted' | 'faint' | 'volt' | 'inverse';

const tones: Record<Tone, string> = {
  default: colors.text,
  soft: colors.textSoft,
  muted: colors.textMuted,
  faint: colors.textFaint,
  volt: colors.volt,
  inverse: colors.bg,
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: Tone;
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[styles.base, variants[variant], { color: tones[tone] }, style]} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
