import { useCallback, useEffect, useState } from 'react';

import type { MuscleTag } from '@/components/MuscleMap';
import type { BodyData } from '@/features/tools/data';
import { groupLabels } from '@/features/workout/data';
import { api } from '@/lib/api';
import type { ProgressDto, StudentDetailDto } from '@/lib/apiTypes';

/** Calculator inputs from a student's profile; tape measures start from typical values the PT edits. */
export function bodyFromDetail(d: StudentDetailDto): BodyData {
  const male = d.sex === 'male';
  return {
    sex: d.sex,
    age: d.age,
    weightKg: d.weightKg,
    heightCm: d.heightCm,
    waistCm: male ? 84 : 74,
    neckCm: male ? 38 : 32,
    hipCm: male ? 96 : 99,
    activity: d.activity,
    goal: d.student.goal,
    trainingMinutes: 60,
    lift: d.topLift
      ? { exercise: d.topLift.name, weightKg: Math.round(d.topLift.currentMax / 2.5) * 2.5, reps: 1 }
      : { exercise: 'Supino plano', weightKg: Math.max(20, Math.round((d.weightKg * 0.7) / 2.5) * 2.5), reps: 8 },
  };
}

/** Sets per muscle group this week, biggest first, for the 3D map tags. */
export function musclesFrom(progress: ProgressDto): MuscleTag[] {
  return Object.entries(progress.thisWeek.setsByGroup)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([group, sets], i) => ({ label: groupLabels[group] ?? group, sets: String(sets), hot: i < 2 }));
}

/** One student, as their PT sees them (only reachable while they pay this PT). */
export function useStudent(id: string | undefined) {
  const [state, setState] = useState<{ id: string; detail: StudentDetailDto | null; progress: ProgressDto | null; missing: boolean } | null>(null);

  const load = useCallback(
    (studentId: string) =>
      Promise.all([
        api.get<StudentDetailDto>(`/api/v1/trainer/students/${studentId}`),
        api.get<ProgressDto>(`/api/v1/trainer/students/${studentId}/progress`),
      ])
        .then(([detail, progress]) => setState({ id: studentId, detail, progress, missing: false }))
        .catch(() => setState({ id: studentId, detail: null, progress: null, missing: true })),
    [],
  );

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  const current = state && state.id === id ? state : null;
  const detail = current?.detail ?? null;
  return {
    detail,
    progress: current?.progress ?? null,
    missing: current?.missing ?? false,
    reload: () => (id ? load(id) : Promise.resolve()),
    body: detail ? bodyFromDetail(detail) : null,
  };
}
