import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Card } from '@/components/Surface';
import { AdherenceBar, StudentAvatar, StudentTagPill } from '@/features/pt/components';
import type { Student } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { refreshMockData } from '@/lib/refresh';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

type Filter = 'all' | 'attention' | 'new';

const filters: { value: Filter; label: string; match: (s: Student) => boolean }[] = [
  { value: 'all', label: 'Todos', match: () => true },
  { value: 'attention', label: 'Precisam de atenção', match: (s) => s.tag === 'attention' },
  { value: 'new', label: 'Novos', match: (s) => s.tag === 'new' },
];

/** PT · Alunos. */
export default function Students() {
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const { students, refresh } = useTrainer();
  const [filter, setFilter] = useState<Filter>(params.filter ?? 'all');
  const [query, setQuery] = useState('');

  // "Ver todos" on Início can switch this tab to a filter after it's mounted.
  const [lastParam, setLastParam] = useState(params.filter);
  if (params.filter !== lastParam) {
    setLastParam(params.filter);
    if (params.filter) setFilter(params.filter);
  }

  const q = query.trim().toLowerCase();
  const active = filters.find((f) => f.value === filter) ?? filters[0];
  const list = students.filter(
    (s) => active.match(s) && (!q || s.name.toLowerCase().includes(q) || s.goal.toLowerCase().includes(q)),
  );

  const invite = () =>
    Share.share({
      message: 'Junta-te a mim no Trakio para acompanharmos os teus treinos: https://trakio.pt/convite/rita',
    });

  return (
    <Screen
      gap={16}
      onRefresh={async () => {
        refresh();
        await refreshMockData();
      }}
    >
      <Reveal index={0} style={styles.header}>
        <AppText variant="title">Alunos</AppText>
        <PressableScale onPress={invite} style={styles.invite} accessibilityRole="button" accessibilityLabel="Convidar aluno">
          <AppText style={styles.inviteText}>+  Convidar</AppText>
        </PressableScale>
      </Reveal>

      <Reveal index={1} style={styles.search}>
        <Icon name="search" size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Procurar aluno"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.volt}
          keyboardAppearance="dark"
          style={styles.searchInput}
          accessibilityLabel="Procurar aluno"
        />
      </Reveal>

      <Reveal index={2} style={styles.chips}>
        {filters.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            count={students.filter(f.match).length}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </Reveal>

      <Reveal index={3}>
        <Card>
          {list.map((student, i) => (
            <Animated.View
              key={student.id}
              layout={layoutGlide}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(140)}
            >
              <PressableScale
                onPress={() => router.push({ pathname: '/pt/student/[id]', params: { id: student.id } })}
                pressedScale={0.99}
                accessibilityLabel={student.name}
              >
                <View style={[styles.row, i < list.length - 1 && styles.divider]}>
                  <StudentAvatar student={student} size={44} />
                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <AppText style={styles.name}>{student.name}</AppText>
                      {student.tag ? <StudentTagPill tag={student.tag} /> : null}
                    </View>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {student.goal} · semana {student.week} de {student.weeks}
                    </AppText>
                  </View>
                  {student.adherence === null ? (
                    <AppText variant="overline" tone="muted" style={styles.regular}>
                      Começa hoje
                    </AppText>
                  ) : (
                    <View style={styles.adherence}>
                      <AppText style={styles.percent}>{Math.round(student.adherence * 100)}%</AppText>
                      <AdherenceBar value={student.adherence} delay={i * 60} />
                      <AppText style={styles.adherenceLabel}>treinos feitos</AppText>
                    </View>
                  )}
                </View>
              </PressableScale>
            </Animated.View>
          ))}
          {list.length === 0 ? (
            <AppText variant="small" tone="muted" style={styles.empty}>
              Nenhum aluno encontrado.
            </AppText>
          ) : null}
        </Card>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  regular: { fontFamily: fonts.ui },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { backgroundColor: colors.surfaceRaised, borderRadius: 18, paddingLeft: 12, paddingRight: 14, paddingVertical: 8 },
  inviteText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  search: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.ui, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  adherence: { alignItems: 'flex-end', gap: 4 },
  percent: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text },
  adherenceLabel: { fontFamily: fonts.ui, fontSize: 10, color: colors.textMuted },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
