import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { ProgressRing, useRingSweep } from '@/components/ProgressRing';
import { Reveal, Screen } from '@/components/Screen';
import { Card } from '@/components/Surface';
import { useWorkout } from '@/features/workout/store';
import { formatThousands, formatToday, greeting } from '@/lib/format';
import { colors, fonts, springs } from '@/theme/tokens';
import { refreshMockData } from '@/lib/refresh';
import { firstName, useClientProfile } from '@/state/auth';

const readiness = 78;
const kcal = { eaten: 1361, goal: 2400 };

/** Cliente · Hoje. */
export default function Today() {
  const { start } = useWorkout();
  const now = new Date();
  const profile = useClientProfile();
  const ring = useRingSweep(kcal.eaten / kcal.goal, 300);

  return (
    <Screen gap={18} onRefresh={refreshMockData}>
      <Reveal index={0} style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="caption" style={styles.date} tone="muted">
            {formatToday(now)}
          </AppText>
          <AppText variant="title">
            {greeting(now)}, {firstName(profile.name)}
          </AppText>
        </View>
        <PressableScale onPress={() => router.navigate('/profile')} accessibilityLabel="Perfil">
          <Avatar photoUri={profile.photoUri} demoPerson={profile.demoPerson} size={42} name={profile.name} />
        </PressableScale>
      </Reveal>

      <Reveal index={1}>
        <Card style={styles.readiness}>
          <View style={styles.readinessTop}>
            <View style={styles.baseline}>
              <AppText variant="overline" tone="muted">
                Prontidão para treinar
              </AppText>
              <AppText style={styles.readinessValue}>{readiness}</AppText>
              <AppText variant="numberSmall" tone="muted">
                / 100
              </AppText>
            </View>
            <ReadinessMeter value={readiness} />
          </View>
          <AppText variant="small" tone="muted">
            Dormiste 7h12 · pronto para carga
          </AppText>
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card radius={22} style={styles.today}>
          <View style={styles.render} pointerEvents="none">
            <Image source={require('@/assets/figma/render-bench.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['rgba(20,22,26,0)', colors.surface]} style={styles.renderFadeBottom} />
          </View>
          <LinearGradient
            colors={[colors.surface, 'rgba(20,22,26,0)', 'rgba(20,22,26,0)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.renderFade}
            pointerEvents="none"
          />
          <View style={styles.todayText}>
            <AppText variant="overline" tone="muted">
              Treino de hoje
            </AppText>
            <AppText variant="heading">Treino A · Peito</AppText>
            <AppText variant="small" tone="muted">
              6 exercícios · ~55 min
            </AppText>
            <View style={styles.tags}>
              {['Peito', 'Ombros', 'Tríceps'].map((tag) => (
                <View key={tag} style={styles.tag}>
                  <AppText variant="overline" tone="muted">
                    {tag}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.ctaGap} />
          <Button
            label="Começar treino"
            icon="arrowRight"
            height={50}
            style={styles.cta}
            onPress={() => {
              start();
              router.push('/workout');
            }}
          />
        </Card>
      </Reveal>

      <Reveal index={3}>
        <PressableScale onPress={() => router.navigate('/nutrition')} accessibilityLabel="Nutrição de hoje">
          <Card style={styles.nutrition}>
            <ProgressRing size={44} strokeWidth={5} progress={ring} color={colors.text} trackColor={colors.border} />
            <View style={styles.nutritionText}>
              <View style={styles.baseline}>
                <AppText style={styles.kcal}>{kcal.eaten}</AppText>
                <AppText variant="numberSmall" tone="muted" style={styles.kcalGoal}>
                  / {formatThousands(kcal.goal)} kcal
                </AppText>
              </View>
              <AppText variant="caption" tone="muted" style={styles.macros}>
                Proteína 112 g · Hidratos 140 g · Gordura 34 g
              </AppText>
            </View>
            <Icon name="chevronRight" size={16} />
          </Card>
        </PressableScale>
      </Reveal>

      <Reveal index={4}>
        <Card style={styles.message}>
          <Portrait person="rita" size={36} />
          <View style={styles.messageText}>
            <View style={styles.messageTop}>
              <AppText style={styles.messageFrom}>Rita Santos · PT</AppText>
              <AppText variant="numberSmall" tone="muted">
                08:14
              </AppText>
            </View>
            <AppText variant="small" tone="muted" style={styles.messageBody}>
              Boa semana! Se o supino te parecer fácil, sobe 2,5 kg.
            </AppText>
          </View>
        </Card>
      </Reveal>
    </Screen>
  );
}

/** Ten bars that fill one after another — readiness out of 100. */
function ReadinessMeter({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <View style={styles.meter} accessibilityLabel={`Prontidão ${value} de 100`}>
      {Array.from({ length: 10 }, (_, i) => (
        <MeterBar key={i} index={i} on={i < filled} />
      ))}
    </View>
  );
}

function MeterBar({ index, on }: { index: number; on: boolean }) {
  const lit = useSharedValue(0);
  useEffect(() => {
    if (on) lit.set(withDelay(250 + index * 55, withSpring(1, springs.snappy)));
  }, [index, lit, on]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.4 + lit.get() * 0.6 }],
    opacity: 0.35 + lit.get() * 0.65,
  }));
  return (
    <View style={styles.barSlot}>
      <View style={[styles.bar, styles.barOff]} />
      {on ? <Animated.View style={[styles.bar, styles.barOn, style]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: 4 },
  date: { fontFamily: fonts.uiMedium },
  readiness: { padding: 16, gap: 10 },
  readinessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  readinessValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.text },
  meter: { flexDirection: 'row', gap: 3 },
  barSlot: { width: 8, height: 16 },
  bar: { position: 'absolute', inset: 0, borderRadius: 2 },
  barOff: { backgroundColor: colors.borderStrong },
  barOn: { backgroundColor: colors.text },
  today: { padding: 18, gap: 14 },
  render: { position: 'absolute', top: -1, right: -1, width: 210, height: 170 },
  renderFadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48 },
  renderFade: { position: 'absolute', top: -1, right: -1, width: 220, height: 170 },
  todayText: { gap: 6 },
  tags: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ctaGap: { height: 24 },
  cta: { borderRadius: 14 },
  nutrition: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 16, paddingRight: 14, paddingVertical: 14 },
  nutritionText: { flex: 1, gap: 6 },
  kcal: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.text },
  kcalGoal: { fontSize: 12 },
  macros: { fontFamily: fonts.uiMedium, lineHeight: 17 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  messageText: { flex: 1, gap: 4 },
  messageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  messageFrom: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.text },
  messageBody: { lineHeight: 18 },
});
