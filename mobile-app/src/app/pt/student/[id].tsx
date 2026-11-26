import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { MuscleMap } from '@/components/MuscleMap';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { IconButton } from '@/components/Surface';
import { bodyOf, SectionHeader, StatStrip, StudentAvatar } from '@/features/pt/components';
import { endCoaching } from '@/features/pt/localStudents';
import { useTrainer } from '@/features/pt/store';
import { ToolGrid } from '@/features/tools/components';
import { haptics } from '@/lib/haptics';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

/** PT · Aluno. */
export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { aiDecisions, decideAi, students, refresh } = useTrainer();
  const student = students.find((s) => s.id === id) ?? students[0]!;
  const decision = aiDecisions[student.id];
  const [moreOpen, setMoreOpen] = useState(false);

  const stats = student.stats;
  const body = bodyOf(student);
  const openTools = () => router.push({ pathname: '/pt/tools', params: { student: student.id } });
  const openChat = () => router.push({ pathname: '/pt/chat/[id]', params: { id: student.id } });
  const openPlan = () =>
    router.push({ pathname: '/pt/plan/[id]', params: { id: student.goal.toLowerCase(), student: student.id } });

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
          <IconButton icon="more" onPress={() => setMoreOpen(true)} accessibilityLabel="Mais opções" />
        </View>

        <Reveal index={0} style={styles.header}>
          <StudentAvatar student={student} size={60} />
          <View style={styles.flex}>
            <AppText style={styles.name}>{student.name}</AppText>
            <AppText variant="small" tone="muted">
              {student.goal} · semana {student.week} de {student.weeks}
            </AppText>
            <AppText variant="caption" tone="muted">
              {student.pack} · {student.price}€/mês
            </AppText>
          </View>
        </Reveal>

        <Reveal index={1}>
          <StatStrip
            size={17}
            stats={[
              { value: stats?.workouts ?? `${student.week - 1} de ${student.week}`, label: 'treinos feitos' },
              {
                value: stats?.maxLoad ?? '—',
                label: stats?.maxLoadLabel ?? 'carga máxima',
                extra: stats ? <AppText style={styles.change}>{stats.maxLoadChange}</AppText> : undefined,
              },
              { value: String(stats?.readiness ?? '—'), label: 'prontidão hoje' },
            ]}
          />
        </Reveal>

        {student.ai && decision !== 'ignored' ? (
          <Animated.View layout={layoutGlide} exiting={FadeOut.duration(180)}>
            <Reveal index={2} style={[styles.ai, decision === 'applied' && styles.aiDone]}>
              {decision === 'applied' ? (
                <Animated.View entering={FadeIn.duration(260)} style={styles.aiApplied}>
                  <Icon name="checkVolt" size={16} />
                  <View style={styles.flex}>
                    <AppText style={styles.aiTitle}>{student.ai.action} · feito</AppText>
                    <AppText variant="small" tone="muted">
                      {student.firstName} vai receber uma notificação com o plano ajustado.
                    </AppText>
                  </View>
                </Animated.View>
              ) : (
                <>
                  <View style={styles.aiHead}>
                    <View style={styles.aiTag}>
                      <AppText style={styles.aiTagText}>IA</AppText>
                    </View>
                    <AppText style={styles.aiTitle} numberOfLines={1}>
                      {student.ai.title}
                    </AppText>
                  </View>
                  <AppText variant="small" tone="muted" style={styles.aiBody}>
                    {student.ai.body}
                  </AppText>
                  <View style={styles.aiActions}>
                    <PressableScale
                      haptic="press"
                      onPress={() => {
                        haptics.success();
                        decideAi(student.id, 'applied');
                      }}
                      style={styles.apply}
                      accessibilityRole="button"
                    >
                      <AppText style={styles.applyText}>{student.ai.action}</AppText>
                    </PressableScale>
                    <PressableScale
                      onPress={() => decideAi(student.id, 'ignored')}
                      style={styles.ignore}
                      accessibilityRole="button"
                    >
                      <AppText style={styles.ignoreText}>Ignorar</AppText>
                    </PressableScale>
                  </View>
                </>
              )}
            </Reveal>
          </Animated.View>
        ) : null}

        <Animated.View layout={layoutGlide}>
          <Reveal index={3}>
            <MuscleMap
              title="Volume desta semana"
              note={student.volumeNote ?? 'Arrasta para rodar'}
              height={170}
              accessibilityLabel={`Mapa muscular de ${student.name}`}
            />
          </Reveal>
        </Animated.View>

        {body ? (
          <Animated.View layout={layoutGlide} style={styles.tools}>
            <Reveal index={4}>
              <SectionHeader title="Medidas e cálculos" action="Ver todos" onAction={openTools} />
            </Reveal>
            <Reveal index={5}>
              <ToolGrid
                body={body}
                tools={['body-mass', 'body-fat', 'calories', 'max-lift']}
                onOpen={(tool) => router.push({ pathname: '/pt/tools/[id]', params: { id: tool, student: student.id } })}
              />
            </Reveal>
          </Animated.View>
        ) : null}
      </ScrollView>

      <LinearGradient
        colors={['rgba(11,12,14,0)', colors.bg, colors.bg]}
        locations={[0, 0.3, 1]}
        style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}
      >
        <View style={styles.message}>
          <Button label="Mensagem" variant="outline" height={54} onPress={openChat} />
        </View>
        <View style={styles.flex}>
          <Button label="Editar plano" height={54} onPress={openPlan} />
        </View>
      </LinearGradient>

      <Sheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        accessibilityLabel="Opções do aluno"
        header={<AppText variant="subheading">{student.name}</AppText>}
      >
        <View style={styles.options}>
          <Button label="Enviar mensagem" variant="outline" height={50} onPress={() => { setMoreOpen(false); openChat(); }} />
          <Button label="Editar plano" variant="outline" height={50} onPress={() => { setMoreOpen(false); openPlan(); }} />
          <Button label="Calculadoras" variant="outline" height={50} onPress={() => { setMoreOpen(false); openTools(); }} />
          <Button
            label="Terminar acompanhamento"
            variant="ghost"
            height={46}
            onPress={() =>
              Alert.alert(
                `Terminar o acompanhamento de ${student.firstName}?`,
                'Deixas de ver o progresso e a próxima mensalidade já não é cobrada.',
                [
                  { text: 'Manter', style: 'cancel' },
                  {
                    text: 'Terminar',
                    style: 'destructive',
                    onPress: async () => {
                      setMoreOpen(false);
                      haptics.warning();
                      // Real (test) accounts are unlinked from this PT; demo students just leave the screen.
                      if (student.accountId) await endCoaching(student.accountId);
                      refresh();
                      router.back();
                    },
                  },
                ],
              )
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: pagePadding, gap: 16 },
  flex: { flex: 1, gap: 3 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: -4 },
  tools: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.48, color: colors.text },
  change: { fontFamily: fonts.uiMedium, fontSize: 10, color: colors.volt },
  ai: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.voltBorderSoft,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  aiDone: { borderColor: colors.border },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTag: { backgroundColor: colors.volt, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  aiTagText: { fontFamily: fonts.uiSemiBold, fontSize: 10, color: colors.bg },
  aiTitle: { flexShrink: 1, fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  aiBody: { lineHeight: 19 },
  aiActions: { flexDirection: 'row', gap: 8 },
  apply: { height: 36, borderRadius: 10, backgroundColor: colors.volt, paddingHorizontal: 14, justifyContent: 'center' },
  applyText: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.bg },
  ignore: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  ignoreText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  aiApplied: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
    paddingHorizontal: pagePadding,
    flexDirection: 'row',
    gap: 10,
  },
  message: { width: 130 },
  options: { gap: 10 },
});
