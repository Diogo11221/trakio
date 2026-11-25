import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * One place for every haptic in the app so the "Vibração" switch in Perfil
 * can silence them all. The flag lives at module level (not in React state)
 * so gesture worklets can reach it through `scheduleOnRN`.
 */
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function run(effect: () => Promise<void>) {
  if (!enabled || Platform.OS === 'web') return;
  effect().catch(() => {
    // Haptics are a nicety — never let a missing engine break an interaction.
  });
}

export const haptics = {
  /** Selection changes: tabs, chips, segmented controls, scrubbing ticks. */
  tick: () => run(() => Haptics.selectionAsync()),
  /** Light tap on buttons and toggles. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Firm press: primary CTAs, picking up a draggable row. */
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Crossing a gesture threshold (swipe-to-complete, sheet snap). */
  threshold: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  /** A set or workout was saved. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Rest is over: a pattern strong enough to feel through a pocket. */
  restOver: () => {
    if (!enabled || Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 220, 120, 220, 120, 420]);
      return;
    }
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 260);
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 520);
  },
};

export type HapticKind = Exclude<keyof typeof haptics, 'restOver'>;
