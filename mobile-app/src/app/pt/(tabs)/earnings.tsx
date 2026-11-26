import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Card, CardRow } from '@/components/Surface';
import { SectionHeader } from '@/features/pt/components';
import { ActivateMarketplaceSheet, CancelMarketplaceSheet } from '@/features/pt/MarketplaceSheets';
import { useTrainer } from '@/features/pt/store';
import { haptics } from '@/lib/haptics';
import { refreshAll } from '@/lib/refresh';
import type { EarningsDto } from '@/lib/apiTypes';
import { colors, fonts } from '@/theme/tokens';

const euros = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const money = (value: number) => `${euros.format(value)} €`;

const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long' });
const longDate = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' });

type MonthOption = { id: string; label: string; previous: string };

/** This month and the two before it ("2026-11"). */
function lastMonths(): MonthOption[] {
  const now = new Date();
  return [0, 1, 2].map((back) => {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const label = monthName.format(d);
    return {
      id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      previous: monthName.format(prev),
    };
  });
}

/** PT · Ganhos (+ Subscrição · ativar / cancelar). */
export default function Earnings() {
  const { marketplace, marketplaceActive, activateMarketplace, cancelMarketplace, students, earnings, verification } = useTrainer();
  const [months] = useState(lastMonths);
  const [monthId, setMonthId] = useState(months[0]!.id);
  const [sheet, setSheet] = useState<'month' | 'activate' | 'cancel' | null>(null);
  const [byMonth, setByMonth] = useState<Record<string, EarningsDto>>({});
  const month = months.find((m) => m.id === monthId) ?? months[0]!;
  const data = byMonth[monthId];

  const load = useCallback(
    () => Promise.all(months.map((m) => earnings(m.id))).then((all) => setByMonth(Object.fromEntries(all.map((e) => [e.month, e])))),
    [earnings, months],
  );

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const received = (data?.receivedCents ?? 0) / 100;
  const change = data?.changePercent ?? null;
  const until = marketplace?.currentPeriodEnd ? longDate.format(new Date(marketplace.currentPeriodEnd)) : 'ao fim do mês pago';
  const verified = verification?.status === 'approved';

  return (
    <>
      <Screen gap={16} onRefresh={() => Promise.all([refreshAll(), load()]).then(() => undefined)}>
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
              Recebido em {month.label.toLowerCase()}
            </AppText>
            <CountUp key={month.id + received} value={Math.round(received)} />
            {change !== null ? (
              <View style={styles.changeRow}>
                <View style={[styles.change, change < 0 && styles.changeDown]}>
                  <AppText style={[styles.changeText, change < 0 && { color: colors.text }]}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(Math.round(change))}%
                  </AppText>
                </View>
                <AppText variant="caption" tone="muted">
                  {change >= 0 ? 'mais' : 'menos'} do que em {month.previous}
                </AppText>
              </View>
            ) : null}
          </Card>
        </Reveal>

        {data && data.receivedCents > 0 ? (
          <Reveal index={2}>
            <Card style={styles.transfer}>
              <View style={styles.bank}>
                <Icon name="bank" size={18} />
              </View>
              <View style={styles.flex}>
                <AppText style={styles.rowTitle}>Para ti, depois da comissão</AppText>
                <AppText variant="caption" tone="muted">
                  Comissão Trakio {money(data.feeCents / 100)} · transferido pelo Stripe
                </AppText>
              </View>
              <AppText style={styles.amount}>{money(data.netCents / 100)}</AppText>
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <SectionHeader title="Pagamentos" />
        </Reveal>

        <Reveal index={4}>
          <Card>
            {!data || data.payments.length === 0 ? (
              <CardRow last style={styles.payment}>
                <AppText variant="small" tone="muted">
                  {data ? 'Sem pagamentos neste mês.' : 'A carregar…'}
                </AppText>
              </CardRow>
            ) : null}
            {data?.payments.map((p, i) => {
              const student = students.find((s) => s.id === p.studentId);
              return (
                <CardRow key={p.id} last={i === data.payments.length - 1} style={styles.payment}>
                  <Avatar photoUri={student?.photoUri ?? null} size={36} name={p.student} />
                  <View style={styles.flex}>
                    <AppText style={styles.rowTitle}>{p.student}</AppText>
                    <AppText variant="caption" tone="muted">
                      {p.description.split(' · ')[0]}
                      {p.status === 'refund-requested' ? ' · pedido de reembolso' : p.status === 'disputed' ? ' · em disputa' : ''}
                    </AppText>
                  </View>
                  <View style={styles.paymentAmount}>
                    <AppText style={styles.amountSmall}>{money(p.amountCents / 100)}</AppText>
                    <AppText variant="overline" tone="muted" style={styles.regular}>
                      taxa Trakio −{money(p.feeCents / 100)}
                    </AppText>
                  </View>
                </CardRow>
              );
            })}
          </Card>
        </Reveal>

        <Reveal index={5}>
          <Card style={styles.market}>
            <View style={[styles.dot, { backgroundColor: marketplaceActive ? colors.success : colors.textFaint }]} />
            <Animated.View key={String(marketplaceActive)} entering={FadeIn.duration(220)} style={styles.flex}>
              <AppText style={styles.rowTitle}>Subscrição do marketplace</AppText>
              <AppText variant="caption" tone="muted">
                {marketplaceActive
                  ? marketplace?.cancelAtPeriodEnd
                    ? `Cancelada · visível até ${until}`
                    : `Ativa · renova a ${until}`
                  : verified
                    ? 'Inativa · não apareces nas pesquisas'
                    : 'Disponível depois de verificares o perfil'}
              </AppText>
            </Animated.View>
            <PressableScale
              onPress={() =>
                marketplaceActive
                  ? marketplace?.cancelAtPeriodEnd
                    ? undefined
                    : setSheet('cancel')
                  : verified
                    ? setSheet('activate')
                    : router.push('/pt/verify')
              }
              style={[styles.manage, !marketplaceActive && styles.manageActivate]}
              accessibilityRole="button"
            >
              <AppText style={[styles.manageText, !marketplaceActive && { color: colors.bg }]}>
                {marketplaceActive ? (marketplace?.cancelAtPeriodEnd ? 'Cancelada' : 'Gerir') : verified ? 'Ativar' : 'Verificar'}
              </AppText>
              {marketplaceActive && !marketplace?.cancelAtPeriodEnd ? <Icon name="chevronRightSmall" size={12} /> : null}
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
                <AppText style={styles.amountSmall}>{byMonth[m.id] ? money(byMonth[m.id]!.receivedCents / 100) : '—'}</AppText>
                {m.id === monthId ? <Icon name="checkVolt" size={16} /> : <View style={styles.checkSpace} />}
              </View>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <ActivateMarketplaceSheet
        visible={sheet === 'activate'}
        onClose={() => setSheet(null)}
        onActivated={async () => {
          await activateMarketplace();
          setSheet(null);
        }}
      />
      <CancelMarketplaceSheet
        visible={sheet === 'cancel'}
        students={students.length}
        until={until}
        onClose={() => setSheet(null)}
        onCancelled={async () => {
          await cancelMarketplace();
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
