import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card } from '@/components/Surface';
import type { PlanSummary } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { haptics } from '@/lib/haptics';
import { refreshAll } from '@/lib/refresh';
import { ApiError } from '@/lib/api';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

const tabs = [
  { value: 'mine', label: 'Os meus planos' },
  { value: 'templates', label: 'Modelos Trakio' },
] as const;

/** PT · Planos. */
export default function Plans() {
  const { plans, templates, addPlan } = useTrainer();
  const [tab, setTab] = useState<(typeof tabs)[number]['value']>('mine');
  const list: PlanSummary[] = tab === 'mine' ? plans : templates;

  const openId = (id: string) => router.push({ pathname: '/pt/plan/[id]', params: { id } });

  /** A Trakio template becomes the PT's own plan, then opens in the editor. */
  const fromTemplate = async (templateId: string) => {
    try {
      const id = await addPlan(templateId);
      haptics.success();
      setTab('mine');
      setTimeout(() => openId(id), 260);
    } catch (e) {
      Alert.alert('Não foi possível criar o plano', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    }
  };

  const open = (plan: PlanSummary) => (tab === 'templates' ? fromTemplate(plan.id) : openId(plan.id));

  return (
    <Screen gap={16} onRefresh={refreshAll}>
      <Reveal index={0} style={styles.header}>
        <AppText variant="title">Planos</AppText>
        <PressableScale
          haptic="press"
          onPress={() => {
            const first = templates[0];
            if (first) fromTemplate(first.id);
          }}
          style={styles.new}
          accessibilityRole="button"
          accessibilityLabel="Novo plano"
        >
          <AppText style={styles.newText}>+  Novo</AppText>
        </PressableScale>
      </Reveal>

      <Reveal index={1}>
        <SegmentedControl options={tabs} value={tab} onChange={setTab} stretch />
      </Reveal>

      <Reveal index={2}>
        <Animated.View key={tab} entering={FadeIn.duration(220)}>
          <Card>
            {list.length === 0 ? (
              <View style={styles.row}>
                <AppText variant="small" tone="muted">
                  {tab === 'mine' ? 'Ainda não tens planos. Começa por um modelo Trakio.' : 'Sem modelos.'}
                </AppText>
              </View>
            ) : null}
            {list.map((plan, i) => (
              <Animated.View key={plan.id} layout={layoutGlide} entering={FadeIn.duration(240)}>
                <PressableScale onPress={() => open(plan)} pressedScale={0.99} accessibilityLabel={plan.name}>
                  <View style={[styles.row, i < list.length - 1 && styles.divider]}>
                    <View style={styles.icon}>
                      <Icon name="plan" size={20} />
                    </View>
                    <View style={styles.flex}>
                      <AppText style={styles.name}>{plan.name}</AppText>
                      <AppText variant="caption" tone="muted" numberOfLines={1}>
                        {plan.detail}
                      </AppText>
                    </View>
                    <AppText style={[styles.count, plan.students === 0 && { color: colors.textMuted }]}>
                      {tab === 'templates' ? 'Usar' : plan.students === 0 ? 'Sem alunos' : `${plan.students} alunos`}
                    </AppText>
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </Card>
        </Animated.View>
      </Reveal>

      <Reveal index={3} style={styles.tip}>
        <AppText variant="caption" tone="muted" style={styles.tipText}>
          Ao alterar um plano, a mudança vale para todos os alunos que o seguem. Para mudar só o plano de um aluno, abre-o a partir do perfil dele.
        </AppText>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  new: { backgroundColor: colors.surfaceRaised, borderRadius: 18, paddingLeft: 12, paddingRight: 14, paddingVertical: 8 },
  newText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.text },
  count: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  tip: { backgroundColor: colors.surfaceRaised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  tipText: { lineHeight: 17 },
});
