import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { ReorderableList } from '@/components/ReorderableList';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { IconButton } from '@/components/Surface';
import type { PlanDay, PlanExercise } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { ApiError, api } from '@/lib/api';
import type { ExerciseDto, Page, PlanDto } from '@/lib/apiTypes';
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

type Loaded = { name: string; weeks: number; workoutsPerWeek: number; days: PlanDay[]; students: number };

function fromDto(plan: PlanDto): PlanDay[] {
  return plan.days.map((d) => ({
    id: d.id,
    label: d.label,
    focus: d.focus,
    exercises: d.exercises.map((e) => ({
      id: e.id,
      exercise: e.exercise,
      name: e.name,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      restSeconds: e.restSeconds,
      note: e.note,
      referenceKg: e.referenceKg,
    })),
  }));
}

/** PT · Editor de plano — one student's plan (from Aluno) or a whole plan (from Planos). */
export default function PlanEditor() {
  const { id, student: studentId } = useLocalSearchParams<{ id: string; student?: string }>();
  const insets = useSafeAreaInsets();
  const { students, plans, refresh } = useTrainer();
  const student = students.find((s) => s.id === studentId);
  const summary = plans.find((p) => p.id === id);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [dayId, setDayId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<{ slug: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  // Ids for exercises added here only need to be unique within the plan.
  const added = useRef(0);

  useEffect(() => {
    const path = studentId ? `/api/v1/trainer/students/${studentId}/plan` : `/api/v1/plans/${id}`;
    Promise.all([api.get<PlanDto>(path), api.get<Page<ExerciseDto>>('/api/v1/exercises?size=100')])
      .then(([plan, exercises]) => {
        const planDays = fromDto(plan);
        setLoaded({ name: plan.name, weeks: plan.weeks, workoutsPerWeek: plan.workoutsPerWeek, days: planDays, students: summary?.students ?? 0 });
        setDays(planDays);
        setDayId(planDays[0]?.id ?? null);
        setLibrary(exercises.content.map((e) => ({ slug: e.slug, name: e.name })));
      })
      .catch(() => Alert.alert('Não foi possível abrir o plano', 'Tenta outra vez.', [{ text: 'Voltar', onPress: () => router.back() }]));
    // Load once per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, studentId]);

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
        if (moved) exercises.splice(to, 0, moved);
        return { ...d, exercises };
      }),
    );

  const addExercise = (slug: string, name: string) => {
    const exercise: PlanExercise = {
      id: `${slug}-${(added.current += 1)}`,
      exercise: slug,
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

  const save = async () => {
    if (!loaded || saving) return;
    if (days.some((d) => d.exercises.length === 0)) {
      Alert.alert('Há um treino vazio', 'Cada treino precisa de pelo menos um exercício.');
      return;
    }
    const plan = {
      name: loaded.name,
      weeks: loaded.weeks,
      workoutsPerWeek: loaded.workoutsPerWeek,
      days: days.map((d) => ({
        label: d.label,
        focus: d.focus ?? '',
        exercises: d.exercises.map((e) => ({
          exercise: e.exercise,
          sets: e.sets,
          repsMin: Math.min(e.repsMin, e.repsMax),
          repsMax: Math.max(e.repsMin, e.repsMax),
          restSeconds: e.restSeconds,
          referenceKg: e.referenceKg ?? null,
          note: e.note,
        })),
      })),
    };
    setSaving(true);
    try {
      if (student) {
        const total = days.reduce((n, d) => n + d.exercises.length, 0);
        await api.put(`/api/v1/trainer/students/${student.id}/plan`, {
          plan,
          message: `Atualizei o teu plano: ${days.length} treinos e ${total} exercícios, a partir do próximo treino.`,
        });
      } else {
        await api.put(`/api/v1/trainer/plans/${id}`, plan);
      }
      await refresh();
      haptics.success();
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Não foi possível guardar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    }
  };

  const finish = () => {
    if (!student && (loaded?.students ?? 0) > 0) {
      Alert.alert('Guardar o plano?', `A mudança vale para os ${loaded?.students} alunos que seguem este plano, a partir do próximo treino.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar', onPress: save },
      ]);
      return;
    }
    save();
  };

  if (!loaded || !day) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 4, paddingHorizontal: pagePadding, gap: 40 }]}>
        <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  const subject = student
    ? `Para ${student.name} · ${student.goal}, ${loaded.weeks} semanas`
    : `${loaded.name} · ${loaded.students === 1 ? '1 aluno' : `${loaded.students} alunos`}`;

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
          {student ? <Avatar photoUri={student.photoUri} size={28} name={student.name} /> : <Icon name="plan" size={20} />}
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
          label={saving ? 'A guardar…' : student ? `Guardar e enviar a ${student.firstName}` : 'Guardar plano'}
          height={54}
          disabled={saving}
          onPress={finish}
        />
      </LinearGradient>

      <Sheet
        visible={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accessibilityLabel="Adicionar exercício"
        header={<AppText variant="subheading">Adicionar exercício</AppText>}
      >
        <View style={styles.library}>
          {library.map((item, i) => (
            <PressableScale key={item.slug} onPress={() => addExercise(item.slug, item.name)} haptic="tick" pressedScale={0.99}>
              <View style={[styles.libraryRow, i < library.length - 1 && styles.divider]}>
                <AppText variant="label" style={styles.flex}>
                  {item.name}
                </AppText>
                <Icon name="plus" size={16} />
              </View>
            </PressableScale>
          ))}
        </View>
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
