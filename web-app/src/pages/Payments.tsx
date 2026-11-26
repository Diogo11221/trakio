import { useState } from 'react';

import { ApiError, api } from '../api';
import { Photo } from '../components/Photo';
import { Button, Card, ConfirmDialog, PageHeader, StatusPill, Tabs, type Tone } from '../components/ui';
import { useAdmin, useApi } from '../data/store';
import { dayMonth, fullDate, type Overview, type Page, type PaymentRow, type PaymentStatus } from '../data/types';
import { euros } from '../lib';
import p from './pages.module.css';
import s from './Payments.module.css';

type Filter = 'all' | 'refunds' | 'disputes' | 'coaching' | 'subscriptions';

const statusInfo: Record<PaymentStatus, { tone: Tone; label: string }> = {
  pending: { tone: 'neutral', label: 'Por pagar' },
  paid: { tone: 'success', label: 'Pago' },
  failed: { tone: 'neutral', label: 'Falhou' },
  'refund-requested': { tone: 'warning', label: 'Reembolso pedido' },
  disputed: { tone: 'danger', label: 'Em disputa' },
  refunded: { tone: 'neutral', label: 'Reembolsado' },
  rescheduled: { tone: 'success', label: 'Remarcado' },
  'refund-declined': { tone: 'neutral', label: 'Reembolso recusado' },
};

const query: Record<Filter, string> = {
  all: '',
  refunds: '&status=refund-requested',
  disputes: '&status=disputed',
  coaching: '&kind=coaching',
  subscriptions: '&kind=marketplace',
};

