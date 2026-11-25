import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { IconButton } from '@/components/Surface';
import { DEMO_HEIGHT, ExerciseDemo } from '@/features/workout/components/ExerciseDemo';
import { OrderSheet } from '@/features/workout/components/OrderSheet';
import { RestView } from '@/features/workout/components/RestView';
import { SET_COLUMNS, SetRow } from '@/features/workout/components/SetRow';
import { WorkoutProgress } from '@/features/workout/components/WorkoutProgress';
import { cancelRestAlert, prepareRestAlerts, scheduleRestAlert } from '@/features/workout/restAlert';
import { activeSetIndex, useWorkout } from '@/features/workout/store';
import { formatClock } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNow } from '@/lib/useNow';
import { useSettings } from '@/state/settings';
import { colors, fonts, pagePadding } from '@/theme/tokens';

/** Cliente · Treino A (série em curso) ⇄ B (descanso), with D (ordem) as a sheet. Tab bar hidden: focus mode. */
export default function Workout() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { lockScreenAlert } = useSettings();
  const { state, current, currentIndex, adjust, completeSet, skipRest, shiftRest, switchTo, reorder, start } =
    useWorkout();
  const [orderOpen, setOrderOpen] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    start();
    prepareRestAlerts().catch(() => undefined);
  }, [start]);

  // Finishing the last set leads straight to the summary.
  useEffect(() => {
    if (state.finishedAt) router.replace('/workout-done');
  }, [state.finishedAt]);

  // Lock-screen alert for the end of the rest (Figma state C).
  const rest = state.rest;
  useEffect(() => {
    if (!rest || !lockScreenAlert) {
      cancelRestAlert();
      return;
    }
    const next = state.plan.exercises.find((e) => e.id === state.currentId);
    const finished = state.plan.exercises.find((e) => e.id === rest.exerciseId);
    if (!next || !finished) return;
    const nextSet = next.sets[activeSetIndex(next)];
    scheduleRestAlert({
      seconds: (rest.endsAt - Date.now()) / 1000,
      exerciseName: finished.name,
      setNumber: rest.setIndex + 1,
      totalSets: finished.sets.length,
      nextKg: nextSet?.kg ?? 0,
      nextReps: nextSet?.reps ?? 0,
    }).catch(() => undefined);
    // Re-scheduled when the end time moves (±15 s) or the next set is edited.
  }, [rest, lockScreenAlert, state.plan, state.currentId]);

  const endRest = useCallback(() => {
    cancelRestAlert();
    skipRest();
  }, [skipRest]);

  const onComplete = () => {
    haptics.success();
    completeSet();
  };

  const elapsed = state.startedAt ? (now - state.startedAt) / 1000 : 0;
  const activeIndex = activeSetIndex(current);
  const upNext = state.plan.exercises.find((e, i) => i > currentIndex && e.status === 'pending');
  const finishedExercise = rest ? state.plan.exercises.find((e) => e.id === rest.exerciseId) : undefined;

  const leave = () => {
    haptics.tap();
    router.back();
  };

  return (
    <View style={styles.root}>
      {rest && finishedExercise ? (
        <Animated.View
          key="rest"
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(180)}
          style={[styles.rest, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}
        >
          <View style={styles.restTop}>
            <Pressable onPress={leave} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
              <Icon name="chevronLeftLarge" size={22} />
            </Pressable>
            <SessionClock seconds={elapsed} solid />
          </View>
          <WorkoutProgress exercises={state.plan.exercises} />
          <RestView
            rest={rest}
            finished={finishedExercise}
            next={current}
            onAdjust={adjust}
            onShift={shiftRest}
            onDone={endRest}
          />
        </Animated.View>
      ) : (
        <Animated.View key="set" entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)} style={styles.fill}>
          <ScrollView
            style={styles.fill}
            contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.demoSlot}>
              <ExerciseDemo name={current.name} />
            </View>
            <View style={styles.content}>
            <WorkoutProgress exercises={state.plan.exercises} />

            <Animated.View key={current.id} entering={FadeIn.duration(300)} style={styles.header}>
              <View style={styles.headerTop}>
                <AppText style={styles.exerciseName} numberOfLines={1}>
                  {current.name}
                </AppText>
                <AppText variant="small" tone="muted" style={styles.count}>
                  {currentIndex + 1} de {state.plan.exercises.length}
                </AppText>
              </View>
              <AppText variant="small" tone="muted">
                {current.prescription}
              </AppText>
            </Animated.View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <AppText variant="overline" tone="muted" style={{ width: SET_COLUMNS.set }}>
                  Série
                </AppText>
                <AppText variant="overline" tone="muted" style={{ width: SET_COLUMNS.previous }}>
                  Última vez
                </AppText>
                <AppText variant="overline" tone="muted" style={styles.flexCenter}>
                  Peso
                </AppText>
                <AppText variant="overline" tone="muted" numberOfLines={1} style={[styles.center, styles.repsHead]}>
                  Repetições
                </AppText>
                <AppText style={[styles.checkHead, { width: SET_COLUMNS.check }]}>✓</AppText>
              </View>
              {current.sets.map((entry, i) => (
                <Animated.View key={`${current.id}-${i}`} layout={LinearTransition.springify().damping(20)}>
                  <SetRow
                    number={i + 1}
                    entry={entry}
                    state={entry.done ? 'done' : i === activeIndex ? 'active' : 'pending'}
                    onAdjust={adjust}
                    onComplete={onComplete}
                  />
                </Animated.View>
              ))}
            </View>

            <PressableScale
              onPress={() => setOrderOpen(true)}
              accessibilityLabel="Ver ordem do treino"
              style={styles.upNext}
            >
              <View style={styles.upNextIndex}>
                <AppText style={styles.upNextIndexText}>
                  {upNext ? state.plan.exercises.indexOf(upNext) + 1 : '—'}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" tone="muted">
                  A seguir
                </AppText>
                <AppText style={styles.upNextName} numberOfLines={1}>
                  {upNext ? `${upNext.name} · ${upNext.short}` : 'Último exercício'}
                </AppText>
              </View>
              <View style={styles.viewAll}>
                <AppText variant="small" tone="muted" style={styles.viewAllText}>
                  Ver treino
                </AppText>
                <Icon name="chevronRightSmall" size={14} />
              </View>
            </PressableScale>
            </View>
          </ScrollView>

          <View style={[styles.topBar, { top: insets.top + 4 }]} pointerEvents="box-none">
            <IconButton icon="chevronLeft" glass onPress={leave} accessibilityLabel="Voltar" />
            <SessionClock seconds={elapsed} />
          </View>

          <LinearGradient
            colors={['rgba(11,12,14,0)', colors.bg, colors.bg]}
            locations={[0, 0.3, 1]}
            style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}
            pointerEvents="box-none"
          >
            <Button label="Concluir série" icon="checkDark" onPress={onComplete} haptic={null} />
          </LinearGradient>
        </Animated.View>
      )}

      <OrderSheet
        visible={orderOpen}
        plan={state.plan}
        currentId={state.currentId}
        onClose={() => setOrderOpen(false)}
        onReorder={reorder}
        onStartNow={(id) => {
          haptics.success();
          switchTo(id);
          setOrderOpen(false);
        }}
      />
    </View>
  );
}

