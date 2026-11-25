import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { OptionCard } from '@/components/OptionCard';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { ReorderableList } from '@/components/ReorderableList';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { IconButton } from '@/components/Surface';
import { createPlanDays, exerciseLibrary, students, type PlanExercise } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { formatTimeOfDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { easeOut } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

function restLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${s}`;
}

function repsLabel(e: PlanExercise): string {
  return e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}–${e.repsMax}`;
}

/** PT · Editor de plano — per student (from Aluno) or for a whole plan (from Planos). */
export default function PlanEditor() {
  const { id, student: studentId } = useLocalSearchParams<{ id: string; student?: string }>();
  const insets = useSafeAreaInsets();
  const { plans, planDays, savePlanDays, sendMessage } = useTrainer();
  const student = students.find((s) => s.id === studentId);
  const plan = plans.find((p) => p.id === id);
  const storeKey = student ? `student:${student.id}` : (plan?.id ?? id);

  const [days, setDays] = useState(() => planDays[storeKey] ?? createPlanDays());
  const [dayId, setDayId] = useState(days[0].id);
  const [openId, setOpenId] = useState<string | null>('supino-inclinado');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState<'all' | 'new'>('all');
  // Ids for exercises added here only need to be unique within the plan.
  const added = useRef(0);

  const day = days.find((d) => d.id === dayId) ?? days[0];

  const updateExercise = (exerciseId: string, patch: Partial<PlanExercise>) =>
    setDays((all) =>
      all.map((d) =>
        d.id !== dayId ? d : { ...d, exercises: d.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) },
      ),
    );

  const reorder = (from: number, to: number) =>
    setDays((all) =>
      all.map((d) => {
        if (d.id !== dayId) return d;
        const exercises = [...d.exercises];
        const [moved] = exercises.splice(from, 1);
        exercises.splice(to, 0, moved);
        return { ...d, exercises };
      }),
    );

  const addExercise = (name: string) => {
    const exercise: PlanExercise = {
      id: `${name}-${(added.current += 1)}`,
      name,
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      restSeconds: 90,
      note: '',
    };
    setDays((all) => all.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, exercise] } : d)));
    setOpenId(exercise.id);
    setLibraryOpen(false);
    haptics.success();
  };

  const removeExercise = (exerciseId: string) => {
    haptics.warning();
    setDays((all) =>
      all.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) } : d)),
    );
  };

  const finish = () => {
    savePlanDays(storeKey, days);
    if (student) {
      const now = new Date();
      const total = days.reduce((n, d) => n + d.exercises.length, 0);
      sendMessage(student.id, {
        id: `m-${now.getTime()}`,
        from: 'system',
        kind: 'workout',
        title: 'Plano atualizado',
        detail: `${days.length} treinos · ${total} exercícios · a partir do próximo treino`,
        time: formatTimeOfDay(now),
      });
    }
    haptics.success();
    router.back();
  };

  const subject = student
    ? `Para ${student.name} · ${student.goal}, ${student.weeks} semanas`
    : `Plano ${plan?.name ?? 'Hipertrofia'} · ${plan?.students ?? 0} alunos`;

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        <AppText style={styles.title}>Editar plano</AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Reveal index={0} style={styles.subject}>
          {student ? <Portrait person={student.id} size={28} /> : <Icon name="plan" size={20} />}
          <AppText variant="small" tone="muted" style={styles.flex} numberOfLines={1}>
            {subject}
          </AppText>
        </Reveal>

        <Reveal index={1}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.days}>
            {days.map((d) => (
              <Chip key={d.id} label={d.label} selected={d.id === dayId} onPress={() => setDayId(d.id)} />
            ))}
          </ScrollView>
        </Reveal>

        <Reveal index={2}>
          <Animated.View key={dayId} entering={FadeIn.duration(220)} style={styles.card}>
            <ReorderableList
              items={day.exercises}
              onReorder={reorder}
              renderItem={(exercise, index) => (
                <ExerciseRow
                  exercise={exercise}
                  open={openId === exercise.id}
                  last={index === day.exercises.length - 1}
                  onToggle={() => {
                    haptics.tick();
                    setOpenId(openId === exercise.id ? null : exercise.id);
                  }}
                  onChange={(patch) => updateExercise(exercise.id, patch)}
                  onRemove={() => removeExercise(exercise.id)}
                />
              )}
            />
          </Animated.View>
        </Reveal>

        <Reveal index={3}>
          <PressableScale onPress={() => setLibraryOpen(true)} style={styles.add} accessibilityRole="button">
            <AppText style={styles.addText}>+ Adicionar exercício</AppText>
          </PressableScale>
          <AppText variant="caption" tone="faint" style={styles.hint}>
            Mantém premido um exercício para mudar a ordem.
          </AppText>
        </Reveal>
      </ScrollView>

      <LinearGradient
        colors={['rgba(11,12,14,0)', colors.bg, colors.bg]}
        locations={[0, 0.3, 1]}
        style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}
      >
        <Button
          label={student ? `Guardar e enviar ao ${student.firstName}` : 'Guardar plano'}
          height={54}
          onPress={() => (student ? finish() : setScopeOpen(true))}
        />
      </LinearGradient>

      <Sheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accessibilityLabel="Adicionar exercício"
        header={<AppText variant="subheading">Adicionar exercício</AppText>}
      >
        <View style={styles.library}>
          {exerciseLibrary.map((name, i) => (
            <PressableScale key={name} onPress={() => addExercise(name)} haptic="tick" pressedScale={0.99}>
              <View style={[styles.libraryRow, i < exerciseLibrary.length - 1 && styles.divider]}>
                <AppText variant="label" style={styles.flex}>
                  {name}
                </AppText>
                <Icon name="plus" size={16} />
              </View>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={scopeOpen}
        onClose={() => setScopeOpen(false)}
        accessibilityLabel="Para quem vale a mudança"
        header={
          <View style={styles.sheetHead}>
            <AppText variant="heading">Para quem vale a mudança?</AppText>
            <AppText variant="small" tone="muted">
              Os alunos recebem uma notificação com o plano atualizado.
            </AppText>
          </View>
        }
      >
        <View style={styles.scopes}>
          <OptionCard
            compact
            title={`Todos os alunos do plano (${plan?.students ?? 0})`}
            description="A partir do próximo treino de cada um."
            selected={scope === 'all'}
            onPress={() => setScope('all')}
          />
          <OptionCard
            compact
            title="Só para novos alunos"
            description="Quem já está no plano continua como estava."
            selected={scope === 'new'}
            onPress={() => setScope('new')}
          />
        </View>
        <Button
          label="Guardar"
          height={54}
          onPress={() => {
            setScopeOpen(false);
            setTimeout(finish, 240);
          }}
        />
      </Sheet>
    </View>
  );
}

function ExerciseRow({
  exercise,
  open,
  last,
  onToggle,
  onChange,
  onRemove,
}: {
  exercise: PlanExercise;
  open: boolean;
  last: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<PlanExercise>) => void;
  onRemove: () => void;
}) {
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: 220, easing: easeOut }) }],
  }));

  return (
    <View style={[styles.exercise, open && styles.exerciseOpen, !last && styles.divider]}>
      <Pressable onPress={onToggle} style={styles.exerciseHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Icon name="drag" size={14} />
        <View style={styles.flex}>
          <AppText style={styles.exerciseName}>{exercise.name}</AppText>
          <AppText variant="caption" tone="muted">
            {exercise.sets} séries · {repsLabel(exercise)} repetições · descanso {restLabel(exercise.restSeconds)}
          </AppText>
        </View>
        <Animated.View style={chevronStyle}>
          <Icon name="expand" size={14} tint={open ? colors.textMuted : undefined} />
        </Animated.View>
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.editor}>
          <View style={styles.steppers}>
            <MiniStepper
              label="Séries"
              value={String(exercise.sets)}
              onStep={(d) => onChange({ sets: Math.max(1, exercise.sets + d) })}
            />
            <MiniStepper
              label="Repetições"
              value={repsLabel(exercise)}
              onStep={(d) =>
                onChange({ repsMin: Math.max(1, exercise.repsMin + d), repsMax: Math.max(1, exercise.repsMax + d) })
              }
            />
            <MiniStepper
              label="Descanso"
              value={`${Math.floor(exercise.restSeconds / 60)}:${String(exercise.restSeconds % 60).padStart(2, '0')}`}
              onStep={(d) => onChange({ restSeconds: Math.max(15, exercise.restSeconds + d * 15) })}
            />
          </View>
          <TextInput
            value={exercise.note}
            onChangeText={(note) => onChange({ note })}
            placeholder="Nota para o aluno (opcional)"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.volt}
            keyboardAppearance="dark"
            multiline
            style={styles.note}
            accessibilityLabel="Nota para o aluno"
          />
          <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" style={styles.remove}>
            <AppText variant="caption" tone="muted">
              Remover exercício
            </AppText>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function MiniStepper({ label, value, onStep }: { label: string; value: string; onStep: (delta: 1 | -1) => void }) {
  return (
    <View
      style={styles.mini}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <AppText variant="overline" tone="muted" style={styles.regular}>
        {label}
      </AppText>
      <View style={styles.miniRow}>
        <PressableScale haptic="tick" pressedScale={0.8} hitSlop={10} onPress={() => onStep(-1)}>
          <AppText style={[styles.sign, { color: colors.textMuted }]}>−</AppText>
        </PressableScale>
        <AppText style={styles.miniValue}>{value}</AppText>
        <PressableScale haptic="tick" pressedScale={0.8} hitSlop={10} onPress={() => onStep(1)}>
          <AppText style={styles.sign}>+</AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, gap: 2 },
  regular: { fontFamily: fonts.ui },
  top: {
    paddingHorizontal: pagePadding,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.text },
  spacer: { width: 36 },
  content: { paddingHorizontal: pagePadding, paddingTop: 4, gap: 14 },
  subject: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bleed: { marginHorizontal: -pagePadding },
  days: { gap: 8, paddingHorizontal: pagePadding },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  exercise: { paddingHorizontal: 14, paddingVertical: 12, gap: 12, backgroundColor: colors.surface },
  exerciseOpen: { backgroundColor: colors.surfaceRaised },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseName: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  editor: { gap: 10 },
  steppers: { flexDirection: 'row', gap: 8 },
  mini: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniValue: { fontFamily: fonts.monoMedium, fontSize: 16, color: colors.text, minWidth: 40, textAlign: 'center' },
  sign: { fontFamily: fonts.ui, fontSize: 15, color: colors.text },
  note: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.text,
  },
  remove: { alignSelf: 'flex-start' },
  add: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
  hint: { textAlign: 'center', marginTop: 8 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 24, paddingHorizontal: pagePadding },
  library: { backgroundColor: colors.surfaceRaised, borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  libraryRow: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  sheetHead: { gap: 6 },
  scopes: { gap: 8 },
});
