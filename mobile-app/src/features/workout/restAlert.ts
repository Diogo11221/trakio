import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { AppState, Platform } from 'react-native';

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
  /** What comes after the rest — the set you're about to do. */
  next: {
    exerciseName: string;
    setNumber: number;
    totalSets: number;
    kg: number;
    reps: number;
    /** True when the rest closes an exercise and the next set starts a new one. */
    newExercise: boolean;
  };
};

const kgShort = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 });

/** "Volta ao treino" + exactly what to do next, e.g. "Supino plano · série 2 de 4 · 85 kg × 8". */
export function restAlertText({ next }: RestAlert): { title: string; body: string } {
  const load = next.kg > 0 ? `${kgShort.format(next.kg)} kg × ${next.reps}` : `${next.reps} repetições`;
  return {
    title: next.newExercise ? `Descanso feito · próximo exercício` : `Descanso feito · série ${next.setNumber} de ${next.totalSets}`,
    body: `${next.exerciseName} · ${load}`,
  };
}

/**
 * Schedules the end-of-rest alert so it reaches the athlete with the phone
 * locked or the app in the background. Replaces any pending one.
 */
export async function scheduleRestAlert(alert: RestAlert): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelRestAlert();
  const { title, body } = restAlertText(alert);
  scheduledId = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', interruptionLevel: 'timeSensitive' },
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
