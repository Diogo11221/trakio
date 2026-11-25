/**
 * Trakio design tokens — mirrors the "Trakio Tokens" variables in Figma
 * ("Trakio — Design") and `landing-page/src/styles/tokens.css`.
 */
export const colors = {
  bg: '#0B0C0E',
  surface: '#14161A',
  surfaceRaised: '#1C1F25',
  input: '#0F1114',
  border: '#23262E',
  borderStrong: '#2E323B',
  text: '#F4F5F7',
  textSoft: '#C7CCD4',
  textMuted: '#8E95A2',
  textFaint: '#5C626E',
  volt: '#D4FF00',
  viewport3d: '#141819',
  ringTrack: '#17191D',
  success: '#3DB361',
  tabBar: 'rgba(15, 17, 20, 0.94)',
  scrim: 'rgba(0, 0, 0, 0.62)',
  glass: 'rgba(0, 0, 0, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  voltBorder: 'rgba(212, 255, 0, 0.6)',
  voltBorderSoft: 'rgba(212, 255, 0, 0.35)',
} as const;

export const fonts = {
  display: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemiBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  sheet: 28,
  pill: 999,
} as const;

/** Horizontal page padding used by every client screen in Figma. */
export const pagePadding = 20;

/**
 * Motion presets — springs are clamped so nothing overshoots its target:
 * movement settles like a damped physical object instead of bouncing.
 */
export const springs = {
  press: { damping: 30, stiffness: 520, mass: 0.6, overshootClamping: true },
  snappy: { damping: 28, stiffness: 280, overshootClamping: true },
  gentle: { damping: 30, stiffness: 160, overshootClamping: true },
  sheet: { damping: 32, stiffness: 260, mass: 0.9, overshootClamping: true },
} as const;

export const durations = {
  fast: 160,
  base: 260,
  slow: 520,
  ring: 900,
} as const;
