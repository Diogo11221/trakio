import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Person } from '@/components/Portrait';
import { listAccounts, saveProfile } from '@/features/auth/localAuth';
import type { ClientProfile } from '@/features/auth/types';
import { parseWeights } from '@/features/progress/weight';
import type { Student } from '@/features/pt/data';
import { oneRepMax } from '@/features/tools/calc';
import { bodyFromProfile, type BodyData } from '@/features/tools/data';
import { parseSessions, readinessFrom, startOfWeek, type Session } from '@/features/workout/history';
import { accountKey } from '@/lib/persist';

const WEEK = 7 * 24 * 3600 * 1000;

const goalName: Record<ClientProfile['goal'], string> = {
  lose: 'Perda de peso',
  maintain: 'Manutenção',
  gain: 'Hipertrofia',
};

async function readJson(key: string | null): Promise<unknown> {
  if (!key) return null;
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
  } catch {
    return null;
  }
}

/** Best estimated max in the history, its exercise and the change since the first session. */
function bestLift(sessions: Session[]): { name: string; kg: number; change: number } | null {
  let best: { name: string; kg: number; id: string } | null = null;
  for (const s of sessions) {
    for (const e of s.exercises) {
      for (const set of e.sets) {
        const m = oneRepMax(set.kg, set.reps);
        if (!best || m > best.kg) best = { name: e.name, kg: m, id: e.id };
      }
    }
  }
  if (!best) return null;
  const oldest = [...sessions].reverse().find((s) => s.exercises.some((e) => e.id === best?.id));
  const first = oldest?.exercises.find((e) => e.id === best?.id)?.sets.reduce((m, s) => Math.max(m, oneRepMax(s.kg, s.reps)), 0) ?? 0;
  return { name: best.name, kg: best.kg, change: first > 0 ? ((best.kg - first) / first) * 100 : 0 };
}

export type LocalStudent = Student & { body: BodyData };

/**
 * Students who created an account on this phone and hired `trainer` in the
 * marketplace, with numbers from their own saved data — what backend-core
 * will return for "my students".
 */
export async function loadLocalStudents(trainer: Person, now: number): Promise<LocalStudent[]> {
  const accounts = await listAccounts();
  const mine = accounts.filter(
    (a) => a.profile?.kind === 'client' && a.profile.coached && a.profile.trainer?.id === trainer && !a.profile.demoPerson,
  );
  return Promise.all(
    mine.map(async (account) => {
      const profile = account.profile as ClientProfile;
      const sessions = parseSessions(await readJson(accountKey(account.id, 'history'))) ?? [];
      const weights = parseWeights(await readJson(accountKey(account.id, 'weight'))) ?? [];
      const latestWeight = weights[weights.length - 1]?.kg ?? profile.weightKg;
      const since = profile.trainer?.since ?? Date.parse(account.createdAt);
      const week = Math.max(1, Math.floor((now - since) / WEEK) + 1);
      const last4 = sessions.filter((s) => now - s.finishedAt < 4 * WEEK).length;
      const thisWeek = sessions.filter((s) => s.finishedAt >= startOfWeek(new Date(now))).length;
      const lift = bestLift(sessions);
      const readiness = readinessFrom(sessions, now);
      const first = profile.name.split(' ')[0] ?? profile.name;
      const stale = sessions[0] ? now - sessions[0].finishedAt > 7 * 24 * 3600 * 1000 : week > 1;
      return {
        id: `client:${account.id}`,
        accountId: account.id,
        photoUri: profile.photoUri,
        name: profile.name,
        firstName: first,
        goal: goalName[profile.goal],
        week,
        weeks: 12,
        adherence: sessions.length === 0 ? null : Math.min(1, last4 / Math.max(1, profile.daysPerWeek * 4)),
        tag: week === 1 ? 'new' : stale ? 'attention' : null,
        alert: stale ? 'Sem treinos há mais de uma semana' : undefined,
        pack: profile.trainer?.pack ?? 'Treino',
        price: profile.trainer?.price ?? 0,
        stats: lift
          ? {
              workouts: `${thisWeek} de ${profile.daysPerWeek}`,
              maxLoad: `${Math.round(lift.kg)} kg`,
              maxLoadChange: lift.change > 0.5 ? `↑ ${Math.round(lift.change)}%` : '',
              maxLoadLabel: `máximo · ${lift.name.toLowerCase()}`,
              readiness: readiness.value,
            }
          : undefined,
        body: bodyFromProfile({ ...profile, weightKg: latestWeight }),
      } satisfies LocalStudent;
    }),
  );
}

/** "Terminar acompanhamento": the student's account goes back to training alone. */
export async function endCoaching(accountId: string): Promise<void> {
  const account = (await listAccounts()).find((a) => a.id === accountId);
  if (account?.profile?.kind !== 'client') return;
  await saveProfile(accountId, { ...account.profile, coached: false, trainer: null });
}
