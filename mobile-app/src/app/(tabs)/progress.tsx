import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { MuscleMap, type MuscleTag } from '@/components/MuscleMap';
import { Reveal, Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { Sparkline } from '@/components/Sparkline';
import { Card, CardRow, SectionLabel } from '@/components/Surface';
import { useWeight } from '@/features/progress/weight';
import { decimal } from '@/features/tools/calc';
import { ToolGrid } from '@/features/tools/components';
import { useClientBody } from '@/features/tools/useClientBody';
import { Stepper } from '@/features/workout/components/Stepper';
import { usePlan } from '@/features/workout/plan';
import { maxSeries, startOfWeek, useHistory, type Session } from '@/features/workout/history';
import { haptics } from '@/lib/haptics';
import { refreshAll } from '@/lib/refresh';
import { useClientProfile } from '@/state/auth';
import { colors, fonts } from '@/theme/tokens';

const ranges = [
  { value: '1m', label: '1 mês' },
  { value: '2m', label: '2 meses' },
  { value: '1y', label: '1 ano' },
] as const;

type Range = (typeof ranges)[number]['value'];

const DAY = 24 * 3600 * 1000;
const rangeDays: Record<Range, number> = { '1m': 30, '2m': 61, '1y': 365 };

type Lift = { id: string; name: string; values: number[]; latest: number; change: number; stalled: boolean };

/** The four most-trained exercises in the range, with estimated max over time. */
function liftsIn(sessions: Session[], since: number, now: number): Lift[] {
  const counts = new Map<string, { count: number; name: string }>();
  for (const s of sessions) {
    if (s.finishedAt < since) continue;
    for (const e of s.exercises) counts.set(e.id, { count: (counts.get(e.id)?.count ?? 0) + 1, name: e.name });
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([id, { name }]) => {
      const series = maxSeries(sessions, id, since);
      const values = series.map((p) => p.kg);
      const first = values[0] ?? 0;
      const latest = values[values.length - 1] ?? 0;
      // No better in the last three weeks than before → "sem evolução".
      const cut = now - 21 * DAY;
      const before = series.filter((p) => p.at < cut).map((p) => p.kg);
      const after = series.filter((p) => p.at >= cut).map((p) => p.kg);
      const stalled = before.length > 0 && after.length >= 2 && Math.max(...after) <= Math.max(...before) + 0.01;
      return { id, name, values, latest, change: first > 0 ? ((latest - first) / first) * 100 : 0, stalled };
    });
}

/** Sets per muscle group this week, for the 3D map tags. */
function weekMuscles(sessions: Session[], weekStart: number, exerciseLibrary: { id: string; group: string }[]): MuscleTag[] {
  const sets = new Map<string, number>();
  for (const s of sessions) {
    if (s.finishedAt < weekStart) continue;
    for (const e of s.exercises) {
      const group = exerciseLibrary.find((x) => x.id === e.id)?.group ?? 'Outros';
      sets.set(group, (sets.get(group) ?? 0) + e.sets.length);
    }
  }
  return [...sets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count], i) => ({ label, sets: String(count), hot: i < 2 }));
}

