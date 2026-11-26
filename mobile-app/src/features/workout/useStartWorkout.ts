import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { Experience } from '@/features/auth/types';
import { buildWorkout, type PlanId, type WorkoutPlan } from '@/features/workout/data';
import { lastSets, useHistory } from '@/features/workout/history';
import { usePlan } from '@/features/workout/plan';
import { useWorkout } from '@/features/workout/store';
import { useClientProfile } from '@/state/auth';

/** New accounts start lighter than the template loads. */
const experienceScale: Record<Experience, number> = { new: 0.5, some: 0.8, advanced: 1 };

/** Starts (or resumes) a workout built from the plan and what was lifted last time. */
export function useStartWorkout() {
  const { load, inProgress, state } = useWorkout();
  const { sessions } = useHistory();
  const profile = useClientProfile();
  const { templateFor, exerciseLibrary } = usePlan();
  const scale = experienceScale[profile.experience];
  const last = (exerciseId: string) => lastSets(sessions, exerciseId);

  const open = (plan: WorkoutPlan) => {
    if (!inProgress) {
      load(plan);
      router.push('/workout');
      return;
    }
    if (state.plan.id === plan.id) {
      router.push('/workout');
      return;
    }
    Alert.alert('Tens um treino a meio', `${state.plan.title} · ${state.plan.focus} ainda não terminou.`, [
      { text: 'Continuar esse', onPress: () => router.push('/workout') },
      {
        text: 'Começar este',
        style: 'destructive',
        onPress: () => {
          load(plan);
          router.push('/workout');
        },
      },
    ]);
  };

  return {
    startPlan: (planId: PlanId) => {
      const template = templateFor(planId);
      if (template) open(buildWorkout(template, template.exercises, last, scale));
    },
    /** "Treino livre" with exercises picked from the library. */
    startFree: (exerciseIds: string[]) => {
      const picked = exerciseLibrary.filter((e) => exerciseIds.includes(e.id));
      if (picked.length === 0) return;
      const groups = [...new Set(picked.map((e) => e.group))];
      open(
        buildWorkout(
          { id: 'livre', title: 'Treino livre', focus: groups.join(' e '), estimatedMinutes: picked.length * 9 },
          picked,
          last,
          scale,
        ),
      );
    },
    resume: () => router.push('/workout'),
    inProgress,
    current: state.plan,
  };
}
