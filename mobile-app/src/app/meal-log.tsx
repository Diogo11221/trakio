import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { IconButton } from '@/components/Surface';
import { lunchEstimate, type EstimatedFood } from '@/features/nutrition/data';
import { haptics } from '@/lib/haptics';
import { enterRise, layoutGlide } from '@/theme/motion';
import { colors, durations, fonts, pagePadding } from '@/theme/tokens';

const GRAM_STEP = 5;
const STEP_DISTANCE = 10;

/** Cliente · Registar refeição com IA — estimate, edit, then confirm. Nothing is saved without confirmation. */
export default function MealLog() {
  const insets = useSafeAreaInsets();
  const [foods, setFoods] = useState<EstimatedFood[]>(lunchEstimate);
  const [thinking, setThinking] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // Give the "AI" a beat to answer so the estimate arrives like a reply.
  useEffect(() => {
    const id = setTimeout(() => {
      setThinking(false);
      haptics.tick();
    }, 1100);
    return () => clearTimeout(id);
  }, []);

  const kcal = Math.round(foods.reduce((sum, f) => sum + f.grams * f.kcalPerGram, 0));
  const ratio = kcal / 519;
  const macros = { protein: Math.round(54 * ratio), carbs: Math.round(44 * ratio), fat: Math.round(13 * ratio) };

  const setGrams = (id: string, delta: number) =>
    setFoods((list) =>
      list.map((f) => (f.id === id ? { ...f, grams: Math.max(0, f.grams + delta * GRAM_STEP) } : f)),
    );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 4 }]}>
        <IconButton icon="closeLight" size={34} iconSize={12} onPress={() => router.back()} accessibilityLabel="Fechar" />
        <AppText style={styles.title}>Registar refeição</AppText>
        <View style={styles.aiChip}>
          <AppText variant="overline" tone="volt">
            IA
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enterRise(120)} style={styles.userMessage}>
          <View style={styles.bubble}>
            <Image source={require('@/assets/figma/photo-lunch.jpg')} style={styles.photo} contentFit="cover" />
            <AppText variant="label" style={styles.bubbleText}>
              Almoço
            </AppText>
          </View>
          <AppText style={styles.time}>13:02</AppText>
        </Animated.View>

        <View style={styles.aiMessage}>
          <View style={styles.aiAvatar}>
            <View style={styles.aiAvatarDot} />
          </View>
          {thinking ? (
            <TypingDots />
          ) : (
            <Animated.View entering={FadeIn.duration(260)} style={styles.flex}>
              <AppText variant="label" style={styles.aiText}>
                Identifiquei {foods.length} alimentos. Confirma as quantidades antes de gravar.
              </AppText>
            </Animated.View>
          )}
        </View>

        {!thinking ? (
          <Animated.View entering={enterRise(120)} style={styles.estimate}>
            <View>
              {foods.map((food, i) => (
                <Animated.View
                  key={food.id}
                  layout={layoutGlide}
                  style={[styles.food, i < foods.length - 1 && styles.foodDivider]}
                >
                  <AppText variant="label" style={styles.foodName}>
                    {food.name}
                  </AppText>
                  <View style={styles.foodRight}>
                    {editing ? (
                      <PressableScale
                        haptic="tick"
                        pressedScale={0.85}
                        onPress={() => setGrams(food.id, -1)}
                        style={styles.miniStep}
                        accessibilityLabel={`Menos ${food.name}`}
                      >
                        <AppText style={styles.miniStepText}>−</AppText>
                      </PressableScale>
                    ) : null}
                    <GramScrub
                      grams={food.grams}
                      highlighted={editing}
                      onStep={(d) => setGrams(food.id, d)}
                      label={food.name}
                    />
                    {editing ? (
                      <PressableScale
                        haptic="tick"
                        pressedScale={0.85}
                        onPress={() => setGrams(food.id, 1)}
                        style={styles.miniStep}
                        accessibilityLabel={`Mais ${food.name}`}
                      >
                        <AppText style={styles.miniStepText}>+</AppText>
                      </PressableScale>
                    ) : null}
                    <AppText style={styles.foodKcal}>{Math.round(food.grams * food.kcalPerGram)}</AppText>
                  </View>
                </Animated.View>
              ))}
            </View>

            <View style={styles.total}>
              <View style={styles.totalRow}>
                <AppText style={styles.totalValue}>{kcal}</AppText>
                <AppText style={styles.totalUnit}>kcal</AppText>
              </View>
              <AppText variant="caption" tone="muted" style={styles.macros}>
                Proteína {macros.protein} g · Hidratos {macros.carbs} g · Gordura {macros.fat} g
              </AppText>
            </View>

            <View style={styles.actions}>
              <PressableScale
                onPress={() => setEditing((v) => !v)}
                style={[styles.edit, editing && styles.editOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: editing }}
              >
                <AppText style={styles.editText}>{editing ? 'Pronto' : 'Editar'}</AppText>
              </PressableScale>
              <View style={styles.flex}>
                <Button
                  label="Confirmar e gravar"
                  height={46}
                  style={styles.confirm}
                  onPress={() => {
                    haptics.success();
                    router.back();
                  }}
                  haptic={null}
                />
              </View>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.input}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreve, fala ou envia foto"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.volt}
            keyboardAppearance="dark"
            style={styles.inputText}
          />
          <IconButton icon="camera" size={34} iconSize={18} accessibilityLabel="Enviar foto" />
          <IconButton icon="mic" size={34} iconSize={16} accessibilityLabel="Gravar áudio" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Grams chip: drag sideways to fine-tune in 5 g steps. */
function GramScrub({
  grams,
  highlighted,
  onStep,
  label,
}: {
  grams: number;
  highlighted: boolean;
  onStep: (delta: number) => void;
  label: string;
}) {
  const active = useSharedValue(0);
  const last = useSharedValue(0);

  const step = (delta: number) => {
    haptics.tick();
    onStep(delta);
  };

  const pan = usePanGesture({
    activeOffsetX: [-6, 6],
    failOffsetY: [-10, 10],
    onActivate: () => {
      'worklet';
      last.set(0);
      active.set(withTiming(1, { duration: durations.fast }));
    },
    onUpdate: (e) => {
      'worklet';
      const steps = Math.trunc(e.translationX / STEP_DISTANCE);
      if (steps !== last.get()) {
        scheduleOnRN(step, steps - last.get());
        last.set(steps);
      }
    },
    onFinalize: () => {
      'worklet';
      active.set(withTiming(0, { duration: durations.base }));
    },
  });

  const chipStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      active.get(),
      [0, 1],
      [highlighted ? 'rgba(212,255,0,0.5)' : colors.borderStrong, colors.volt],
    ),
    transform: [{ scale: 1 + active.get() * 0.08 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.qty, chipStyle]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Quantidade de ${label}`}
        accessibilityValue={{ text: `${grams} gramas` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <AppText style={styles.qtyText}>{grams} g</AppText>
      </Animated.View>
    </GestureDetector>
  );
}

function TypingDots() {
  return (
    <View style={styles.dots} accessibilityLabel="A analisar a foto">
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} />
      ))}
    </View>
  );
}

function Dot({ index }: { index: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      y.set(withRepeat(withSequence(withTiming(-4, { duration: 260 }), withTiming(0, { duration: 260 })), -1));
    }, index * 120);
    return () => clearTimeout(id);
  }, [index, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    height: 44,
    boxSizing: 'content-box',
    paddingHorizontal: pagePadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.uiSemiBold, fontSize: 16, color: colors.text },
  aiChip: { borderWidth: 1, borderColor: 'rgba(212,255,0,0.45)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  content: { paddingHorizontal: pagePadding, paddingTop: 20, paddingBottom: 24, gap: 16 },
  userMessage: { alignItems: 'flex-end', gap: 6 },
  bubble: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 10,
    gap: 8,
  },
  photo: { width: 220, height: 160, borderRadius: 14 },
  bubbleText: { fontFamily: fonts.ui, paddingLeft: 6 },
  time: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  aiMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarDot: { width: 8, height: 8, backgroundColor: colors.bg },
  aiText: { fontFamily: fonts.ui, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 5, height: 26, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  estimate: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  food: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  foodDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  foodName: { fontFamily: fonts.ui, flexShrink: 1 },
  foodRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qty: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyText: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  miniStep: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepText: { fontFamily: fonts.ui, fontSize: 14, color: colors.text },
  foodKcal: { width: 36, textAlign: 'right', fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  total: { gap: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  totalUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
  macros: { fontFamily: fonts.uiMedium },
  actions: { flexDirection: 'row', gap: 8 },
  edit: {
    width: 100,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOn: { borderColor: 'rgba(212,255,0,0.5)' },
  editText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.text },
  confirm: { borderRadius: 14 },
  composer: { paddingHorizontal: pagePadding, paddingTop: 8 },
  input: {
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputText: { flex: 1, height: '100%', fontFamily: fonts.ui, fontSize: 14, color: colors.text },
});
