import { useState } from 'react';

import { Icon } from '../components/Icon';
import { Portrait } from '../components/Portrait';
import { Button, Card, ConfirmDialog, fieldStyles, PageHeader, Tabs } from '../components/ui';
import { useAdmin, type VerificationOutcome } from '../data/store';
import p from './pages.module.css';
import s from './Verification.module.css';

type Tab = 'pending' | 'approved' | 'refused';

/** Admin · Verificação de PTs. */
export function Verification() {
  const { verification, decideVerification, setVerificationNote, notify } = useAdmin();
  const [tab, setTab] = useState<Tab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'refuse' | 'info' | 'doc' | null>(null);

  const inTab = (outcome: VerificationOutcome | null) =>
    tab === 'pending' ? outcome === null || outcome === 'info-requested' : tab === 'approved' ? outcome === 'approved' : outcome === 'refused';
  const list = verification.filter((v) => inTab(v.outcome));
  const selected = list.find((v) => v.request.id === selectedId) ?? list[0] ?? null;
  const counts = {
    pending: verification.filter((v) => v.outcome === null || v.outcome === 'info-requested').length,
    approved: 126 + verification.filter((v) => v.outcome === 'approved').length,
    refused: 7 + verification.filter((v) => v.outcome === 'refused').length,
  };

  const decide = (outcome: VerificationOutcome, message: string) => {
    if (!selected) return;
    decideVerification(selected.request.id, outcome);
    if (outcome !== 'info-requested') setSelectedId(null);
    notify(message);
  };

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
          { value: 'pending', label: 'Por rever', count: counts.pending },
          { value: 'approved', label: 'Aprovados', count: counts.approved },
          { value: 'refused', label: 'Recusados', count: counts.refused },
        ]}
      />

      <div className={p.split}>
        <Card className={p.queue}>
          {list.length === 0 ? (
            <p className={p.empty}>{tab === 'pending' ? 'Não há pedidos por rever. Bom trabalho!' : 'Ainda nada aqui nesta sessão.'}</p>
          ) : (
            list.map(({ request, outcome }) => {
              const active = selected?.request.id === request.id;
              const status =
                outcome === 'info-requested' ? 'À espera do PT' : outcome === 'approved' ? 'Aprovado e publicado' : outcome === 'refused' ? 'Pedido recusado' : request.summary;
              const good = request.ready || outcome === 'approved';
              return (
                <button
                  key={request.id}
                  type="button"
                  className={`${p.queueItem} ${active ? p.queueItemActive : ''}`}
                  onClick={() => setSelectedId(request.id)}
                  aria-pressed={active}
                >
                  <Portrait person={request.id} size={44} />
                  <span className={p.queueText}>
                    <span className={p.queueTop}>
                      <span className={p.queueTitle}>{request.name}</span>
                      <span className={p.queueMeta}>{request.ago}</span>
                    </span>
                    <span className={p.queueSub}>{request.city}</span>
                    <span className={p.queueStatus}>
                      <i
                        className={p.dot}
                        style={{ background: outcome === 'refused' ? 'var(--color-danger)' : good ? 'var(--color-success)' : 'var(--color-warning)' }}
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
          <Card key={selected.request.id} className={p.detail}>
            <div className={p.detailHead}>
              <Portrait person={selected.request.id} size={64} />
              <div>
                <h2 className={p.detailName}>{selected.request.name}</h2>
                <div className={p.muted}>
                  {selected.request.where} · {selected.request.specialties}
                </div>
                <div className={`${p.muted} ${p.small}`}>Pedido enviado a {selected.request.sentAt}</div>
              </div>
            </div>

            <div className={s.columns}>
              <div className={p.stack}>
                <h3 className={p.sectionTitle}>Documentos</h3>
                {selected.request.docs.map((doc) => (
                  <div key={doc.id} className={`${s.doc} ${doc.status === 'pending' ? s.docPending : ''}`}>
                    <Icon name={doc.status === 'ok' ? 'statusOk' : 'statusWarning'} size={18} />
                    <div className={p.twoLine} style={{ flex: 1 }}>
                      <span className={p.dark}>{doc.title}</span>
                      <span className={`${p.muted} ${p.small}`}>{doc.detail}</span>
                    </div>
                    {doc.action ? (
                      <button type="button" className={s.docAction} onClick={() => setDialog('doc')}>
                        {doc.action}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className={p.stack}>
                <h3 className={p.sectionTitle}>Perfil público</h3>
                <div className={s.profile}>
                  <p className={s.bio}>{selected.request.bio}</p>
                  {selected.request.packages.map((pkg) => (
                    <div key={pkg.name} className={s.package}>
                      <span>{pkg.name}</span>
                      <span className="mono">{pkg.price} €/mês</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <label className={p.stack}>
              <span className={p.sectionTitle}>Nota interna</span>
              <textarea
                className={fieldStyles.textarea}
                placeholder="Só a equipa Trakio vê esta nota."
                value={selected.note}
                onChange={(e) => setVerificationNote(selected.request.id, e.target.value)}
              />
            </label>

            {selected.outcome === null || selected.outcome === 'info-requested' ? (
              <>
                <div className={p.actions}>
                  <Button onClick={() => decide('approved', `${selected.request.name} aprovado e publicado no marketplace.`)}>
                    Aprovar e publicar
                  </Button>
                  <Button variant="outline" onClick={() => setDialog('info')}>
                    Pedir mais informação
                  </Button>
                  <span className={p.push} />
                  <Button variant="dangerText" onClick={() => setDialog('refuse')}>
                    Recusar pedido
                  </Button>
                </div>
                <p className={`${p.muted} ${p.small}`} style={{ margin: 0 }}>
                  {selected.outcome === 'info-requested'
                    ? `Pedido enviado a ${selected.request.name.split(' ')[0]}. Fica aqui até ele responder.`
                    : (selected.request.warning ?? 'Está tudo confirmado. Ao aprovar, o perfil aparece no marketplace com o selo de verificado.')}
                </p>
              </>
            ) : (
              <p className={`${p.muted}`} style={{ marginTop: 'auto' }}>
                {selected.outcome === 'approved' ? 'Aprovado nesta sessão.' : 'Recusado nesta sessão.'}
              </p>
            )}
          </Card>
        ) : (
          <Card className={p.detail}>
            <p className={p.empty}>Escolhe um pedido na lista.</p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'refuse'}
        title={`Recusar o pedido de ${selected?.request.name ?? ''}?`}
        body="O PT recebe um email com o motivo e pode voltar a pedir depois de corrigir."
        reasonLabel="Motivo (o PT vai ler isto)"
        reasonPlaceholder="Ex.: o título profissional enviado está fora da validade."
        confirmLabel="Recusar pedido"
        danger
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          decide('refused', `Pedido de ${selected?.request.name ?? ''} recusado. O PT foi avisado por email.`);
        }}
      />
      <ConfirmDialog
        open={dialog === 'info'}
        title="Pedir mais informação"
        body={`${selected?.request.name.split(' ')[0] ?? 'O PT'} recebe uma notificação na app e por email.`}
        reasonLabel="Mensagem"
        reasonPlaceholder="Ex.: podes reenviar a apólice do seguro com a data de validade visível?"
        confirmLabel="Enviar pedido"
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          decide('info-requested', 'Pedido de informação enviado.');
        }}
      />
      <ConfirmDialog
        open={dialog === 'doc'}
        title="Documento"
        body="A pré-visualização dos documentos chega quando o armazenamento de ficheiros estiver ligado ao backend."
        confirmLabel="Fechar"
        cancelLabel="Voltar"
        onClose={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
    </>
  );
}
