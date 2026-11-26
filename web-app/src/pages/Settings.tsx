import { Photo } from '../components/Photo';
import { Card, PageHeader } from '../components/ui';
import { useApi } from '../data/store';
import { ago, fullDate, type Settings as SettingsData } from '../data/types';
import { euros } from '../lib';
import p from './pages.module.css';
import s from './Settings.module.css';

/**
 * Admin · Definições. Money values live in the server's configuration and in Stripe (prices),
 * so they're shown here, not edited: a change goes through a deploy, never a click.
 */
export function Settings() {
  const { data } = useApi<SettingsData>('/api/v1/admin/settings');

  return (
    <>
      <PageHeader title="Definições" subtitle="Taxas, serviços ligados e equipa com acesso ao backoffice." />

      <div className={s.grid}>
        <Card className={s.card}>
          <h2 className={p.sectionTitle}>Taxas e preços</h2>
          <Row label="Taxa da Trakio em cada pagamento a um PT" value={data ? `${data.platformFeePercent}%` : '—'} />
          <Row label="Subscrição mensal do marketplace (por PT)" value={data ? euros(data.marketplacePriceCents / 100) : '—'} />
          <Row label="Trakio Premium (por mês)" value={data ? euros(data.premiumPriceCents / 100) : '—'} />
          <p className={`${p.muted} ${p.small}`} style={{ margin: 0 }}>
            Definidos na configuração do servidor e nos preços do Stripe. Para mudar, altera a configuração e avisa os PTs com 30 dias de
            antecedência.
          </p>
        </Card>

        <Card className={s.card}>
          <h2 className={p.sectionTitle}>Serviços</h2>
          <Row
            label="Pagamentos"
            value={data ? (data.paymentsProvider === 'stripe' ? 'Stripe' : 'Modo de teste (sem cobranças reais)') : '—'}
          />
          <Row label="IA (refeições, prontidão, sugestões)" value={data ? (data.aiEnabled ? 'Ligada' : 'Desligada · alternativas simples') : '—'} />
        </Card>

        <Card className={s.card}>
          <h2 className={p.sectionTitle}>Equipa</h2>
          {(data?.admins ?? []).map((m) => (
            <div key={m.id} className={s.member}>
              <Photo url={null} name={m.email} size={36} />
              <div className={p.twoLine} style={{ flex: 1 }}>
                <span className={p.strong}>{m.email}</span>
                <span className={`${p.muted} ${p.small}`}>
                  Administrador desde {fullDate(m.since)} · última vez {ago(m.lastSeenAt).toLowerCase()}
                </span>
              </div>
            </div>
          ))}
          <p className={`${p.muted} ${p.small}`} style={{ margin: 0 }}>
            Por segurança, contas de administração não se criam no backoffice: o primeiro administrador vem da configuração do servidor.
          </p>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.member} style={{ justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
