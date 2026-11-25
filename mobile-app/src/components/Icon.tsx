import { Image, type ImageSource } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

/** Every static icon exported from the Figma file, keyed by a readable name. */
export const icons = {
  apple: require('@/assets/figma/icon-apple.svg'),
  arrowRight: require('@/assets/figma/icon-arrow-right.svg'),
  camera: require('@/assets/figma/icon-camera.svg'),
  cameraDark: require('@/assets/figma/icon-camera-dark.svg'),
  checkDark: require('@/assets/figma/icon-check-dark.svg'),
  checkVolt: require('@/assets/figma/icon-check-volt.svg'),
  checkVolt18: require('@/assets/figma/icon-check-volt-18.svg'),
  checkVolt36: require('@/assets/figma/icon-check-volt-36.svg'),
  chevronDown: require('@/assets/figma/icon-chevron-down.svg'),
  chevronLeft: require('@/assets/figma/icon-chevron-left.svg'),
  chevronLeftLarge: require('@/assets/figma/icon-chevron-left-lg.svg'),
  chevronRight: require('@/assets/figma/icon-chevron-right.svg'),
  chevronRightFaint: require('@/assets/figma/icon-chevron-right-faint.svg'),
  chevronRightSmall: require('@/assets/figma/icon-chevron-right-small.svg'),
  close: require('@/assets/figma/icon-close.svg'),
  closeLight: require('@/assets/figma/icon-close-light.svg'),
  dateNext: require('@/assets/figma/icon-date-next.svg'),
  datePrev: require('@/assets/figma/icon-date-prev.svg'),
  done: require('@/assets/figma/icon-done.svg'),
  dotGreen: require('@/assets/figma/dot-green.svg'),
  dotVolt: require('@/assets/figma/dot-volt.svg'),
  drag: require('@/assets/figma/icon-drag.svg'),
  dumbbell: require('@/assets/figma/icon-dumbbell.svg'),
  dumbbellMuted: require('@/assets/figma/icon-dumbbell-muted.svg'),
  google: require('@/assets/figma/icon-google.svg'),
  heart: require('@/assets/figma/icon-heart.svg'),
  info: require('@/assets/figma/icon-info.svg'),
  lock: require('@/assets/figma/icon-lock.svg'),
  logoRing: require('@/assets/figma/logo-ring.svg'),
  mic: require('@/assets/figma/icon-mic.svg'),
  search: require('@/assets/figma/icon-search.svg'),
  share: require('@/assets/figma/icon-share.svg'),
  skip: require('@/assets/figma/icon-skip.svg'),
  star: require('@/assets/figma/icon-star.svg'),
  starFilled: require('@/assets/figma/icon-star-filled.svg'),
  statusDone: require('@/assets/figma/status-done.svg'),
  statusPostponed: require('@/assets/figma/status-postponed.svg'),
  tabNutrition: require('@/assets/figma/tab-nutrition.svg'),
  tabProfile: require('@/assets/figma/tab-profile.svg'),
  tabProgress: require('@/assets/figma/tab-progress.svg'),
  tabToday: require('@/assets/figma/tab-today.svg'),
  tabTrain: require('@/assets/figma/tab-train.svg'),
  trophy: require('@/assets/figma/icon-trophy.svg'),
  users: require('@/assets/figma/icon-users.svg'),
  verified: require('@/assets/figma/icon-verified.svg'),
} satisfies Record<string, ImageSource>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size: number;
  /** Re-tints a monochrome icon, e.g. a tab glyph going from muted to Volt. */
  tint?: string;
  style?: StyleProp<ImageStyle>;
};

export function Icon({ name, size, tint, style }: IconProps) {
  return (
    <Image
      source={icons[name]}
      style={[{ width: size, height: size }, style]}
      tintColor={tint}
      contentFit="contain"
      transition={0}
      accessible={false}
    />
  );
}
