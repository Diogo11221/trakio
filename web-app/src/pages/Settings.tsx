import { useState } from 'react';

import { Portrait, type Person } from '../components/Portrait';
import { Button, Card, ConfirmDialog, fieldStyles, PageHeader } from '../components/ui';
import { useAdmin } from '../data/store';
import p from './pages.module.css';
import s from './Settings.module.css';

const team: { person: Person; name: string; role: string }[] = [
  { person: 'marta', name: 'Marta Neves', role: 'Administradora' },
  { person: 'miguel', name: 'Miguel Costa', role: 'Suporte' },
];

/**
 * Admin · Definições. Not drawn in Figma yet — kept small: platform fees and
 * the team. Changing money values always goes through a confirmation.
 */
export function Settings() {
  const { notify } = useAdmin();
  const [saved, setSaved] = useState({ fee: 10, subscription: 4 });
  const [fee, setFee] = useState('10');
  const [subscription, setSubscription] = useState('4');
  const [confirming, setConfirming] = useState(false);

  const nextFee = Number(fee.replace(',', '.'));
  const nextSub = Number(subscription.replace(',', '.'));
  const valid = Number.isFinite(nextFee) && nextFee >= 0 && nextFee <= 30 && Number.isFinite(nextSub) && nextSub >= 0 && nextSub <= 50;
  const dirty = nextFee !== saved.fee || nextSub !== saved.subscription;

  return (
    <>
      <PageHeader title="Definições" subtitle="Taxas da plataforma e equipa com acesso ao backoffice." />

      <div className={s.grid}>
        <Card className={s.card}>
          <h2 className={p.sectionTitle}>Taxas</h2>
          <label className={fieldStyles.field}>
            Taxa da Trakio em cada pagamento a um PT
            <span className={s.suffixed}>
              <input className={fieldStyles.input} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
              <span>%</span>
            </span>
          </label>
          <label className={fieldStyles.field}>
            Subscrição mensal do marketplace (por PT)
            <span className={s.suffixed}>
              <input className={fieldStyles.input} inputMode="decimal" value={subscription} onChange={(e) => setSubscription(e.target.value)} />
              <span>€</span>
            </span>
          </label>
          {!valid ? <p className={s.error}>A taxa vai de 0 a 30% e a subscrição de 0 a 50 €.</p> : null}
          <div className={p.actions}>
            <Button disabled={!valid || !dirty} onClick={() => setConfirming(true)}>
              Rever alterações
            </Button>
            {dirty ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFee(String(saved.fee));
                  setSubscription(String(saved.subscription));
                }}
              >
                Desfazer
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className={s.card}>
          <h2 className={p.sectionTitle}>Equipa</h2>
          {team.map((m) => (
            <div key={m.name} className={s.member}>
              <Portrait person={m.person} size={36} />
              <div className={p.twoLine} style={{ flex: 1 }}>
                <span className={p.strong}>{m.name}</span>
                <span className={`${p.muted} ${p.small}`}>{m.role}</span>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => notify('Os convites para a equipa chegam com o login de administradores.')}>
            Convidar pessoa
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Mudar as taxas?"
        body="Aplica-se a pagamentos novos a partir de amanhã. Os PTs recebem um email com 30 dias de antecedência."
        confirmLabel="Confirmar alterações"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setSaved({ fee: nextFee, subscription: nextSub });
          setConfirming(false);
          notify('Taxas atualizadas.');
        }}
      >
        <div className={s.diff}>
          <span>Taxa por pagamento</span>
          <span className="mono">
            {saved.fee}% → {nextFee}%
          </span>
          <span>Subscrição do marketplace</span>
          <span className="mono">
            {saved.subscription} € → {nextSub} €
          </span>
        </div>
      </ConfirmDialog>
    </>
  );
}
