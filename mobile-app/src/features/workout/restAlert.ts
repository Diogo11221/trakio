import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { formatKg } from '@/lib/format';

const CHANNEL_ID = 'rest-timer';
let scheduledId: string | null = null;
let prepared = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // In the foreground the in-app timer already vibrates — don't double up.
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
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
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
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
