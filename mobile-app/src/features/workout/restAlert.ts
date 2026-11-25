import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { formatKg } from '@/lib/format';

const CHANNEL_ID = 'rest-timer';
let scheduledId: string | null = null;
let prepared = false;

Notifications.setNotificationHandler({
  handleNotification: async () => {
    // Notifications are for when you're outside the app — inside it, the
    // screen, the plim and the vibration already tell you everything.
    const outside = AppState.currentState !== 'active';
    return { shouldShowBanner: outside, shouldShowList: outside, shouldPlaySound: outside, shouldSetBadge: false };
  },
});

/** Asks once, when the first workout starts — not on app launch. */
export async function prepareRestAlerts(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android' && !prepared) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Fim do descanso',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 220, 120, 420],
      sound: 'default',
    });
  }
  prepared = true;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    if (__DEV__) console.log('[trakio] notifications: allowed');
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (__DEV__) console.log(`[trakio] notifications: ${requested.granted ? 'allowed' : 'DENIED'} (asked now)`);
  return requested.granted;
}

type RestAlert = {
  seconds: number;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  nextKg: number;
  nextReps: number;
};

/**
 * Schedules the "Descanso terminado" alert so it still reaches the athlete
 * with the phone locked (Figma state C). Replaces any pending one.
 */
export async function scheduleRestAlert(alert: RestAlert): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelRestAlert();
  scheduledId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Descanso terminado',
      body: `Série ${alert.setNumber} de ${alert.totalSets} · ${alert.exerciseName} — próxima ${formatKg(alert.nextKg)} kg × ${alert.nextReps}`,
      sound: 'default',
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(alert.seconds)),
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelRestAlert(): Promise<void> {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

const STATUS_ID = 'workout-status';

export type WorkoutStatus = {
  title: string;
  body: string;
};

/**
 * Posted the moment the app goes to the background mid-workout, so the lock
 * screen / notification centre shows where you are (rest end time, next set).
 * iOS can't tick a live countdown in a plain notification — that needs a Live
 * Activity (development build) — so it shows the end time instead.
 */
export async function showWorkoutStatus(status: WorkoutStatus): Promise<void> {
  if (Platform.OS === 'web') return;
  if (__DEV__) console.log(`[trakio] status notification: ${status.title}`);
  await Notifications.scheduleNotificationAsync({
    identifier: STATUS_ID,
    content: {
      title: status.title,
      body: status.body,
      sound: false,
      sticky: true,
      autoDismiss: false,
      interruptionLevel: 'passive',
    },
    trigger: null,
  });
}

export async function clearWorkoutStatus(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.dismissNotificationAsync(STATUS_ID).catch(() => undefined);
}
