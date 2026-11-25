import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ProgressRing, useRingSweep } from '@/components/ProgressRing';
import { Reveal, Screen } from '@/components/Screen';
import { Card, CardRow, SectionLabel } from '@/components/Surface';
import { dailyGoal, eaten, macroLabels, meals, type MacroKey } from '@/features/nutrition/data';
import { PremiumSheet } from '@/features/nutrition/PremiumSheet';
import { formatThousands } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/state/settings';
import { enterRise } from '@/theme/motion';
import { colors, fonts, springs } from '@/theme/tokens';

const dayLabels = ['Hoje', 'Ontem', 'Domingo', 'Sábado', 'Sexta'];

/** Cliente · Nutrição (+ Ativar Premium sheet). */
export default function Nutrition() {
  const { premium, setPremium } = useSettings();
  const [dayOffset, setDayOffset] = useState(0);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const ring = useRingSweep(eaten.kcal / dailyGoal.kcal, 200);

  const openLogger = () => {
    if (premium) router.push('/meal-log');
    else setPremiumOpen(true);
  };

  const shiftDay = (delta: number) => {
    const next = Math.min(dayLabels.length - 1, Math.max(0, dayOffset + delta));
    if (next === dayOffset) return;
    haptics.tick();
    setDayOffset(next);
  };

  return (
    <>
      <Screen
        gap={18}
        bottomInset={96}
        overlay={
          <Animated.View entering={enterRise(380)} style={styles.fabWrap}>
            <PressableScale onPress={openLogger} haptic="press" style={styles.fab} accessibilityLabel="Registar com IA">
              <Icon name="cameraDark" size={18} />
              <AppText style={styles.fabText}>Registar com IA</AppText>
            </PressableScale>
          </Animated.View>
        }
      >
        <Reveal index={0} style={styles.header}>
          <AppText variant="title">Nutrição</AppText>
          <View style={styles.date}>
            <Pressable hitSlop={10} onPress={() => shiftDay(1)} accessibilityLabel="Dia anterior">
              <Icon name="datePrev" size={12} />
            </Pressable>
            <Animated.View key={dayOffset} entering={FadeIn.duration(200)}>
              <AppText style={styles.dateText}>{dayLabels[dayOffset]}</AppText>
            </Animated.View>
            <Pressable
              hitSlop={10}
              onPress={() => shiftDay(-1)}
              disabled={dayOffset === 0}
              accessibilityLabel="Dia seguinte"
            >
              <Icon name="dateNext" size={12} tint={dayOffset === 0 ? undefined : colors.textMuted} />
            </Pressable>
          </View>
        </Reveal>

        <Reveal index={1}>
          <Card radius={20} style={styles.summary}>
            <ProgressRing size={108} strokeWidth={10} progress={ring} trackColor={colors.border}>
              <AppText style={styles.remaining}>{formatThousands(dailyGoal.kcal - eaten.kcal)}</AppText>
              <AppText variant="overline" tone="muted" style={styles.remainingLabel}>
                restantes
              </AppText>
            </ProgressRing>
            <View style={styles.macros}>
              {(Object.keys(macroLabels) as MacroKey[]).map((key, i) => (
                <MacroBar key={key} label={macroLabels[key]} value={eaten[key]} goal={dailyGoal[key]} index={i} />
              ))}
            </View>
          </Card>
        </Reveal>

        <Reveal index={2}>
          <SectionLabel>Refeições</SectionLabel>
        </Reveal>

        <Reveal index={3}>
          <Card>
            {meals.map((meal, i) => {
              const logged = meal.kcal !== undefined;
              return (
                <CardRow key={meal.id} last={i === meals.length - 1} style={styles.meal}>
                  {meal.photo ? (
                    <Image source={require('@/assets/figma/photo-lunch.jpg')} style={styles.mealPhoto} contentFit="cover" />
                  ) : null}
                  <View style={styles.flex}>
                    <View style={styles.mealTitle}>
                      <AppText variant="label" style={[styles.mealName, !logged && { color: colors.textMuted }]}>
                        {meal.name}
                      </AppText>
                      {meal.fromAi ? (
                        <View style={styles.aiTag}>
                          <AppText style={styles.aiText}>IA</AppText>
                        </View>
                      ) : null}
                    </View>
                    {logged ? (
                      <AppText variant="caption" tone="muted">
                        {meal.time} · {meal.summary}
                      </AppText>
                    ) : null}
                  </View>
                  {logged ? (
                    <View style={styles.kcal}>
                      <AppText style={styles.kcalValue}>{meal.kcal}</AppText>
                      <AppText style={styles.kcalUnit}>kcal</AppText>
                    </View>
                  ) : (
                    <PressableScale
                      onPress={openLogger}
                      pressedScale={0.85}
                      style={styles.add}
                      accessibilityLabel={`Adicionar ${meal.name.toLowerCase()}`}
                    >
                      <AppText style={styles.addText}>+</AppText>
                    </PressableScale>
                  )}
                </CardRow>
              );
            })}
          </Card>
        </Reveal>
      </Screen>

      <PremiumSheet
        visible={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onActivated={() => {
          setPremium(true);
          setPremiumOpen(false);
          setTimeout(() => router.push('/meal-log'), 320);
        }}
      />
    </>
  );
}

function MacroBar({ label, value, goal, index }: { label: string; value: number; goal: number; index: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(300 + index * 90, withSpring(Math.min(1, value / goal), springs.gentle)));
  }, [fill, goal, index, value]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={styles.macro}>
      <View style={styles.macroTop}>
        <AppText style={styles.macroLabel}>{label}</AppText>
        <AppText variant="numberSmall" tone="muted">
          {value} / {goal} g
        </AppText>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text, minWidth: 34, textAlign: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 18 },
  remaining: { fontFamily: fonts.monoMedium, fontSize: 20, color: colors.text },
  remainingLabel: { fontFamily: fonts.ui },
  macros: { flex: 1, gap: 12 },
  macro: { gap: 5 },
  macroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: colors.text, borderRadius: 2 },
  meal: { paddingLeft: 16, paddingRight: 14, paddingVertical: 14 },
  mealPhoto: { width: 40, height: 40, borderRadius: 10 },
  mealTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealName: { fontSize: 15 },
  aiTag: { borderWidth: 1, borderColor: 'rgba(212,255,0,0.45)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  aiText: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.36, color: colors.volt },
  kcal: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  kcalValue: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text },
  kcalUnit: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.ui, fontSize: 17, color: colors.text, marginTop: -1 },
  fabWrap: { position: 'absolute', right: 20, bottom: 20 },
  fab: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.volt,
    paddingLeft: 16,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fabText: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.bg },
});
