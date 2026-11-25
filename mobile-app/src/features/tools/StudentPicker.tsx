import { ScrollView, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Portrait, type Person } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { students } from '@/features/pt/data';
import { studentBodies } from '@/features/tools/data';
import { colors, durations, fonts, pagePadding } from '@/theme/tokens';

/** Students the PT has measurements for — the calculators start from their data. */
export const measuredStudents = students.filter((s) => studentBodies[s.id] !== undefined);

/** Horizontal row of student chips ("Para quem?") at the top of the PT tools. */
export function StudentPicker({ value, onChange }: { value: Person; onChange: (student: Person) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityRole="tablist"
    >
      {measuredStudents.map((s) => (
        <Chip key={s.id} id={s.id} name={s.firstName} selected={s.id === value} onPress={() => onChange(s.id)} />
      ))}
    </ScrollView>
  );
}

function Chip({ id, name, selected, onPress }: { id: Person; name: string; selected: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    borderColor: withTiming(selected ? colors.voltBorder : colors.border, { duration: durations.fast }),
    backgroundColor: interpolateColor(withTiming(selected ? 1 : 0, { duration: durations.fast }), [0, 1], [colors.surface, colors.surfaceRaised]),
  }));
  return (
    <PressableScale onPress={onPress} haptic="tick" pressedScale={0.95} accessibilityRole="tab" accessibilityState={{ selected }}>
      <Animated.View style={[styles.chip, style]}>
        <Portrait person={id} size={26} />
        <AppText style={[styles.name, selected && styles.nameSelected]}>{name}</AppText>
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
