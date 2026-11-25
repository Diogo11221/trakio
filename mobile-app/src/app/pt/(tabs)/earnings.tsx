import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Card, CardRow } from '@/components/Surface';
import { SectionHeader } from '@/features/pt/components';
import { months, payments, PLATFORM_FEE, students } from '@/features/pt/data';
import { ActivateMarketplaceSheet, CancelMarketplaceSheet } from '@/features/pt/MarketplaceSheets';
import { useTrainer } from '@/features/pt/store';
import { haptics } from '@/lib/haptics';
import { refreshMockData } from '@/lib/refresh';
import { colors, fonts } from '@/theme/tokens';

const euros = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const money = (value: number) => `${euros.format(value)} €`;

/** PT · Ganhos (+ Subscrição · ativar / cancelar). */
export default function Earnings() {
  const { marketplaceActive, setMarketplaceActive } = useTrainer();
  const [monthId, setMonthId] = useState(months[0].id);
  const [sheet, setSheet] = useState<'month' | 'activate' | 'cancel' | null>(null);
  const month = months.find((m) => m.id === monthId) ?? months[0];

  return (
    <>
      <Screen gap={16} onRefresh={refreshMockData}>
        <Reveal index={0} style={styles.header}>
          <AppText variant="title">Ganhos</AppText>
          <PressableScale onPress={() => setSheet('month')} style={styles.month} accessibilityRole="button" accessibilityLabel="Escolher mês">
            <AppText style={styles.monthText}>{month.label}</AppText>
            <Icon name="chevronDown" size={12} />
          </PressableScale>
        </Reveal>

        <Reveal index={1}>
          <Card radius={20} style={styles.total}>
            <AppText variant="small" tone="muted">
              Recebido este mês
            </AppText>
            <CountUp key={month.id} value={month.received} />
            <View style={styles.changeRow}>
              <View style={[styles.change, month.change < 0 && styles.changeDown]}>
                <AppText style={[styles.changeText, month.change < 0 && { color: colors.text }]}>
                  {month.change >= 0 ? '↑' : '↓'} {Math.abs(month.change)}%
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {month.change >= 0 ? 'mais' : 'menos'} do que em {month.previous}
              </AppText>
            </View>
          </Card>
        </Reveal>

        {month.transfer > 0 ? (
          <Reveal index={2}>
            <Card style={styles.transfer}>
              <View style={styles.bank}>
                <Icon name="bank" size={18} />
              </View>
              <View style={styles.flex}>
                <AppText style={styles.rowTitle}>Próxima transferência</AppText>
                <AppText variant="caption" tone="muted">
                  Chega a {month.transferDate}
                </AppText>
              </View>
              <AppText style={styles.amount}>{money(month.transfer)}</AppText>
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <SectionHeader title="Pagamentos recentes" action="Ver todos" />
        </Reveal>

        <Reveal index={4}>
          <Card>
            {payments.map((p, i) => (
              <CardRow key={p.id} last={i === payments.length - 1} style={styles.payment}>
                <Portrait person={p.student} size={36} />
                <View style={styles.flex}>
                  <AppText style={styles.rowTitle}>{p.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {p.pack}
                  </AppText>
                </View>
                <View style={styles.paymentAmount}>
                  <AppText style={styles.amountSmall}>{money(p.amount)}</AppText>
                  <AppText variant="overline" tone="muted" style={styles.regular}>
                    taxa Trakio −{money(p.amount * PLATFORM_FEE)}
                  </AppText>
                </View>
              </CardRow>
            ))}
          </Card>
        </Reveal>

        <Reveal index={5}>
          <Card style={styles.market}>
            <View style={[styles.dot, { backgroundColor: marketplaceActive ? colors.success : colors.textFaint }]} />
            <Animated.View key={String(marketplaceActive)} entering={FadeIn.duration(220)} style={styles.flex}>
              <AppText style={styles.rowTitle}>Subscrição do marketplace</AppText>
              <AppText variant="caption" tone="muted">
                {marketplaceActive ? 'Ativa · renova a 1 de dezembro' : 'Inativa · não apareces nas pesquisas'}
              </AppText>
            </Animated.View>
            <PressableScale
              onPress={() => setSheet(marketplaceActive ? 'cancel' : 'activate')}
              style={[styles.manage, !marketplaceActive && styles.manageActivate]}
              accessibilityRole="button"
            >
              <AppText style={[styles.manageText, !marketplaceActive && { color: colors.bg }]}>
                {marketplaceActive ? 'Gerir' : 'Ativar'}
              </AppText>
              {marketplaceActive ? <Icon name="chevronRightSmall" size={12} /> : null}
            </PressableScale>
          </Card>
        </Reveal>
      </Screen>

      <Sheet
        visible={sheet === 'month'}
        onClose={() => setSheet(null)}
        accessibilityLabel="Escolher mês"
        header={<AppText variant="subheading">Mês</AppText>}
      >
        <View style={styles.months}>
          {months.map((m, i) => (
            <PressableScale
              key={m.id}
              haptic="tick"
              pressedScale={0.99}
              onPress={() => {
                setMonthId(m.id);
                setSheet(null);
              }}
            >
              <View style={[styles.monthRow, i < months.length - 1 && styles.divider]}>
                <AppText variant="label" style={styles.flex}>
                  {m.label}
                </AppText>
                <AppText style={styles.amountSmall}>{money(m.received)}</AppText>
                {m.id === monthId ? <Icon name="checkVolt" size={16} /> : <View style={styles.checkSpace} />}
              </View>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <ActivateMarketplaceSheet
        visible={sheet === 'activate'}
        onClose={() => setSheet(null)}
        onActivated={() => {
          setMarketplaceActive(true);
          setSheet(null);
        }}
      />
      <CancelMarketplaceSheet
        visible={sheet === 'cancel'}
        students={students.length}
        onClose={() => setSheet(null)}
        onCancelled={() => {
          setMarketplaceActive(false);
          setSheet(null);
        }}
      />
    </>
  );
}

/** The month total counts up when it appears or the month changes. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / 800);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t >= 1) {
        clearInterval(id);
        haptics.tick();
      }
    }, 32);
    return () => clearInterval(id);
  }, [value]);
  return <AppText style={styles.big}>{money(shown)}</AppText>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  regular: { fontFamily: fonts.ui },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 7,
  },
  monthText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  total: { padding: 18, gap: 6 },
  big: { fontFamily: fonts.monoMedium, fontSize: 34, letterSpacing: -1.02, color: colors.text, fontVariant: ['tabular-nums'] },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  change: { backgroundColor: colors.volt, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  changeDown: { backgroundColor: colors.surfaceRaised },
  changeText: { fontFamily: fonts.uiSemiBold, fontSize: 11, color: colors.bg },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  bank: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  amount: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text },
  amountSmall: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text },
  payment: { paddingHorizontal: 14, paddingVertical: 11 },
  paymentAmount: { alignItems: 'flex-end', gap: 2 },
  market: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 14, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 7,
  },
  manageActivate: { backgroundColor: colors.volt, paddingRight: 12 },
  manageText: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.text },
  months: { backgroundColor: colors.surfaceRaised, borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  monthRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkSpace: { width: 16 },
});
