import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * The "plim" at the end of a rest. Mixes with whatever the athlete is
 * listening to (ducks it briefly) and still plays with the silent switch on —
 * it's an alarm, not a UI sound.
 */
let player: AudioPlayer | null = null;
let configured = false;
let enabled = true;

/** "Som do fim do descanso" in Perfil. */
export function setPlimEnabled(value: boolean) {
  enabled = value;
}

async function ensurePlayer(): Promise<AudioPlayer | null> {
  if (Platform.OS === 'web') return null;
  if (!configured) {
    configured = true;
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
  }
  if (!player) player = createAudioPlayer(require('@/assets/sounds/plim.wav'));
  return player;
}

/** Load the sound ahead of time so the first plim isn't late. */
export function preloadPlim() {
  ensurePlayer().catch(() => undefined);
}

export async function playPlim() {
  if (!enabled) return;
  const p = await ensurePlayer();
  if (!p) return;
  try {
    await p.seekTo(0);
    p.play();
  } catch {
    // A missed chime must never break the workout.
  }
}
