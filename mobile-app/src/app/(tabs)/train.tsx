import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Card, CardRow } from '@/components/Surface';
import { recentWorkouts, weekPlan } from '@/features/workout/data';
import { useWorkout } from '@/features/workout/store';
import { colors, fonts } from '@/theme/tokens';

/** Cliente · Treinar — this week's plan and recent sessions. */
export default function Train() {
  const { start } = useWorkout();

  const startToday = () => {
    start();
    router.push('/workout');
  };

  return (
    <Screen gap={16}>
      <Reveal index={0}>
        <AppText variant="title">Treinar</AppText>
      </Reveal>

      <Reveal index={1}>
        <PressableScale onPress={() => router.push('/trainers/rita')} accessibilityLabel="Plano da Rita Santos">
          <Card style={styles.plan}>
            <Portrait person="rita" size={36} />
            <View style={styles.flex}>
              <AppText style={styles.planTitle}>Hipertrofia · semana 6 de 12</AppText>
              <AppText variant="caption" tone="muted">
                Plano da Rita Santos
              </AppText>
            </View>
            <Icon name="chevronRightFaint" size={14} />
          </Card>
        </PressableScale>
      </Reveal>

      <Reveal index={2}>
        <AppText style={styles.section}>Esta semana</AppText>
      </Reveal>

      <Reveal index={3}>
        <Card>
          {weekPlan.map((workout, i) => {
            const last = i === weekPlan.length - 1;
            return (
              <PressableScale
                key={workout.id}
                onPress={workout.today ? startToday : undefined}
                haptic={workout.today ? 'tap' : 'tick'}
                pressedScale={0.99}
                accessibilityLabel={workout.title}
              >
                <CardRow last={last} style={styles.row}>
                  {workout.today ? (
                    <Image
                      source={require('@/assets/figma/render-bench.jpg')}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbIcon]}>
                      <Icon name="dumbbellMuted" size={22} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <AppText style={styles.rowTitle}>{workout.title}</AppText>
                    <AppText variant="caption" tone={workout.today ? 'volt' : 'muted'}>
                      {workout.when} · {workout.exercises} exercícios · ~{workout.minutes} min
                    </AppText>
                  </View>
                  {workout.today ? (
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

      <Reveal index={4}>
        <PressableScale haptic="tap" accessibilityLabel="Treino livre" style={styles.freeWorkout}>
          <AppText style={styles.freeText}>+ Treino livre</AppText>
        </PressableScale>
      </Reveal>

      <Reveal index={5}>
        <AppText style={styles.section}>Últimos treinos</AppText>
      </Reveal>

      <Reveal index={6}>
        <Card>
          {recentWorkouts.map((workout, i) => (
            <CardRow key={workout.id} last={i === recentWorkouts.length - 1} style={styles.row}>
              <Icon name="done" size={18} />
              <View style={styles.flex}>
                <AppText variant="label">{workout.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {workout.when} · {workout.minutes} min
                </AppText>
              </View>
              {workout.records > 0 ? (
                <View style={styles.record}>
                  <AppText variant="overline" tone="volt">
                    {workout.records} recorde
                  </AppText>
                </View>
              ) : null}
            </CardRow>
          ))}
        </Card>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  planTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  section: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.text },
  row: { paddingHorizontal: 14, paddingVertical: 12 },
  thumb: { width: 48, height: 48, borderRadius: 12 },
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