/** Cliente · Progresso — everything here comes from the saved workouts and weigh-ins. */
export default function Progress() {
  const [range, setRange] = useState<Range>('2m');
  const [weighing, setWeighing] = useState(false);
  const profile = useClientProfile();
  const body = useClientBody();
  const { sessions } = useHistory();
  const { entries, logWeight } = useWeight();
  const [now] = useState(() => Date.now());
  const [draftKg, setDraftKg] = useState(profile.weightKg);

  const since = now - rangeDays[range] * DAY;
  const lifts = liftsIn(sessions, since, now);
  const { exerciseLibrary } = usePlan();
  const muscles = weekMuscles(sessions, startOfWeek(new Date(now)), exerciseLibrary);
  const weights = entries.filter((e) => e.at >= since);
  const firstWeight = weights[0]?.kg ?? profile.weightKg;
  const lastWeight = entries[entries.length - 1]?.kg ?? profile.weightKg;
  const weightChange = lastWeight - firstWeight;
  const rangeLabel = ranges.find((r) => r.value === range)?.label ?? '';

  return (
    <>
      <Screen gap={16} onRefresh={refreshAll}>
        <Reveal index={0} style={styles.header}>
          <AppText variant="title">Progresso</AppText>
          <SegmentedControl options={ranges} value={range} onChange={setRange} />
        </Reveal>

        <Reveal index={1}>
          <MuscleMap
            title="Volume esta semana"
            note={muscles.length > 0 ? 'Arrasta para rodar' : 'Sem treinos esta semana'}
            muscles={muscles}
            accessibilityLabel={
              muscles.length > 0
                ? `Mapa muscular: ${muscles.map((m) => `${m.label} ${m.sets} séries`).join(', ')}`
                : 'Mapa muscular sem treinos esta semana'
            }
          />
        </Reveal>

        <Reveal index={2}>
          <SectionLabel>Carga máxima estimada</SectionLabel>
        </Reveal>

        <Reveal index={3}>
          <Card>
            {lifts.length === 0 ? (
              <CardRow last style={styles.lift}>
                <AppText variant="small" tone="muted">
                  Faz o primeiro treino para veres aqui a evolução de cada exercício.
                </AppText>
              </CardRow>
            ) : (
              lifts.map((lift, i) => (
                <CardRow key={lift.id} last={i === lifts.length - 1} style={styles.lift}>
                  <View style={styles.flex}>
                    <AppText variant="label">{lift.name}</AppText>
                    {lift.stalled ? (
                      <View style={styles.stalled}>
                        <AppText variant="overline" tone="muted">
                          Sem evolução · 3 sem
                        </AppText>
                      </View>
                    ) : (
                      <AppText variant="numberSmall" tone={lift.change > 0 ? 'volt' : 'muted'}>
                        {lift.change > 0 ? '↑' : lift.change < 0 ? '↓' : '='} {decimal(Math.abs(lift.change))}%
                      </AppText>
                    )}
                  </View>
                  <Sparkline key={`${range}-${lift.id}`} values={lift.values} delay={380 + i * 90} />
                  <View style={styles.kg}>
                    <AppText style={styles.kgValue}>{decimal(Math.round(lift.latest * 2) / 2)}</AppText>
                    <AppText style={styles.kgUnit}>kg</AppText>
                  </View>
                </CardRow>
              ))
            )}
          </Card>
        </Reveal>

        <Reveal index={4}>
          <SectionLabel>Peso</SectionLabel>
        </Reveal>
        <Reveal index={5}>
          <Card>
            <CardRow last style={styles.lift}>
              <View style={styles.flex}>
                <View style={styles.weightRow}>
                  <AppText style={styles.weightValue}>{decimal(lastWeight)}</AppText>
                  <AppText style={styles.kgUnit}>kg</AppText>
                </View>
                <AppText variant="caption" tone="muted">
                  {weights.length > 1
                    ? `${weightChange >= 0 ? '+' : '−'}${decimal(Math.abs(weightChange))} kg em ${rangeLabel}`
                    : 'Regista o peso uma vez por semana, de manhã'}
                  {profile.goalWeightKg !== null ? ` · objetivo ${decimal(profile.goalWeightKg, 1, true)} kg` : ''}
                </AppText>
              </View>
              <Sparkline key={`w-${range}-${weights.length}`} values={weights.map((w) => w.kg)} delay={420} />
            </CardRow>
          </Card>
        </Reveal>
        <Reveal index={6}>
          <Button
            label="Registar peso de hoje"
            variant="outline"
            height={48}
            onPress={() => {
              setDraftKg(lastWeight);
              setWeighing(true);
            }}
          />
        </Reveal>

        <Reveal index={7}>
          <SectionLabel>Ferramentas</SectionLabel>
        </Reveal>
        <Reveal index={8}>
          <ToolGrid body={body} onOpen={(id) => router.push({ pathname: '/tools/[id]', params: { id } })} />
        </Reveal>
      </Screen>

      <Sheet
        visible={weighing}
        onClose={() => setWeighing(false)}
        accessibilityLabel="Registar peso"
        header={
          <View style={styles.sheetHead}>
            <AppText variant="subheading">Peso de hoje</AppText>
            <AppText variant="small" tone="muted">
              Atualiza também o teu perfil, as calorias e as calculadoras.
            </AppText>
          </View>
        }
      >
        <View style={styles.sheetBody}>
          <Stepper
            value={decimal(draftKg)}
            unit="kg"
            onStep={(d) => setDraftKg((kg) => Math.max(30, Math.round((kg + d * 0.1) * 10) / 10))}
            accessibilityLabel="Peso"
          />
          <Button
            label="Guardar"
            onPress={async () => {
              try {
                await logWeight(draftKg);
                haptics.success();
                setWeighing(false);
              } catch {
                Alert.alert('Não foi possível guardar', 'Verifica a ligação e tenta outra vez.');
              }
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3, alignItems: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lift: { paddingHorizontal: 16, paddingVertical: 13 },
  stalled: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kg: { width: 74, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3 },
  kgValue: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  kgUnit: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  weightValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  sheetHead: { gap: 6 },
  sheetBody: { gap: 16 },
});
