import { ScrollView, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { bodyOf, StudentAvatar } from '@/features/pt/components';
import type { Student } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import type { BodyData } from '@/features/tools/data';
import { colors, durations, fonts, pagePadding } from '@/theme/tokens';

export type MeasuredStudent = Student & { body: BodyData };

/** Students the PT has measurements for — the calculators start from their data. */
export function useMeasuredStudents(): MeasuredStudent[] {
  const { students } = useTrainer();
  return students.flatMap((s) => {
    const body = bodyOf(s);
    return body ? [{ ...s, body }] : [];
  });
}

/** Horizontal row of student chips ("Para quem?") at the top of the PT tools. */
export function StudentPicker({ value, onChange }: { value: string; onChange: (student: string) => void }) {
  const measuredStudents = useMeasuredStudents();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityRole="tablist"
    >
      {measuredStudents.map((s) => (
        <Chip key={s.id} student={s} selected={s.id === value} onPress={() => onChange(s.id)} />
      ))}
    </ScrollView>
  );
}

function Chip({ student, selected, onPress }: { student: Student; selected: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    borderColor: withTiming(selected ? colors.voltBorder : colors.border, { duration: durations.fast }),
    backgroundColor: interpolateColor(withTiming(selected ? 1 : 0, { duration: durations.fast }), [0, 1], [colors.surface, colors.surfaceRaised]),
  }));
  return (
    <PressableScale onPress={onPress} haptic="tick" pressedScale={0.95} accessibilityRole="tab" accessibilityState={{ selected }}>
      <Animated.View style={[styles.chip, style]}>
        <StudentAvatar student={student} size={26} />
        <AppText style={[styles.name, selected && styles.nameSelected]}>{student.firstName}</AppText>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -pagePadding },
  row: { gap: 8, paddingHorizontal: pagePadding },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, height: 36, borderRadius: 18, borderWidth: 1 },
  name: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  nameSelected: { color: colors.text },
});
