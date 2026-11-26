import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { MuscleMap } from '@/components/MuscleMap';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { IconButton } from '@/components/Surface';
import { SectionHeader, StatStrip } from '@/features/pt/components';
import { toStudent, useTrainer } from '@/features/pt/store';
import { musclesFrom, useStudent } from '@/features/pt/useStudent';
import { ApiError } from '@/lib/api';
import { ToolGrid } from '@/features/tools/components';
import { haptics } from '@/lib/haptics';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

/** PT · Aluno. */
export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { students, decide, endCoaching } = useTrainer();
  const { detail, progress, missing, reload, body } = useStudent(id);
  const [decision, setDecision] = useState<{ kind: string; value: 'applied' | 'ignored' } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const listed = students.find((s) => s.id === id);

  if (!detail) {
    return (
      <View style={[styles.root, styles.content, { paddingTop: insets.top + 4, gap: 40 }]}>
        <View style={styles.top}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        </View>
        {missing ? (
          <AppText variant="label" tone="muted" style={styles.centered}>
            Este aluno já não está a treinar contigo.
          </AppText>
        ) : (
          <ActivityIndicator color={colors.volt} />
        )}
      </View>
    );
  }

  const student = listed ?? toStudent(detail.student);
  const suggestion = detail.suggestions[0] ?? null;
  const shown = suggestion && (!decision || decision.kind === suggestion.kind) ? suggestion : null;
  const muscles = progress ? musclesFrom(progress) : [];
  const top = detail.topLift;
  const openTools = () => router.push({ pathname: '/pt/tools', params: { student: student.id } });
  const openChat = () =>
    student.conversationId
      ? router.push({ pathname: '/pt/chat/[id]', params: { id: student.conversationId } })
      : Alert.alert('Ainda sem conversa', 'A conversa abre quando o pagamento do aluno estiver confirmado.');
  const openPlan = () => router.push({ pathname: '/pt/plan/[id]', params: { id: 'student', student: student.id } });

  const act = async (value: 'applied' | 'ignored') => {
    if (!suggestion) return;
    try {
      await decide(student.id, suggestion.kind, value, suggestion.kind === 'variation' ? top?.name : undefined);
      if (value === 'applied') haptics.success();
      setDecision({ kind: suggestion.kind, value });
      reload();
    } catch (e) {
      Alert.alert('Não foi possível aplicar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    }
  };

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
          <Avatar photoUri={student.photoUri} size={60} name={student.name} />
          <View style={styles.flex}>
            <AppText style={styles.name}>{student.name}</AppText>
            <AppText variant="small" tone="muted">
              {student.goal} · semana {student.week} de {student.weeks}
            </AppText>
            <AppText variant="caption" tone="muted">
              {student.pack} · {student.price}€{student.period === 'mês' ? '/mês' : ''}
            </AppText>
          </View>
        </Reveal>

        <Reveal index={1}>
          <StatStrip
            size={17}
            stats={[
              { value: `${detail.workoutsDone} de ${detail.workoutsExpected}`, label: 'treinos · 4 semanas' },
              {
                value: top ? `${Math.round(top.currentMax)} kg` : '—',
                label: top ? `carga máxima · ${top.name.toLowerCase()}` : 'carga máxima',
                extra: top ? (
                  <AppText style={styles.change}>
                    {top.changePercent > 0 ? '↑' : top.changePercent < 0 ? '↓' : '='} {Math.abs(Math.round(top.changePercent))}%
                  </AppText>
                ) : undefined,
              },
              { value: student.readiness === null ? '—' : String(student.readiness), label: 'prontidão hoje' },
            ]}
          />
        </Reveal>

        {shown && decision?.value !== 'ignored' ? (
          <Animated.View layout={layoutGlide} exiting={FadeOut.duration(180)}>
            <Reveal index={2} style={[styles.ai, decision?.value === 'applied' && styles.aiDone]}>
              {decision?.value === 'applied' ? (
                <Animated.View entering={FadeIn.duration(260)} style={styles.aiApplied}>
                  <Icon name="checkVolt" size={16} />
                  <View style={styles.flex}>
                    <AppText style={styles.aiTitle}>{shown.action} · feito</AppText>
                    <AppText variant="small" tone="muted">
                      {shown.kind === 'light-week' ? `O plano de ${student.firstName} foi ajustado e recebeu uma mensagem no chat.` : `${student.firstName} recebeu a mensagem no chat.`}
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
                      {shown.title}
                    </AppText>
                  </View>
                  <AppText variant="small" tone="muted" style={styles.aiBody}>
                    {shown.body}
                  </AppText>
                  <View style={styles.aiActions}>
                    <PressableScale
                      haptic="press"
                      onPress={() => act('applied')}
                      style={styles.apply}
                      accessibilityRole="button"
                    >
                      <AppText style={styles.applyText}>{shown.action}</AppText>
                    </PressableScale>
                    <PressableScale
                      onPress={() => act('ignored')}
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
              note={muscles.length > 0 ? 'Arrasta para rodar' : 'Sem treinos esta semana'}
              muscles={muscles}
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
                      try {
                        await endCoaching(student.id);
                        haptics.warning();
                        router.back();
                      } catch (e) {
                        Alert.alert('Não foi possível terminar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
                      }
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
  centered: { textAlign: 'center' },
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
