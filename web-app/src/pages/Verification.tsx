import { useState } from 'react';

import { ApiError, api, openFile } from '../api';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { Button, Card, ConfirmDialog, PageHeader, Tabs } from '../components/ui';
import { useAdmin, useApi } from '../data/store';
import { ago, fullDate, type DocumentView, type QueueItem, type VerificationDetail } from '../data/types';
import { euros } from '../lib';
import p from './pages.module.css';
import s from './Verification.module.css';

type Tab = 'pending' | 'approved' | 'refused';

const documentTitle: Record<DocumentView['type'], string> = {
  identity: 'Documento de identificação',
  'professional-title': 'Título profissional de técnico de exercício físico',
  insurance: 'Seguro de responsabilidade civil',
};

const documentDetail: Record<DocumentView['status'], string> = {
  missing: 'Não enviado',
  submitted: 'Enviado · por confirmar',
  confirmed: 'Confirmado',
  rejected: 'Recusado',
};

/** Admin · Verificação de PTs. */
export function Verification() {
  const { notify, refreshCounts } = useAdmin();
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'refuse' | 'info' | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: list, reload: reloadList } = useApi<QueueItem[]>(`/api/v1/admin/verifications?status=${tab}`);
  const pending = useApi<QueueItem[]>('/api/v1/admin/verifications?status=pending');
  const queue = list ?? [];
  const selectedItem = queue.find((v) => v.id === selectedId) ?? queue[0] ?? null;
  const { data: selected, reload: reloadDetail } = useApi<VerificationDetail>(selectedItem ? `/api/v1/admin/verifications/${selectedItem.id}` : null);

  const run = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await task();
      notify(message);
      await Promise.all([reloadList(), reloadDetail(), pending.reload()]);
      refreshCounts();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  };

  const decide = (decision: 'approve' | 'refuse' | 'request-info', note: string, message: string) => {
    if (!selected) return;
    run(() => api.post(`/api/v1/admin/verifications/${selected.id}/decision`, { decision, note }), message);
  };

  const setDocument = (doc: DocumentView, status: 'confirmed' | 'rejected') => {
    if (!doc.id) return;
    run(() => api.put(`/api/v1/admin/verification-documents/${doc.id}/status`, { status }), status === 'confirmed' ? 'Documento confirmado.' : 'Documento recusado.');
  };

  const open = selected && (selected.status === 'submitted' || selected.status === 'info-requested');
  const first = selected?.name.split(' ')[0] ?? 'O PT';
  const missingInsurance = selected?.documents.some((d) => d.type === 'insurance' && d.status !== 'confirmed');

  return (
    <>
      <PageHeader
        title="Verificação de PTs"
        subtitle="Confirma os documentos antes de cada PT aparecer no marketplace com o selo de verificado."
      />
      <Tabs
        label="Estado dos pedidos"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId(null);
        }}
        options={[
          { value: 'pending', label: 'Por rever', count: pending.data?.length ?? 0 },
          { value: 'approved', label: 'Aprovados' },
          { value: 'refused', label: 'Recusados' },
        ]}
      />

      <div className={p.split}>
        <Card className={p.queue}>
          {queue.length === 0 ? (
            <p className={p.empty}>{list === null ? 'A carregar…' : tab === 'pending' ? 'Não há pedidos por rever. Bom trabalho!' : 'Nada aqui.'}</p>
          ) : (
            queue.map((item) => {
              const active = selectedItem?.id === item.id;
              const status =
                item.status === 'info-requested'
                  ? 'À espera do PT'
                  : item.status === 'approved'
                    ? 'Aprovado e verificado'
                    : item.status === 'refused'
                      ? 'Pedido recusado'
                      : item.ready
                        ? 'Tudo confirmado'
                        : `${item.pendingDocuments} ${item.pendingDocuments === 1 ? 'documento' : 'documentos'} por confirmar`;
              const good = item.ready || item.status === 'approved';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${p.queueItem} ${active ? p.queueItemActive : ''}`}
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                >
                  <Photo url={item.photoUrl} name={item.name} size={44} />
                  <span className={p.queueText}>
                    <span className={p.queueTop}>
                      <span className={p.queueTitle}>{item.name}</span>
                      <span className={p.queueMeta}>{ago(item.decidedAt ?? item.submittedAt)}</span>
                    </span>
                    <span className={p.queueSub}>
                      {item.city} · {item.specialties.join(', ')}
                    </span>
                    <span className={p.queueStatus}>
                      <i
                        className={p.dot}
                        style={{ background: item.status === 'refused' ? 'var(--color-danger)' : good ? 'var(--color-success)' : 'var(--color-warning)' }}
                      />
                      {status}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </Card>

        {selected ? (
          <Card key={selected.id} className={p.detail}>
            <div className={p.detailHead}>
              <Photo url={selected.photoUrl} name={selected.name} size={64} />
              <div>
                <h2 className={p.detailName}>{selected.name}</h2>
                <div className={p.muted}>
                  {selected.where} · {selected.specialties.join(', ')}
                </div>
                <div className={`${p.muted} ${p.small}`}>
                  {selected.email} · pedido enviado a {fullDate(selected.submittedAt)}
                </div>
              </div>
            </div>

            <div className={s.columns}>
              <div className={p.stack}>
                <h3 className={p.sectionTitle}>Documentos</h3>
                {selected.documents.map((doc) => (
                  <div key={doc.type} className={`${s.doc} ${doc.status !== 'confirmed' ? s.docPending : ''}`}>
                    <Icon name={doc.status === 'confirmed' ? 'statusOk' : 'statusWarning'} size={18} />
                    <div className={p.twoLine} style={{ flex: 1 }}>
                      <span className={p.dark}>{documentTitle[doc.type]}</span>
                      <span className={`${p.muted} ${p.small}`}>
                        {documentDetail[doc.status]}
                        {doc.validUntil ? ` · válido até ${fullDate(doc.validUntil)}` : ''}
                      </span>
                    </div>
                    {doc.fileUrl ? (
                      <button type="button" className={s.docAction} onClick={() => openFile(doc.fileUrl!).catch(() => notify('Não foi possível abrir o documento.'))}>
                        Ver
                      </button>
                    ) : null}
                    {open && doc.status === 'submitted' ? (
                      <>
                        <button type="button" className={s.docAction} disabled={busy} onClick={() => setDocument(doc, 'confirmed')}>
                          Confirmar
                        </button>
                        <button type="button" className={s.docAction} disabled={busy} onClick={() => setDocument(doc, 'rejected')}>
                          Recusar
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}
                <div className={`${s.doc} ${selected.payouts.payoutsEnabled ? '' : s.docPending}`}>
                  <Icon name={selected.payouts.payoutsEnabled ? 'statusOk' : 'statusWarning'} size={18} />
                  <div className={p.twoLine} style={{ flex: 1 }}>
                    <span className={p.dark}>Conta de pagamentos (Stripe)</span>
                    <span className={`${p.muted} ${p.small}`}>
                      {selected.payouts.payoutsEnabled ? 'Ligada · pronta a receber' : selected.payouts.connected ? 'Registo por terminar no Stripe' : 'Por ligar'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={p.stack}>
                <h3 className={p.sectionTitle}>Perfil público</h3>
                <div className={s.profile}>
                  <p className={s.bio}>{selected.bio || 'Sem descrição.'}</p>
                  {selected.packages.map((pkg) => (
                    <div key={pkg.id} className={s.package}>
                      <span>{pkg.name}</span>
                      <span className="mono">
                        {euros(pkg.priceCents / 100)}
                        {pkg.period === 'month' ? '/mês' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selected.adminNote ? (
              <div className={p.stack}>
                <span className={p.sectionTitle}>Última nota enviada ao PT</span>
                <p className={p.muted} style={{ margin: 0 }}>
                  {selected.adminNote}
                </p>
              </div>
            ) : null}

            {open ? (
              <>
                <div className={p.actions}>
                  <Button disabled={busy} onClick={() => decide('approve', '', `${selected.name} aprovado e verificado.`)}>
                    Aprovar e verificar
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => setDialog('info')}>
                    Pedir mais informação
                  </Button>
                  <span className={p.push} />
                  <Button variant="dangerText" disabled={busy} onClick={() => setDialog('refuse')}>
                    Recusar pedido
                  </Button>
                </div>
                <p className={`${p.muted} ${p.small}`} style={{ margin: 0 }}>
                  {selected.status === 'info-requested'
                    ? `Pedido de informação enviado a ${first}. Fica aqui até responder.`
                    : !selected.payouts.payoutsEnabled
                      ? `Sem conta de pagamentos ligada, ${first} ainda não consegue receber dos alunos.`
                      : missingInsurance
                        ? 'O seguro ainda não está confirmado. Podes aprovar na mesma ou pedir para reenviar.'
                        : 'Ao aprovar, o perfil fica com o selo de verificado e pode ativar o marketplace.'}
                </p>
              </>
            ) : selected.status === 'approved' ? (
              <div className={p.actions}>
                <span className={p.muted}>Aprovado a {fullDate(selectedItem?.decidedAt ?? null)}.</span>
                <span className={p.push} />
                <Button variant="dangerText" disabled={busy} onClick={() => setDialog('refuse')}>
                  Retirar verificação
                </Button>
              </div>
            ) : (
              <p className={p.muted} style={{ marginTop: 'auto' }}>
                Pedido recusado. {first} pode corrigir e enviar outra vez.
              </p>
            )}
          </Card>
        ) : (
          <Card className={p.detail}>
            <p className={p.empty}>{queue.length > 0 ? 'A carregar…' : 'Escolhe um pedido na lista.'}</p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'refuse'}
        title={selected?.status === 'approved' ? `Retirar a verificação de ${selected?.name ?? ''}?` : `Recusar o pedido de ${selected?.name ?? ''}?`}
        body="O PT vê o motivo na app e pode voltar a pedir depois de corrigir. Sem verificação, sai do marketplace."
        reasonLabel="Motivo (o PT vai ler isto)"
        reasonPlaceholder="Ex.: o título profissional enviado está fora da validade."
        confirmLabel="Recusar"
        danger
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          setDialog(null);
          decide('refuse', reason, `Pedido de ${selected?.name ?? ''} recusado.`);
        }}
      />
      <ConfirmDialog
        open={dialog === 'info'}
        title="Pedir mais informação"
        body={`${first} vê esta mensagem no ecrã de verificação da app.`}
        reasonLabel="Mensagem"
        reasonPlaceholder="Ex.: podes reenviar a apólice do seguro com a data de validade visível?"
        confirmLabel="Enviar pedido"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => {
          setDialog(null);
          decide('request-info', reason, 'Pedido de informação enviado.');
        }}
      />
    </>
  );
}
