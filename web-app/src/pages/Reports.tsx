import { useState } from 'react';

import { Icon } from '../components/Icon';
import { Portrait } from '../components/Portrait';
import { Button, Card, ConfirmDialog, PageHeader, Tabs } from '../components/ui';
import { useAdmin } from '../data/store';
import p from './pages.module.css';
import s from './Reports.module.css';

type Tab = 'open' | 'resolved';

/** Admin · Denúncias. */
export function Reports() {
  const { reports, resolveReport, notify } = useAdmin();
  const [tab, setTab] = useState<Tab>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'primary' | 'suspend' | null>(null);

  const list = reports.filter((r) => (tab === 'open' ? r.resolution === null : r.resolution !== null));
  const selected = list.find((r) => r.report.id === selectedId) ?? list[0] ?? null;
  const open = reports.filter((r) => r.resolution === null).length;

  const resolve = (resolution: string, message: string) => {
    if (!selected) return;
    resolveReport(selected.report.id, resolution);
    setSelectedId(null);
    notify(message);
  };

  return (
    <>
      <PageHeader title="Denúncias" subtitle="Avaliações e perfis reportados por alunos e PTs." />
      <Tabs
        label="Estado das denúncias"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId(null);
        }}
        options={[
          { value: 'open', label: 'Por rever', count: open },
          { value: 'resolved', label: 'Resolvidas', count: 41 + reports.length - open },
        ]}
      />

      <div className={p.split}>
        <Card className={p.queue}>
          {list.length === 0 ? (
            <p className={p.empty}>{tab === 'open' ? 'Nenhuma denúncia por rever.' : 'Ainda nada resolvido nesta sessão.'}</p>
          ) : (
            list.map(({ report, resolution }) => {
              const active = selected?.report.id === report.id;
              return (
                <button
                  key={report.id}
                  type="button"
                  className={`${p.queueItem} ${active ? p.queueItemActive : ''}`}
                  onClick={() => setSelectedId(report.id)}
                  aria-pressed={active}
                >
                  <span className={s.kindIcon}>
                    <Icon name={report.kind === 'review' ? 'starOn' : 'user'} size={16} />
                  </span>
                  <span className={p.queueText}>
                    <span className={p.queueTop}>
                      <span className={p.queueTitle}>{report.title}</span>
                      <span className={p.queueMeta}>{report.ago}</span>
                    </span>
                    <span className={p.queueSub}>{resolution ?? report.summary}</span>
                  </span>
                </button>
              );
            })
          )}
        </Card>

        {selected ? (
          <Card key={selected.report.id} className={p.detail}>
            <div>
              <h2 className={p.detailName}>{selected.report.title}</h2>
              <div className={p.muted}>{selected.report.summary}</div>
            </div>

            <div className={p.stack}>
              <h3 className={p.sectionTitle}>{selected.report.kind === 'review' ? 'A avaliação' : 'O que está no perfil'}</h3>
              <div className={s.quoteCard}>
                <div className={s.quoteHead}>
                  <span className={s.avatarBlank}>
                    <Icon name="user" size={16} />
                  </span>
                  <div className={p.twoLine} style={{ flex: 1 }}>
                    <span className={p.strong}>{selected.report.author.name}</span>
                    <span className={`${p.muted} ${p.small}`}>{selected.report.author.detail}</span>
                  </div>
                  {selected.report.stars !== undefined ? <Stars value={selected.report.stars} /> : null}
                </div>
                <p className={s.quote}>{selected.report.quote}</p>
              </div>
            </div>

            <div className={p.stack}>
              <h3 className={p.sectionTitle}>Quem reportou</h3>
              <div className={s.reporter}>
                <Portrait person={selected.report.reporter.person} size={36} />
                <div className={p.twoLine}>
                  <span className={p.strong}>{selected.report.reporter.name}</span>
                  <span className={p.muted}>{selected.report.reporter.quote}</span>
                </div>
              </div>
            </div>

            <div className={p.stack}>
              <h3 className={p.sectionTitle}>O que verificámos</h3>
              <div className={s.signals}>
                {selected.report.signals.map((signal) => (
                  <div key={signal} className={s.signal}>
                    <Icon name="signal" size={18} />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.resolution === null ? (
              <div className={p.actions}>
                <Button onClick={() => setDialog('primary')}>{selected.report.primaryAction}</Button>
                <Button
                  variant="outline"
                  onClick={() => resolve(`Mantida · ${selected.report.keepAction.toLowerCase()}`, 'Denúncia fechada. Nada foi alterado.')}
                >
                  {selected.report.keepAction}
                </Button>
                <span className={p.push} />
                <Button variant="dangerText" onClick={() => setDialog('suspend')}>
                  Suspender {selected.report.author.name}
                </Button>
              </div>
            ) : (
              <p className={p.muted} style={{ marginTop: 'auto' }}>
                {selected.resolution}
              </p>
            )}
          </Card>
        ) : (
          <Card className={p.detail}>
            <p className={p.empty}>Escolhe uma denúncia na lista.</p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'primary'}
        title={`${selected?.report.primaryAction ?? ''}?`}
        body={
          selected?.report.kind === 'review'
            ? 'A avaliação deixa de aparecer no perfil e a média é recalculada. O autor recebe um aviso.'
            : 'O PT recebe um pedido para corrigir a descrição em 7 dias. Se não corrigir, o perfil sai do marketplace.'
        }
        confirmLabel={selected?.report.primaryAction ?? 'Confirmar'}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          resolve(
            selected?.report.kind === 'review' ? 'Avaliação removida' : 'Pedido de correção enviado',
            selected?.report.kind === 'review' ? 'Avaliação removida e média recalculada.' : 'Pedido de correção enviado ao PT.',
          );
        }}
      />
      <ConfirmDialog
        open={dialog === 'suspend'}
        title={`Suspender ${selected?.report.author.name ?? ''}?`}
        body="A conta deixa de conseguir entrar e o conteúdo público fica escondido. Podes reativar depois em Utilizadores."
        reasonLabel="Motivo (fica no histórico da conta)"
        reasonPlaceholder="Ex.: avaliações falsas a vários PTs."
        confirmLabel="Suspender conta"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          resolve(`Conta de ${selected?.report.author.name ?? ''} suspensa`, `Conta de ${selected?.report.author.name ?? ''} suspensa.`);
        }}
      />
    </>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className={s.stars} role="img" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name={n <= value ? 'starOn' : 'starOff'} size={16} />
      ))}
    </span>
  );
}
