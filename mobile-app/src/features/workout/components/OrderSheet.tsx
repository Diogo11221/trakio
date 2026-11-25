import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ProgressRing } from '@/components/ProgressRing';
import { Sheet } from '@/components/Sheet';
import { IconButton } from '@/components/Surface';
import type { Exercise, WorkoutPlan } from '@/features/workout/data';
import { activeSetIndex } from '@/features/workout/store';
import { haptics } from '@/lib/haptics';
import { colors, fonts, springs } from '@/theme/tokens';

const ROW_HEIGHT = 58;
const ROW_GAP = 4;
const SLOT = ROW_HEIGHT + ROW_GAP;

type OrderSheetProps = {
  visible: boolean;
  plan: WorkoutPlan;
  currentId: string;
  onClose: () => void;
  onStartNow: (exerciseId: string) => void;
  onReorder: (from: number, to: number) => void;
  onFinish: () => void;
};

/** Cliente · Treino D · Ordem do treino — skip a busy machine, drag to reorder. */
export function OrderSheet({ visible, plan, currentId, onClose, onStartNow, onReorder, onFinish }: OrderSheetProps) {
  const firstPending = plan.exercises.find((e) => e.status === 'pending')?.id ?? null;
  // `null` = nothing picked yet → default to the next pending exercise.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = plan.exercises.find((e) => e.id === pickedId);
  const selectedId =
    picked && (picked.status === 'pending' || picked.status === 'postponed') ? picked.id : firstPending;
  const ids = plan.exercises.map((e) => e.id);
  const order = useSharedValue<string[]>(ids);
  const draggingId = useSharedValue<string | null>(null);

  // Keep the UI-thread order in sync when the plan changes from outside.
  const key = ids.join('|');
  useEffect(() => {
    order.set(key.split('|'));
  }, [key, order]);

  const current = plan.exercises.find((e) => e.id === currentId);
  const currentIndex = plan.exercises.findIndex((e) => e.id === currentId);
  const doneMinutes = plan.exercises.filter((e) => e.status === 'done').length * 9;
  const selected = plan.exercises.find((e) => e.id === selectedId) ?? null;

  const close = () => {
    setPickedId(null);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      accessibilityLabel="Ordem do treino"
      header={
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="subheading">Ordem do treino</AppText>
            <AppText variant="small" tone="muted">
              {plan.title} · {plan.focus} · {currentIndex + 1} de {plan.exercises.length} · ~
              {Math.max(5, plan.estimatedMinutes - doneMinutes)} min
            </AppText>
          </View>
          <IconButton icon="close" iconSize={12} size={32} onPress={close} accessibilityLabel="Fechar" />
        </View>
      }
    >
      <View style={styles.hint}>
        <Icon name="info" size={16} />
        <AppText variant="small" tone="muted" style={styles.flex}>
          Máquina ocupada? Escolhe outro exercício — o que saltares fica adiado e voltas a ele depois.
        </AppText>
      </View>

      <View style={{ height: plan.exercises.length * SLOT - ROW_GAP }}>
        {plan.exercises.map((exercise, i) => (
          <DraggableRow
            key={exercise.id}
            exercise={exercise}
            position={i + 1}
            order={order}
            draggingId={draggingId}
            selected={exercise.id === selectedId}
            isCurrent={exercise.id === currentId}
            onSelect={() => setPickedId(exercise.id)}
            onResume={() => {
              setPickedId(null);
              onStartNow(exercise.id);
            }}
            onDrop={(from, to) => {
              if (from !== to) onReorder(from, to);
            }}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {selected && selected.id !== current?.id ? (
          <Button
            label={`Começar ${selected.name} agora`}
            height={54}
            onPress={() => {
              setPickedId(null);
              onStartNow(selected.id);
            }}
          />
        ) : (
          <Button label="Continuar treino" height={54} onPress={close} />
        )}
        <Button label="Terminar treino" variant="ghost" height={40} onPress={onFinish} />
        <AppText variant="caption" tone="muted">
          Mantém premido e arrasta para mudar a ordem
        </AppText>
      </View>
    </Sheet>
  );
}

type DraggableRowProps = {
  exercise: Exercise;
  /** 1-based place in the plan (committed order). */
  position: number;
  order: SharedValue<string[]>;
  draggingId: SharedValue<string | null>;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  onResume: () => void;
  onDrop: (from: number, to: number) => void;
};

function DraggableRow({ exercise, position, order, draggingId, selected, isCurrent, onSelect, onResume, onDrop }: DraggableRowProps) {
  const movable = exercise.status === 'pending' || exercise.status === 'postponed';
  const startIndex = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lift = useSharedValue(0);

  const index = useDerivedValue(() => order.get().indexOf(exercise.id));

  const pan = usePanGesture({
    enabled: movable,
    activateAfterLongPress: 220,
    onActivate: () => {
      'worklet';
      startIndex.set(index.get());
      draggingId.set(exercise.id);
      dragY.set(0);
      lift.set(withSpring(1, springs.snappy));
      scheduleOnRN(haptics.press);
    },
    onUpdate: (e) => {
      'worklet';
      dragY.set(e.translationY);
      const list = order.get();
      const target = Math.max(0, Math.min(list.length - 1, Math.round(startIndex.get() + e.translationY / SLOT)));
      const from = list.indexOf(exercise.id);
      if (target !== from) {
        const next = [...list];
        next.splice(from, 1);
        next.splice(target, 0, exercise.id);
        order.set(next);
        scheduleOnRN(haptics.tick);
      }
    },
    onFinalize: () => {
      'worklet';
      if (draggingId.get() !== exercise.id) return;
      const from = startIndex.get();
      const to = order.get().indexOf(exercise.id);
      draggingId.set(null);
      lift.set(withTiming(0, { duration: 180 }));
      dragY.set(0);
      scheduleOnRN(haptics.tap);
      scheduleOnRN(onDrop, from, to);
    },
  });

  const rowStyle = useAnimatedStyle(() => {
    const dragging = draggingId.get() === exercise.id;
    const top = dragging ? startIndex.get() * SLOT + dragY.get() : withSpring(index.get() * SLOT, springs.snappy);
    return {
      top,
      zIndex: dragging ? 10 : 0,
      transform: [{ scale: 1 + lift.get() * 0.03 }],
      shadowOpacity: lift.get() * 0.4,
    };
  });

  const doneSets = exercise.sets.filter((s) => s.done).length;
  const ring = useSharedValue(doneSets / exercise.sets.length);
  useEffect(() => {
    ring.set(withSpring(doneSets / exercise.sets.length, springs.gentle));
  }, [doneSets, exercise.sets.length, ring]);

  const muted = exercise.status === 'done';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.rowSlot, rowStyle]}>
        <Pressable
          onPress={() => {
            if (!movable) return;
            haptics.tick();
            onSelect();
          }}
          style={[styles.row, selected && movable && styles.rowSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={exercise.name}
          accessibilityHint={movable ? 'Toca para escolher, mantém premido para arrastar' : undefined}
        >
          <View style={styles.status}>
            {exercise.status === 'done' ? (
              <Icon name="statusDone" size={28} />
            ) : isCurrent ? (
              <ProgressRing size={28} strokeWidth={3} progress={ring} trackColor={colors.borderStrong} />
            ) : exercise.status === 'postponed' ? (
              <Icon name="statusPostponed" size={28} />
            ) : (
              <View style={[styles.index, selected && styles.indexSelected]}>
                <AppText style={[styles.indexText, selected && { color: colors.bg }]}>{position}</AppText>
              </View>
            )}
          </View>
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <AppText variant="label" style={[styles.name, muted && { color: colors.textMuted }]}>
                {exercise.name}
              </AppText>
              {exercise.status === 'postponed' ? (
                <View style={styles.postponedPill}>
                  <AppText variant="overline" tone="muted">
                    Adiado
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="caption" tone="muted">
              {exercise.status === 'done'
                ? `${exercise.short} · feito`
                : isCurrent
                  ? `Série ${Math.min(activeSetIndex(exercise) + 1, exercise.sets.length)} de ${exercise.sets.length}`
                  : selected
                    ? `${exercise.short} · livre`
                    : exercise.short}
            </AppText>
          </View>
          {isCurrent ? (
            <AppText style={styles.current}>Em curso</AppText>
          ) : exercise.status === 'postponed' ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                haptics.press();
                onResume();
              }}
              accessibilityRole="button"
            >
              <AppText style={styles.resume}>Retomar</AppText>
            </Pressable>
          ) : movable ? (
            <Icon name="drag" size={16} />
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  rowSelected: { backgroundColor: colors.surfaceRaised, borderColor: 'rgba(212,255,0,0.5)' },
  status: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexSelected: { backgroundColor: colors.volt, borderColor: colors.volt },
  indexText: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.textMuted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15 },
  postponedPill: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  current: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.volt },
  resume: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  footer: { gap: 12, alignItems: 'center', paddingTop: 6 },
});
