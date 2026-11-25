import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Icon, type IconName } from '../components/Icon';
import { Card, Dropdown, PageHeader } from '../components/ui';
import { aiMeals, kpis, months, revenueByMonth } from '../data/mock';
import { useAdmin } from '../data/store';
import { thousands } from '../lib';
import p from './pages.module.css';
import s from './Overview.module.css';

/** Admin · Visão geral. */
export function Overview() {
  const { pendingVerifications, openReports, payments } = useAdmin();
  const [month, setMonth] = useState(months[0]?.id ?? '');
  const refunds = payments.filter((x) => x.status === 'refund-requested').length;
  const disputes = payments.filter((x) => x.status === 'disputed').length;

  const review: { to: string; title: string; detail: string; count: number; icon: IconName; hot?: boolean }[] = [
    { to: '/verificacao', title: 'PTs a verificar', detail: 'Documentos e conta de pagamentos', count: pendingVerifications, icon: 'navVerify', hot: true },
    { to: '/denuncias', title: 'Denúncias', detail: '1 avaliação, 1 perfil', count: openReports, icon: 'navReports' },
    { to: '/pagamentos', title: 'Reembolsos pedidos', detail: 'Sessão online não realizada', count: refunds, icon: 'navPayments' },
    { to: '/pagamentos', title: 'Disputa de pagamento', detail: 'Banco do aluno contestou 50 €', count: disputes, icon: 'navPayments' },
  ];

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Como está a plataforma este mês"
        actions={<Dropdown options={months.map((m) => ({ value: m.id, label: m.label }))} value={month} onChange={setMonth} label="Mês" />}
      />

      <Card className={p.kpis}>
        <Kpi label="Utilizadores ativos" value={thousands(kpis.activeUsers)} delta={`↑ ${kpis.activeUsersChange}%`} />
        <Kpi label="PTs no marketplace" value={String(kpis.marketplacePts)} delta={`+${kpis.newPtsThisMonth} este mês`} neutral />
        <Kpi label="Receita da plataforma" value={thousands(kpis.revenue)} unit="€" delta={`↑ ${kpis.revenueChange}%`} />
        <Kpi label="Pagamentos processados" value={thousands(kpis.processed)} unit="€" />
      </Card>

      <div className={s.grid}>
        <div className={s.left}>
          <Card className={s.chartCard}>
            <div className={s.cardHead}>
              <div>
                <h2 className={s.cardTitle}>Receita por mês</h2>
                <p className={s.cardSub}>Taxas dos pagamentos aos PTs + subscrições do marketplace</p>
              </div>
              <div className={s.legend}>
                <span><i className={s.swatchDark} />Taxas</span>
                <span><i className={s.swatchVolt} />Subscrições</span>
              </div>
            </div>
            <RevenueChart />
          </Card>

          <Card className={s.aiCard}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Registo de refeições com IA</h2>
              <span className={s.cardSub}>Funcionalidade Premium</span>
            </div>
            <div className={s.aiStats}>
              <AiStat value={thousands(aiMeals.logged)} label="refeições registadas" />
              <AiStat value={thousands(aiMeals.premium)} label="assinantes Premium" />
              <AiStat value={`${aiMeals.aiCost} €`} label="custo da IA este mês" />
            </div>
          </Card>
        </div>

        <Card className={s.review}>
          <div className={s.reviewHead}>
            <h2 className={s.cardTitle}>Por rever</h2>
            <p className={s.cardSub}>Coisas que precisam de uma pessoa</p>
          </div>
          {review.map((item) => (
            <Link key={item.title} to={item.to} className={`${s.reviewItem} ${item.hot && item.count > 0 ? s.reviewHot : ''}`}>
              <span className={s.reviewIcon}>
                <Icon name={item.icon} size={18} />
              </span>
              <span className={s.reviewText}>
                <span className={s.reviewTitle}>{item.title}</span>
                <span className={s.cardSub}>{item.count === 0 ? 'Tudo resolvido' : item.detail}</span>
              </span>
              <span className={`${s.count} ${item.hot && item.count > 0 ? s.countHot : ''}`}>{item.count}</span>
            </Link>
          ))}
          <div className={p.push} />
          <Link to="/verificacao" className={s.cta}>
            Começar pela verificação de PTs
          </Link>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, unit, delta, neutral = false }: { label: string; value: string; unit?: string; delta?: string; neutral?: boolean }) {
  return (
    <div className={p.kpi}>
      <span className={p.kpiLabel}>{label}</span>
      <span className={p.kpiValueRow}>
        <span className={p.kpiValue}>{value}</span>
        {unit ? <span className={p.kpiUnit}>{unit}</span> : null}
        {delta ? <span className={`${p.delta} ${neutral ? p.deltaNeutral : ''}`}>{delta}</span> : null}
      </span>
    </div>
  );
}

function AiStat({ value, label }: { value: string; label: string }) {
  return (
    <div className={s.aiStat}>
      <span className={s.aiValue}>{value}</span>
      <span className={s.cardSub}>{label}</span>
    </div>
  );
}

/** Stacked bars (fees + subscriptions) that grow in on load; hover shows the split. */
function RevenueChart() {
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...revenueByMonth.map((m) => m.fees + m.subscriptions));

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={s.bars} onMouseLeave={() => setHover(null)}>
      {revenueByMonth.map((m, i) => {
        const total = m.fees + m.subscriptions;
        const last = i === revenueByMonth.length - 1;
        const height = (total / max) * 100;
        return (
          <div key={m.month} className={s.barCol} onMouseEnter={() => setHover(i)}>
            <span className={`${s.barValue} ${last ? s.barValueLast : ''}`}>{thousands(total)} €</span>
            <div className={s.barTrack}>
              <div
                className={s.bar}
                style={{ height: grown ? `${height}%` : '0%', transitionDelay: `${i * 60}ms` }}
              >
                <div className={s.barSubs} style={{ flexGrow: m.subscriptions }} />
                <div className={`${s.barFees} ${last ? s.barFeesLast : ''}`} style={{ flexGrow: m.fees }} />
              </div>
              {hover === i ? (
                <div className={s.tooltip} role="status">
                  <strong>{m.month}</strong>
                  <span>Taxas {thousands(m.fees)} €</span>
                  <span>Subscrições {thousands(m.subscriptions)} €</span>
                </div>
              ) : null}
            </div>
            <span className={s.barMonth}>{m.month}</span>
          </div>
        );
      })}
    </div>
  );
}
