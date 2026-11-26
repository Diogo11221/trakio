import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Card, CardRow, SectionLabel } from '@/components/Surface';
import { usePlan } from '@/features/workout/plan';
import { startOfWeek, useHistory, type Session } from '@/features/workout/history';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { formatThousands } from '@/lib/format';
import { refreshAll } from '@/lib/refresh';
import { useClientProfile } from '@/state/auth';
import { colors, fonts } from '@/theme/tokens';

const dayName = new Intl.DateTimeFormat('pt-PT', { weekday: 'long' });
const longDate = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });

function weekday(at: number): string {
  const name = dayName.format(at).replace('-feira', '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function when(session: Session): string {
  const text = longDate.format(session.finishedAt).replace('-feira', '').replace('.', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Cliente · Treinar — this week's plan (from the history) and recent sessions. */
export default function Train() {
  const { sessions } = useHistory();
  const profile = useClientProfile();
  const { startPlan, startFree, inProgress, current, resume } = useStartWorkout();
  const [freeOpen, setFreeOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [weekStart] = useState(() => startOfWeek(new Date()));
  const { height } = useWindowDimensions();

  const { planTemplates, exerciseLibrary, nextPlanId: next, planName } = usePlan();
  const thisWeek = sessions.filter((s) => s.finishedAt >= weekStart);
  const recent = sessions.slice(0, 5);
  const groups = [...new Set(exerciseLibrary.map((e) => e.group))];

  return (
    <>
      <Screen gap={16} onRefresh={refreshAll}>
        <Reveal index={0}>
          <AppText variant="title">Treinar</AppText>
        </Reveal>

        <Reveal index={1}>
          <PressableScale
            onPress={() => (profile.trainer ? router.push('/chat') : router.push('/trainers'))}
            accessibilityLabel={profile.trainer ? `Falar com ${profile.trainer.name} sobre o plano` : 'Encontrar um PT'}
          >
            <Card style={styles.plan}>
              {profile.trainer ? <Avatar photoUri={profile.trainer.photoUri} size={36} name={profile.trainer.name} /> : (
                <View style={[styles.thumbSmall, styles.thumbIcon]}>
                  <Icon name="dumbbellMuted" size={18} />
                </View>
              )}
              <View style={styles.flex}>
                <AppText style={styles.planTitle}>
                  {profile.daysPerWeek}× por semana · {thisWeek.length} {thisWeek.length === 1 ? 'feito' : 'feitos'} esta semana
                </AppText>
                <AppText variant="caption" tone="muted">
                  {profile.trainer ? `${planName} · plano de ${profile.trainer.name} · toca para conversar` : `${planName} · queres um PT?`}
                </AppText>
              </View>
              <Icon name="chevronRightFaint" size={14} />
            </Card>
          </PressableScale>
        </Reveal>

        {inProgress ? (
          <Reveal index={2}>
            <Button label={`Continuar ${current.title} · ${current.focus}`} icon="arrowRight" height={50} onPress={resume} />
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <AppText style={styles.section}>Esta semana</AppText>
        </Reveal>

        <Reveal index={4}>
          <Card>
            {planTemplates.map((plan, i) => {
              const done = thisWeek.find((s) => s.planId === plan.id);
              const isNext = plan.id === next && !inProgress;
              return (
                <PressableScale
                  key={plan.id}
                  onPress={() => startPlan(plan.id)}
                  haptic="tap"
                  pressedScale={0.99}
                  accessibilityLabel={`${plan.title} · ${plan.focus}${done ? ', feito' : ''}`}
                >
                  <CardRow last={i === planTemplates.length - 1} style={styles.row}>
                    {isNext ? (
                      <Image source={require('@/assets/figma/render-bench.jpg')} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbIcon]}>
                        <Icon name={done ? 'done' : 'dumbbellMuted'} size={22} />
                      </View>
                    )}
                    <View style={styles.flex}>
                      <AppText style={styles.rowTitle}>
                        {plan.title} · {plan.focus}
                      </AppText>
                      <AppText variant="caption" tone={isNext ? 'volt' : 'muted'}>
                        {done ? `Feito ${weekday(done.finishedAt).toLowerCase()}` : isNext ? 'A seguir' : 'Por fazer'} · {plan.exercises.length} exercícios · ~
                        {plan.estimatedMinutes} min
                      </AppText>
                    </View>
                    {isNext ? (
                      <View style={styles.startPill}>
                        <AppText style={styles.startText}>Começar</AppText>
                      </View>
                    ) : (
                      <Icon name="chevronRightFaint" size={14} />
                    )}
                  </CardRow>
                </PressableScale>
              );
            })}
          </Card>
        </Reveal>

        <Reveal index={5}>
          <PressableScale haptic="tap" onPress={() => setFreeOpen(true)} accessibilityLabel="Treino livre" style={styles.freeWorkout}>
            <AppText style={styles.freeText}>+ Treino livre</AppText>
          </PressableScale>
        </Reveal>

        <Reveal index={6}>
          <AppText style={styles.section}>Últimos treinos</AppText>
        </Reveal>

        <Reveal index={7}>
          <Card>
            {recent.length === 0 ? (
              <CardRow last style={styles.row}>
                <AppText variant="small" tone="muted">
                  Ainda não fizeste nenhum treino. Os teus treinos aparecem aqui.
                </AppText>
              </CardRow>
            ) : (
              recent.map((session, i) => (
                <CardRow key={session.id} last={i === recent.length - 1} style={styles.row}>
                  <Icon name="done" size={18} />
                  <View style={styles.flex}>
                    <AppText variant="label">
                      {session.title} · {session.focus}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {when(session)} · {Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))} min ·{' '}
                      {formatThousands(session.volume)} kg
                    </AppText>
                  </View>
                  {session.records.length > 0 ? (
                    <View style={styles.record}>
                      <AppText variant="overline" tone="volt">
                        {session.records.length} {session.records.length === 1 ? 'recorde' : 'recordes'}
                      </AppText>
                    </View>
                  ) : null}
                </CardRow>
              ))
            )}
          </Card>
        </Reveal>
      </Screen>

      <Sheet
        visible={freeOpen}
        onClose={() => setFreeOpen(false)}
        accessibilityLabel="Treino livre"
        header={
          <View style={styles.sheetHead}>
            <AppText variant="subheading">Treino livre</AppText>
            <AppText variant="small" tone="muted">
              Escolhe os exercícios. As cargas começam no que fizeste da última vez.
            </AppText>
          </View>
        }
      >
        <View style={styles.free}>
          <ScrollView
            style={{ maxHeight: height * 0.5 }}
            contentContainerStyle={styles.freeList}
            showsVerticalScrollIndicator={false}
          >
            {groups.map((group) => (
              <View key={group} style={styles.freeGroup}>
                <SectionLabel>{group}</SectionLabel>
                {exerciseLibrary
                  .filter((e) => e.group === group)
                  .map((e) => (
                    <Checkbox
                      key={e.id}
                      label={`${e.name} · ${e.sets} × ${e.reps}`}
                      checked={picked.includes(e.id)}
                      onToggle={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                    />
                  ))}
              </View>
            ))}
          </ScrollView>
          <Button
            label={picked.length === 0 ? 'Escolhe pelo menos 1' : `Começar com ${picked.length} ${picked.length === 1 ? 'exercício' : 'exercícios'}`}
            disabled={picked.length === 0}
            onPress={() => {
              setFreeOpen(false);
              const ids = picked;
              setPicked([]);
              setTimeout(() => startFree(ids), 260);
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  planTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  section: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.text },
  row: { paddingHorizontal: 14, paddingVertical: 12 },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  thumbSmall: { width: 36, height: 36, borderRadius: 18 },
  sheetHead: { gap: 6 },
  free: { gap: 16 },
  freeList: { gap: 16 },
  freeGroup: { gap: 10 },
  thumbIcon: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  startPill: { backgroundColor: colors.volt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  startText: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.bg },
  freeWorkout: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
  record: { backgroundColor: colors.surfaceRaised, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
});
