import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { Exercise } from '@/features/workout/data';
import { colors, springs } from '@/theme/tokens';

/**
 * "Treino/Segmento de progresso" — one 3 pt segment per exercise. The current
 * one fills with the sets already done; postponed ones turn grey.
 */
export function WorkoutProgress({ exercises }: { exercises: Exercise[] }) {
  const done = exercises.filter((e) => e.status === 'done').length;
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`${done} de ${exercises.length} exercícios feitos`}
    >
      {exercises.map((exercise) => (
        <Segment key={exercise.id} exercise={exercise} />
      ))}
    </View>
  );
}

function Segment({ exercise }: { exercise: Exercise }) {
  const doneSets = exercise.sets.filter((s) => s.done).length;
  const target =
    exercise.status === 'done' ? 1 : exercise.status === 'current' ? doneSets / exercise.sets.length : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withSpring(target, springs.gentle));
  }, [fill, target]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={[styles.segment, exercise.status === 'postponed' && styles.postponed]}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, height: 3, width: '100%' },
  segment: { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  postponed: { backgroundColor: colors.textFaint },
  fill: { height: '100%', backgroundColor: colors.volt, borderRadius: 1.5 },
});