function SessionClock({ seconds, solid = false }: { seconds: number; solid?: boolean }) {
  return (
    <View style={[styles.session, solid ? styles.sessionSolid : styles.sessionGlass]} accessibilityLabel="Tempo de treino">
      <AppText style={styles.sessionText}>{formatClock(seconds)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  flexCenter: { flex: 1, textAlign: 'center' },
  center: { textAlign: 'center' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  session: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  sessionGlass: { backgroundColor: colors.glass, borderColor: colors.glassBorder },
  sessionSolid: { backgroundColor: colors.surface, borderColor: colors.border },
  sessionText: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  demoSlot: { height: DEMO_HEIGHT - 6 },
  content: { paddingHorizontal: pagePadding, gap: 22 },
  header: { gap: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  exerciseName: { flex: 1, fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.52, color: colors.text },
  count: { fontFamily: fonts.uiMedium },
  table: { gap: 4 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 8 },
  // A touch wider than its 56 pt column so the label never wraps; margins keep columns aligned.
  repsHead: { width: SET_COLUMNS.reps + 12, marginHorizontal: -6 },
  checkHead: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  upNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 12,
  },
  upNextIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextIndexText: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.textMuted },
  upNextName: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.text },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontFamily: fonts.uiMedium },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: pagePadding },
  rest: { flex: 1, paddingHorizontal: pagePadding, gap: 26 },
  restTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