function exportCsv(rows: PaymentRow[]) {
  const header = ['Data', 'Quem pagou', 'PT', 'Descrição', 'Valor (EUR)', 'Taxa (EUR)', 'Estado'];
  const lines = rows.map((r) =>
    [r.date.slice(0, 10), r.payer, r.trainer ?? '', r.description, (r.amountCents / 100).toFixed(2), (r.feeCents / 100).toFixed(2), statusInfo[r.status].label]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';'),
  );
  const blob = new Blob([`\uFEFF${[header.join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trakio-pagamentos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Admin · Pagamentos e reembolsos. */
export function Payments() {
  const { notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'refund' | 'decline' | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, reload } = useApi<Page<PaymentRow>>(`/api/v1/admin/payments?size=100${query[filter]}`);
  const overview = useApi<Overview>('/api/v1/admin/overview');
  const refundsOpen = useApi<Page<PaymentRow>>('/api/v1/admin/payments?size=1&status=refund-requested');
  const disputesOpen = useApi<Page<PaymentRow>>('/api/v1/admin/payments?size=1&status=disputed');
  const list = data?.content ?? [];
  const selected = list.find((x) => x.id === selectedId) ?? list[0] ?? null;
  const month = overview.data?.revenueByMonth.at(-1);
  const openRefunds = refundsOpen.data?.totalElements ?? 0;

  const decide = async (decision: 'approve' | 'decline' | 'reschedule', message: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/payments/${selected.id}/refund-decision`, { decision });
      notify(message);
      await Promise.all([reload(), refundsOpen.reload(), overview.reload()]);
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Pagamentos"
        subtitle="Pagamentos dos alunos aos PTs, taxas da Trakio e subscrições."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={list.length === 0}
            onClick={() => {
              exportCsv(list);
              notify('Exportação descarregada.');
            }}
          >
            Exportar lista
          </Button>
        }
      />

      <Card className={p.kpis}>
        <KpiNote label="Processado este mês" value={overview.data ? euros(overview.data.processedCents / 100) : '—'} note="todos os pagamentos" />
        <KpiNote label="Taxas da Trakio" value={month ? euros(month.feesCents / 100) : '—'} note="comissão nos pagamentos aos PTs" />
        <KpiNote label="Subscrições" value={month ? euros(month.subscriptionsCents / 100) : '—'} note="marketplace e Premium" />
        <KpiNote
          label="Por decidir"
          value={String(openRefunds + (disputesOpen.data?.totalElements ?? 0))}
          note={openRefunds === 1 ? '1 pedido de reembolso' : `${openRefunds} pedidos de reembolso`}
        />
      </Card>

      <Tabs
        label="Filtrar pagamentos"
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setSelectedId(null);
        }}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'refunds', label: 'Reembolsos pedidos', count: openRefunds },
          { value: 'disputes', label: 'Disputas', count: disputesOpen.data?.totalElements ?? 0 },
          { value: 'coaching', label: 'Alunos → PTs' },
          { value: 'subscriptions', label: 'Subscrições do marketplace' },
        ]}
      />

      <div className={s.layout}>
        <Card className={s.tableCard}>
          <table className={p.table}>
            <thead>
              <tr>
                <th style={{ width: 76 }}>Data</th>
                <th>Quem pagou → PT</th>
                <th style={{ width: 180 }}>Descrição</th>
                <th style={{ width: 90, textAlign: 'right' }}>Valor</th>
                <th style={{ width: 80, textAlign: 'right' }}>Taxa</th>
                <th style={{ width: 150 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const info = statusInfo[row.status];
                return (
                  <tr
                    key={row.id}
                    className={`${p.rowClickable} ${row.id === selected?.id ? p.rowSelected : ''}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>{dayMonth(row.date)}</td>
                    <td>
                      <span className={p.person}>
                        <Photo url={row.payerPhotoUrl} name={row.payer} size={28} />
                        <span className={p.twoLine}>
                          <span className={p.strong}>{row.payer}</span>
                          <span className={p.small}>{row.trainer ? `para ${row.trainer}` : row.kind === 'premium' ? 'Trakio Premium' : 'Trakio'}</span>
                        </span>
                      </span>
                    </td>
                    <td>{row.description.split(' · ')[0]}</td>
                    <td className={p.num}>{euros(row.amountCents / 100)}</td>
                    <td className={p.num}>{row.feeCents > 0 ? euros(row.feeCents / 100) : '—'}</td>
                    <td>
                      <StatusPill tone={info.tone} label={info.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && list.length === 0 ? <p className={p.empty}>Nada neste filtro.</p> : null}
        </Card>

        {selected ? (
          <Card key={selected.id + selected.status} className={s.panel}>
            <StatusPill tone={statusInfo[selected.status].tone} label={statusInfo[selected.status].label} />
            <div className={p.person}>
              <Photo url={selected.payerPhotoUrl} name={selected.payer} size={44} />
              <div className={p.twoLine}>
                <span className={s.panelTitle}>
                  {selected.status === 'refund-requested'
                    ? `${selected.payer.split(' ')[0]} pede ${euros(selected.amountCents / 100)}`
                    : selected.status === 'disputed'
                      ? `Disputa de ${euros(selected.amountCents / 100)}`
                      : `${selected.payer} · ${euros(selected.amountCents / 100)}`}
                </span>
                <span className={`${p.muted} ${p.small}`}>
                  {selected.description} · {fullDate(selected.date)}
                </span>
              </div>
            </div>

            {selected.refundReason ? (
              <div className={s.reason}>
                <span className={p.small}>Motivo do pedido</span>
                <span className={p.dark}>“{selected.refundReason}”</span>
              </div>
            ) : null}

            <div className={s.summary}>
              <Line label="Pago" value={euros(selected.amountCents / 100)} />
              <Line label="Taxa da Trakio" value={selected.feeCents > 0 ? `−${euros(selected.feeCents / 100)}` : '—'} />
              {selected.kind === 'coaching' ? <Line label="Para o PT" value={euros((selected.amountCents - selected.feeCents) / 100)} strong /> : null}
            </div>

            <div className={p.push} />

            {selected.status === 'refund-requested' ? (
              <>
                <p className={`${p.muted} ${p.small}`}>
                  Ao reembolsar, o Stripe devolve o valor ao aluno, retira-o da conta do PT e devolve também a taxa da Trakio. O acompanhamento termina.
                </p>
                <Button disabled={busy} onClick={() => setDialog('refund')}>
                  Rever e reembolsar {euros(selected.amountCents / 100)}
                </Button>
                <div className={s.secondary}>
                  <Button variant="outline" style={{ flex: 1 }} disabled={busy} onClick={() => decide('reschedule', 'Marcado como remarcado. Combina a nova data com os dois pelo email.')}>
                    Remarcar sessão
                  </Button>
                  <Button variant="outline" style={{ width: 110, color: 'var(--color-danger-text)' }} disabled={busy} onClick={() => setDialog('decline')}>
                    Recusar
                  </Button>
                </div>
              </>
            ) : selected.status === 'disputed' ? (
              <>
                <p className={`${p.muted} ${p.small}`}>
                  As disputas são respondidas no painel do Stripe, com as provas (histórico de treinos e mensagens). O resultado chega aqui automaticamente.
                </p>
                <Button onClick={() => window.open('https://dashboard.stripe.com/disputes', '_blank', 'noopener')}>Abrir disputas no Stripe</Button>
              </>
            ) : null}
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog === 'refund'}
        title={`Reembolsar ${euros((selected?.amountCents ?? 0) / 100)} a ${selected?.payer ?? ''}?`}
        confirmLabel={`Reembolsar ${euros((selected?.amountCents ?? 0) / 100)}`}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          decide('approve', 'Reembolso enviado. Chega ao aluno em 5 a 10 dias úteis.');
        }}
      >
        <div className={s.summary}>
          <Line label="Devolvido ao aluno" value={euros((selected?.amountCents ?? 0) / 100)} strong />
          <Line label="Retirado ao PT" value={`−${euros(((selected?.amountCents ?? 0) - (selected?.feeCents ?? 0)) / 100)}`} />
          <Line label="Taxa da Trakio devolvida" value={`−${euros((selected?.feeCents ?? 0) / 100)}`} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'decline'}
        title="Recusar o reembolso?"
        body="O pagamento fica como está. Explica o motivo ao aluno por email."
        confirmLabel="Recusar reembolso"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          decide('decline', 'Reembolso recusado.');
        }}
      />
    </>
  );
}

function KpiNote({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={p.kpi} style={{ gap: 4, padding: '16px 24px' }}>
      <span className={p.kpiLabel}>{label}</span>
      <span className={p.kpiValue} style={{ fontSize: 22 }}>
        {value}
      </span>
      <span className={p.kpiNote}>{note}</span>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={s.line}>
      <span>{label}</span>
      <span className={`mono ${strong ? p.strong : ''}`}>{value}</span>
    </div>
  );
}
