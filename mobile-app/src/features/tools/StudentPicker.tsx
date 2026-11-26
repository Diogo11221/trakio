import { ScrollView, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import type { Student } from '@/features/pt/data';
import { colors, durations, fonts, pagePadding } from '@/theme/tokens';

/** Horizontal row of student chips ("Para quem?") at the top of the PT tools. */
export function StudentPicker({ students, value, onChange }: { students: Student[]; value: string | null; onChange: (studentId: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll} accessibilityRole="tablist">
      {students.map((s) => (
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
        <Avatar photoUri={student.photoUri} size={26} name={student.name} />
        <AppText style={[styles.name, selected && styles.nameSelected]}>{student.firstName}</AppText>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -pagePadding },
  row: { paddingHorizontal: pagePadding, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, paddingLeft: 4, paddingRight: 12, paddingVertical: 4 },
  name: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  nameSelected: { color: colors.text },
});
