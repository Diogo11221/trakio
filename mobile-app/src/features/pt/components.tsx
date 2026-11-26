import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/Surface';
import { haptics } from '@/lib/haptics';
import { easeOut } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';
import { Avatar } from '@/components/Avatar';
import type { Person } from '@/components/Portrait';
import { studentBodies, type BodyData } from '@/features/tools/data';

export type Stat = { value: string; label: string; dot?: boolean; extra?: ReactNode };

/** Three numbers side by side with hairline dividers (Início, Aluno). */
export function StatStrip({ stats, size = 19 }: { stats: Stat[]; size?: number }) {
  return (
    <Card style={styles.strip}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={[styles.stat, i < stats.length - 1 && styles.statDivider]}>
          <View style={styles.statTop}>
            {stat.dot ? <Icon name="dotVolt" size={7} /> : null}
            <AppText style={[styles.statValue, { fontSize: size }]} numberOfLines={1}>
              {stat.value}
            </AppText>
            {stat.extra}
          </View>
          <AppText variant="overline" tone="muted" style={styles.statLabel}>
            {stat.label}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

/** Bold section title with an optional "Ver todos" link on the right. */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      {action ? (
        <Pressable
          hitSlop={10}
          onPress={() => {
            haptics.tick();
            onAction?.();
          }}
          accessibilityRole="link"
        >
          <AppText style={styles.sectionAction}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Thin white bar that fills to the share of workouts done. */
export function AdherenceBar({ value, delay = 0, width = 44 }: { value: number; delay?: number; width?: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(250 + delay, withTiming(value, { duration: 700, easing: easeOut })));
  }, [delay, fill, value]);
  const style = useAnimatedStyle(() => ({ width: width * fill.get() }));
  return (
    <View style={[styles.track, { width }]}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

/** Small status tag next to a name: "Atenção" (neutral) or "Novo" (Volt). */
export function StudentTagPill({ tag }: { tag: 'attention' | 'new' }) {
  const isNew = tag === 'new';
  return (
    <View style={[styles.tag, isNew ? styles.tagNew : styles.tagAttention]}>
      <AppText style={[styles.tagText, { color: isNew ? colors.bg : colors.textMuted }]}>
        {isNew ? 'Novo' : 'Atenção'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row' },
  stat: { flex: 1, gap: 4, paddingLeft: 14, paddingRight: 6, paddingVertical: 14 },
  statDivider: { borderRightWidth: 1, borderRightColor: colors.border },
  statTop: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: fonts.monoMedium, color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.ui },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.text },
  sectionAction: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.text },
  tag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  tagAttention: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
  tagNew: { backgroundColor: colors.volt },
  tagText: { fontFamily: fonts.uiMedium, fontSize: 10 },
});

/** Student photo: Figma portrait for demo students, their own photo (or the camera circle) for real accounts. */
export function StudentAvatar({
  student,
  size,
}: {
  student: { name: string; person?: Person; photoUri?: string | null };
  size: number;
}) {
  return <Avatar photoUri={student.photoUri ?? null} demoPerson={student.person} size={size} name={student.name} />;
}

/** Calculator inputs for a student: their own measurements (real accounts) or the demo ones. */
export function bodyOf(student: { person?: Person; body?: BodyData }): BodyData | undefined {
  return student.body ?? (student.person ? studentBodies[student.person] : undefined);
}
