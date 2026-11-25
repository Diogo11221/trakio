import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

/** Shared curves and layout animations — ease-out timings, no springy overshoot. */
export const easeOut = Easing.out(Easing.cubic);

/** Section entrance: short rise + fade. */
export function enterRise(delay = 0) {
  return FadeInDown.duration(420).delay(delay).easing(easeOut).withInitialValues({ transform: [{ translateY: 12 }] });
}

/** Plain fade for things that shouldn't move (check marks, swapped content). */
export function enterFade(delay = 0, duration = 260) {
  return FadeIn.duration(duration).delay(delay);
}

/** Rows that change size or order glide into place. */
export const layoutGlide = LinearTransition.duration(240).easing(easeOut);
