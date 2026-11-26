import { useState } from 'react';

import { ApiError, api } from '../api';
import { Icon } from '../components/Icon';
import { Button, Card, ConfirmDialog, PageHeader, Tabs } from '../components/ui';
import { useAdmin, useApi } from '../data/store';
import { ago, type Report } from '../data/types';
import p from './pages.module.css';
import s from './Reports.module.css';

type Tab = 'open' | 'resolved';

const resolutionLabel: Record<NonNullable<Report['resolution']>, string> = {
  'remove-review': 'Avaliação removida',
  'ask-profile-fix': 'Pedido de correção do perfil',
  keep: 'Mantido como estava',
};

function title(r: Report): string {
  return r.kind === 'review' ? `Avaliação a ${r.trainerName ?? 'um PT'}` : `Perfil de ${r.trainerName ?? 'um PT'}`;
}

/** Facts worked out by the server — not typed by anyone. */
function signals(r: Report): string[] {
  if (!r.signals) return [];
  const out = [
    r.signals.authorTrainedWithTrainer
      ? 'O autor treinou mesmo com este PT (houve pagamento)'
      : 'Nunca houve pagamentos nem treinos entre o autor e o PT',
  ];
  if (r.signals.authorAccountAgeDays !== null) {
    out.push(
      r.signals.authorAccountAgeDays <= 7
        ? `A conta do autor foi criada há ${r.signals.authorAccountAgeDays} ${r.signals.authorAccountAgeDays === 1 ? 'dia' : 'dias'}`
        : `Conta do autor com ${r.signals.authorAccountAgeDays} dias`,
    );
  }
  return out;
}

/** Admin · Denúncias. */
export function Reports() {
  const { notify, refreshCounts } = useAdmin();
  const [tab, setTab] = useState<Tab>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, reload } = useApi<Report[]>(`/api/v1/admin/reports?status=${tab}`);
  const open = useApi<Report[]>('/api/v1/admin/reports?status=open');
  const list = data ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;
  const primary = selected?.kind === 'review' ? 'Remover avaliação' : 'Pedir para corrigir o perfil';

  const resolve = async (resolution: NonNullable<Report['resolution']>, message: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/reports/${selected.id}/resolve`, { resolution });
      notify(message);
      setSelectedId(null);
      await Promise.all([reload(), open.reload()]);
      refreshCounts();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
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
          { value: 'open', label: 'Por rever', count: open.data?.length ?? 0 },
          { value: 'resolved', label: 'Resolvidas' },
        ]}
      />

      <div className={p.split}>
        <Card className={p.queue}>
          {list.length === 0 ? (
            <p className={p.empty}>{data === null ? 'A carregar…' : tab === 'open' ? 'Nenhuma denúncia por rever.' : 'Ainda nada resolvido.'}</p>
          ) : (
            list.map((report) => {
              const active = selected?.id === report.id;
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
                      <span className={p.queueTitle}>{title(report)}</span>
                      <span className={p.queueMeta}>{ago(report.createdAt)}</span>
                    </span>
                    <span className={p.queueSub}>{report.resolution ? resolutionLabel[report.resolution] : report.reason}</span>
                  </span>
                </button>
              );
            })
          )}
        </Card>

        {selected ? (
          <Card key={selected.id} className={p.detail}>
            <div>
              <h2 className={p.detailName}>{title(selected)}</h2>
              <div className={p.muted}>Reportada {ago(selected.createdAt).toLowerCase()}</div>
            </div>

            <div className={p.stack}>
              <h3 className={p.sectionTitle}>{selected.kind === 'review' ? 'A avaliação' : 'O que está no perfil'}</h3>
              <div className={s.quoteCard}>
                <div className={s.quoteHead}>
                  <span className={s.avatarBlank}>
                    <Icon name="user" size={16} />
                  </span>
                  <div className={p.twoLine} style={{ flex: 1 }}>
                    <span className={p.strong}>{selected.kind === 'review' ? (selected.reviewAuthorName ?? 'Conta removida') : selected.trainerName}</span>
                    <span className={`${p.muted} ${p.small}`}>{selected.kind === 'review' ? `Avaliou ${selected.trainerName ?? 'o PT'}` : 'Descrição pública'}</span>
                  </div>
                  {selected.reviewRating !== null ? <Stars value={selected.reviewRating} /> : null}
                </div>
                <p className={s.quote}>{selected.kind === 'review' ? `“${selected.reviewComment || '(sem comentário)'}”` : `“${selected.trainerBio ?? ''}”`}</p>
              </div>
            </div>

            <div className={p.stack}>
              <h3 className={p.sectionTitle}>Quem reportou</h3>
              <div className={s.reporter}>
                <span className={s.avatarBlank}>
                  <Icon name="user" size={16} />
                </span>
                <div className={p.twoLine}>
                  <span className={p.strong}>{selected.reporterName ?? 'Conta removida'}</span>
                  <span className={p.muted}>“{selected.reason}”</span>
                </div>
              </div>
            </div>

            {signals(selected).length > 0 ? (
              <div className={p.stack}>
                <h3 className={p.sectionTitle}>O que verificámos</h3>
                <div className={s.signals}>
                  {signals(selected).map((signal) => (
                    <div key={signal} className={s.signal}>
                      <Icon name="signal" size={18} />
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selected.status === 'open' ? (
              <div className={p.actions}>
                <Button disabled={busy} onClick={() => setDialog(true)}>
                  {primary}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => resolve('keep', 'Denúncia fechada. Nada foi alterado.')}>
                  Manter como está
                </Button>
              </div>
            ) : (
              <p className={p.muted} style={{ marginTop: 'auto' }}>
                {selected.resolution ? resolutionLabel[selected.resolution] : 'Resolvida'}. Para suspender uma conta, usa Utilizadores.
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
        open={dialog}
        title={`${primary}?`}
        body={
          selected?.kind === 'review'
            ? 'A avaliação deixa de aparecer no perfil e a média é recalculada. Fica guardada no histórico.'
            : 'A decisão fica registada. Escreve ao PT a pedir a correção da descrição.'
        }
        confirmLabel={primary}
        onClose={() => setDialog(false)}
        onConfirm={() => {
          setDialog(false);
          if (selected?.kind === 'review') resolve('remove-review', 'Avaliação removida e média recalculada.');
          else resolve('ask-profile-fix', 'Pedido de correção registado.');
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
