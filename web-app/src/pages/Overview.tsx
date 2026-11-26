import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Icon, type IconName } from '../components/Icon';
import { Card, Dropdown, PageHeader } from '../components/ui';
import { useApi } from '../data/store';
import type { Overview as OverviewData } from '../data/types';
import { thousands } from '../lib';
import p from './pages.module.css';
import s from './Overview.module.css';

const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('pt-PT', { month: 'short' });

function lastMonths() {
  const now = new Date();
  return [0, 1, 2].map((back) => {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const label = monthName.format(d);
    return { id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

/** Admin · Visão geral. */
export function Overview() {
  const [months] = useState(lastMonths);
  const [month, setMonth] = useState(months[0]?.id ?? '');
  const { data: o, error } = useApi<OverviewData>(`/api/v1/admin/overview?month=${month}`);

  const review: { to: string; title: string; detail: string; count: number; icon: IconName; hot?: boolean }[] = [
    { to: '/verificacao', title: 'PTs a verificar', detail: 'Documentos e conta de pagamentos', count: o?.pendingVerifications ?? 0, icon: 'navVerify', hot: true },
    { to: '/denuncias', title: 'Denúncias', detail: 'Avaliações e perfis reportados', count: o?.openReports ?? 0, icon: 'navReports' },
    { to: '/pagamentos', title: 'Reembolsos pedidos', detail: 'Alunos à espera de resposta', count: o?.refundRequests ?? 0, icon: 'navPayments' },
    { to: '/pagamentos', title: 'Disputas de pagamento', detail: 'Bancos que contestaram pagamentos', count: o?.disputes ?? 0, icon: 'navPayments' },
  ];
  const change = o?.revenueChangePercent ?? null;

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle={error ? `Sem dados: ${error}` : 'Como está a plataforma este mês'}
        actions={<Dropdown options={months.map((m) => ({ value: m.id, label: m.label }))} value={month} onChange={setMonth} label="Mês" />}
      />

      <Card className={p.kpis}>
        <Kpi label="Utilizadores ativos (30 dias)" value={o ? thousands(o.activeUsers) : '—'} delta={o ? `de ${thousands(o.totalUsers)}` : undefined} neutral />
        <Kpi label="PTs no marketplace" value={o ? String(o.marketplaceTrainers) : '—'} delta={o ? `+${o.newTrainersThisMonth} este mês` : undefined} neutral />
        <Kpi
          label="Receita da plataforma"
          value={o ? thousands(o.revenueCents / 100) : '—'}
          unit="€"
          delta={change === null ? undefined : `${change >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(change))}%`}
        />
        <Kpi label="Pagamentos processados" value={o ? thousands(o.processedCents / 100) : '—'} unit="€" />
      </Card>

      <div className={s.grid}>
        <div className={s.left}>
          <Card className={s.chartCard}>
            <div className={s.cardHead}>
              <div>
                <h2 className={s.cardTitle}>Receita por mês</h2>
                <p className={s.cardSub}>Taxas dos pagamentos aos PTs + subscrições (marketplace e Premium)</p>
              </div>
              <div className={s.legend}>
                <span><i className={s.swatchDark} />Taxas</span>
                <span><i className={s.swatchVolt} />Subscrições</span>
              </div>
            </div>
            {o ? (
              <RevenueChart
                data={o.revenueByMonth.map((m) => {
                  const [y, mo] = m.month.split('-').map(Number);
                  return { month: shortMonth.format(new Date(y ?? 2026, (mo ?? 1) - 1, 1)).replace('.', ''), fees: m.feesCents / 100, subscriptions: m.subscriptionsCents / 100 };
                })}
              />
            ) : null}
          </Card>

          <Card className={s.aiCard}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Registo de refeições com IA</h2>
              <span className={s.cardSub}>Funcionalidade Premium</span>
            </div>
            <div className={s.aiStats}>
              <AiStat value={o ? thousands(o.aiMealsThisMonth) : '—'} label="refeições com IA este mês" />
              <AiStat value={o ? thousands(o.premiumSubscribers) : '—'} label="assinantes Premium" />
              <AiStat value={o ? thousands(o.clients) : '—'} label="alunos no total" />
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
function RevenueChart({ data: revenueByMonth }: { data: { month: string; fees: number; subscriptions: number }[] }) {
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...revenueByMonth.map((m) => m.fees + m.subscriptions));

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
