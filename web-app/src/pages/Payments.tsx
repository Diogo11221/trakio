import { useState } from 'react';

import { Portrait } from '../components/Portrait';
import { Button, Card, ConfirmDialog, PageHeader, StatusPill, Tabs, type Tone } from '../components/ui';
import { disputeCase, kpis, refundCase, type Payment, type PaymentStatus } from '../data/mock';
import { useAdmin } from '../data/store';
import { euros, thousands } from '../lib';
import p from './pages.module.css';
import s from './Payments.module.css';

type Filter = 'all' | 'refunds' | 'disputes' | 'transfers';

const statusInfo: Record<PaymentStatus, { tone: Tone; label: string }> = {
  paid: { tone: 'success', label: 'Pago' },
  'refund-requested': { tone: 'warning', label: 'Reembolso pedido' },
  disputed: { tone: 'danger', label: 'Em disputa' },
  refunded: { tone: 'neutral', label: 'Reembolsado' },
  rescheduled: { tone: 'success', label: 'Remarcado' },
  'refund-declined': { tone: 'neutral', label: 'Reembolso recusado' },
};

function exportCsv(rows: Payment[]) {
  const header = ['Data', 'Aluno', 'PT', 'Pacote', 'Valor (EUR)', 'Taxa (EUR)', 'Estado'];
  const lines = rows.map((r) =>
    [r.date, r.student.name, r.trainer, r.pack, r.amount.toFixed(2), r.fee === null ? '' : r.fee.toFixed(2), statusInfo[r.status].label]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';'),
  );
  const blob = new Blob([`﻿${[header.join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trakio-pagamentos-novembro-2026.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Admin · Pagamentos e reembolsos. */
export function Payments() {
  const { payments, setPaymentStatus, notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(refundCase.paymentId);
  const [dialog, setDialog] = useState<'refund' | 'decline' | 'dispute-accept' | null>(null);

  const list = payments.filter((x) =>
    filter === 'refunds'
      ? x.status === 'refund-requested' || x.status === 'refunded' || x.status === 'refund-declined'
      : filter === 'disputes'
        ? x.status === 'disputed'
        : filter === 'transfers'
          ? x.kind === 'student' && x.status === 'paid'
          : true,
  );
  const selected = payments.find((x) => x.id === selectedId) ?? payments[0];
  const refunded = payments.filter((x) => x.status === 'refunded').reduce((sum, x) => sum + x.amount, 0);
  const openRefunds = payments.filter((x) => x.status === 'refund-requested').length;

  return (
    <>
      <PageHeader
        title="Pagamentos"
        subtitle="Pagamentos dos alunos aos PTs, taxas da Trakio e subscrições do marketplace."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportCsv(payments);
              notify('Exportação de novembro descarregada.');
            }}
          >
            Exportar novembro
          </Button>
        }
      />

      <Card className={p.kpis}>
        <KpiNote label="Processado este mês" value={`${thousands(kpis.processed)} €`} note="pagamentos de alunos" />
        <KpiNote label="Taxas da Trakio" value="6 426 €" note="10% de cada pagamento" />
        <KpiNote label="Subscrições de PTs" value="504 €" note="126 PTs × 4 €" />
        <KpiNote
          label="Reembolsado"
          value={`${thousands(refunded)} €`}
          note={openRefunds === 1 ? '1 pedido por decidir' : openRefunds === 0 ? 'Nenhum pedido por decidir' : `${openRefunds} pedidos por decidir`}
        />
      </Card>

      <Tabs
        label="Filtrar pagamentos"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'refunds', label: 'Reembolsos pedidos', count: openRefunds },
          { value: 'disputes', label: 'Disputas', count: payments.filter((x) => x.status === 'disputed').length },
          { value: 'transfers', label: 'Transferências para PTs' },
        ]}
      />

      <div className={s.layout}>
        <Card className={s.tableCard}>
          <table className={p.table}>
            <thead>
              <tr>
                <th style={{ width: 76 }}>Data</th>
                <th>Aluno → PT</th>
                <th style={{ width: 150 }}>Pacote</th>
                <th style={{ width: 80, textAlign: 'right' }}>Valor</th>
                <th style={{ width: 76, textAlign: 'right' }}>Taxa</th>
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
                    <td>{row.date}</td>
                    <td>
                      <span className={p.person}>
                        {row.student.person ? <Portrait person={row.student.person} size={28} /> : <span className={s.allPts}>PT</span>}
                        <span className={p.twoLine}>
                          <span className={p.strong}>{row.student.name}</span>
                          <span className={p.small}>{row.kind === 'student' ? `para ${row.trainer}` : row.trainer}</span>
                        </span>
                      </span>
                    </td>
                    <td>{row.pack}</td>
                    <td className={p.num}>{euros(row.amount)}</td>
                    <td className={p.num}>{row.fee === null ? '—' : euros(row.fee)}</td>
                    <td>
                      <StatusPill tone={info.tone} label={info.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 ? <p className={p.empty}>Nada neste filtro.</p> : null}
        </Card>

        {selected ? (
          <Card key={selected.id + selected.status} className={s.panel}>
            <StatusPill tone={statusInfo[selected.status].tone} label={statusInfo[selected.status].label} />
            <div className={p.person}>
              {selected.student.person ? <Portrait person={selected.student.person} size={44} /> : null}
              <div className={p.twoLine}>
                <span className={s.panelTitle}>
                  {selected.status === 'refund-requested'
                    ? `${selected.student.name.split(' ')[0]} pede ${euros(selected.amount)}`
                    : selected.status === 'disputed'
                      ? `Disputa de ${euros(selected.amount)}`
                      : `${selected.student.name} · ${euros(selected.amount)}`}
                </span>
                <span className={`${p.muted} ${p.small}`}>
                  {selected.pack} com {selected.trainer} · {selected.date}
                </span>
              </div>
            </div>

            {selected.id === refundCase.paymentId || selected.id === disputeCase.paymentId ? (
              <CaseDetail kind={selected.id === refundCase.paymentId ? 'refund' : 'dispute'} />
            ) : (
              <div className={s.summary}>
                <Line label="Pago pelo aluno" value={euros(selected.amount)} />
                <Line label="Taxa da Trakio" value={selected.fee === null ? '—' : `−${euros(selected.fee)}`} />
                <Line label="Para o PT" value={euros(selected.amount - (selected.fee ?? 0))} strong />
                <Line label="Transferência" value={selected.status === 'paid' ? '3 de dezembro' : '—'} />
              </div>
            )}

            <div className={p.push} />

            {selected.status === 'refund-requested' ? (
              <>
                <p className={`${p.muted} ${p.small}`}>
                  O valor sai da próxima transferência da {selected.trainer.split(' ')[0]} e a taxa da Trakio também é devolvida. Vais ver um
                  resumo antes de confirmar.
                </p>
                <Button onClick={() => setDialog('refund')}>Rever e reembolsar {euros(selected.amount)}</Button>
                <div className={s.secondary}>
                  <Button
                    variant="outline"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setPaymentStatus(selected.id, 'rescheduled');
                      notify('Remarcação proposta à Sofia e à Rita.');
                    }}
                  >
                    Propor remarcação
                  </Button>
                  <Button variant="outline" style={{ width: 110, color: 'var(--color-danger-text)' }} onClick={() => setDialog('decline')}>
                    Recusar
                  </Button>
                </div>
              </>
            ) : selected.status === 'disputed' ? (
              <>
                <p className={`${p.muted} ${p.small}`}>
                  O Stripe dá 7 dias para responder ao banco. Se aceitares, o valor sai da próxima transferência do PT.
                </p>
                <Button onClick={() => notify('Provas enviadas ao Stripe: histórico de treinos e mensagens.')}>Enviar provas ao banco</Button>
                <Button variant="outline" onClick={() => setDialog('dispute-accept')}>
                  Aceitar a disputa
                </Button>
              </>
            ) : null}
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog === 'refund'}
        title={`Reembolsar ${euros(selected?.amount ?? 0)} à ${selected?.student.name ?? ''}?`}
        confirmLabel={`Reembolsar ${euros(selected?.amount ?? 0)}`}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (!selected) return;
          setDialog(null);
          setPaymentStatus(selected.id, 'refunded');
          notify(`Reembolso de ${euros(selected.amount)} enviado. Chega em 5 a 10 dias.`);
        }}
      >
        <div className={s.summary}>
          <Line label="Devolvido à aluna" value={euros(selected?.amount ?? 0)} strong />
          <Line label="Sai da transferência da PT" value={`−${euros((selected?.amount ?? 0) - (selected?.fee ?? 0))}`} />
          <Line label="Taxa da Trakio devolvida" value={`−${euros(selected?.fee ?? 0)}`} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'decline'}
        title="Recusar o reembolso?"
        body="A aluna recebe o motivo por email. Pode responder e o pedido volta para esta lista."
        reasonLabel="Motivo"
        reasonPlaceholder="Ex.: a PT esteve na chamada; o histórico mostra a ligação às 10:02."
        confirmLabel="Recusar reembolso"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (!selected) return;
          setDialog(null);
          setPaymentStatus(selected.id, 'refund-declined');
          notify('Reembolso recusado. A aluna foi avisada.');
        }}
      />
      <ConfirmDialog
        open={dialog === 'dispute-accept'}
        title="Aceitar a disputa?"
        body={`O banco devolve ${euros(selected?.amount ?? 0)} ao aluno e o valor sai da próxima transferência do PT. Não dá para desfazer.`}
        confirmLabel="Aceitar disputa"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (!selected) return;
          setDialog(null);
          setPaymentStatus(selected.id, 'refunded');
          notify('Disputa aceite. O PT foi avisado.');
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

function CaseDetail({ kind }: { kind: 'refund' | 'dispute' }) {
  const data = kind === 'refund' ? refundCase : disputeCase;
  return (
    <>
      <div className={s.reason}>
        <span className={p.small}>Motivo</span>
        <span className={p.dark}>{data.reason}</span>
      </div>
      <div className={p.stack}>
        <span className={p.sectionTitle} style={{ fontSize: 14 }}>
          Histórico
        </span>
        {data.history.map((h) => (
          <div key={h.at} className={s.history}>
            <span className={`${p.muted} mono ${p.small}`}>{h.at}</span>
            <span>{h.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}
