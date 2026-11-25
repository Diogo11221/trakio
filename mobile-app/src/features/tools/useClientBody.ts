import { bodyFromProfile, type BodyData } from '@/features/tools/data';
import { lastSets, useHistory } from '@/features/workout/history';
import { useClientProfile } from '@/state/auth';

/** Calculator inputs for the signed-in client: profile + the last bench press logged. */
export function useClientBody(): BodyData {
  const profile = useClientProfile();
  const { sessions } = useHistory();
  const bench = lastSets(sessions, 'supino-plano');
  const top = bench?.reduce((best, s) => (s.kg * (1 + s.reps / 30) > best.kg * (1 + best.reps / 30) ? s : best));
  return bodyFromProfile(profile, top ? { exercise: 'Supino plano', weightKg: top.kg, reps: top.reps } : null);
}
