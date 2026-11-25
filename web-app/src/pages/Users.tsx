import { useState } from 'react';

import { Icon } from '../components/Icon';
import { Portrait } from '../components/Portrait';
import { Button, Card, ConfirmDialog, PageHeader, RowMenu, SearchField, StatusPill, Tabs, type Tone } from '../components/ui';
import { userTotals, type UserRow, type UserStatus } from '../data/mock';
import { useAdmin } from '../data/store';
import { thousands } from '../lib';
import p from './pages.module.css';
import s from './Users.module.css';

type Filter = 'all' | 'students' | 'pts' | 'premium' | 'suspended';

const statusInfo: Record<UserStatus, { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Ativo' },
  pending: { tone: 'warning', label: 'Por verificar' },
  suspended: { tone: 'danger', label: 'Suspenso' },
};

const PAGE_SIZE = 9;

/** Admin · Utilizadores. */
export function Users() {
  const { users, setUserStatus, notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [suspending, setSuspending] = useState<UserRow | null>(null);

  const q = query.trim().toLowerCase();
  const list = users.filter((u) => {
    const matches = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q);
    const inFilter =
      filter === 'students'
        ? u.type === 'Aluno'
        : filter === 'pts'
          ? u.type === 'PT'
          : filter === 'premium'
            ? u.premium
            : filter === 'suspended'
              ? u.status === 'suspended'
              : true;
    return matches && inFilter;
  });
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const suspendedNow = users.filter((u) => u.status === 'suspended').length;

  const change = (f: Filter) => {
    setFilter(f);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Utilizadores"
        subtitle={`${thousands(userTotals.all)} contas · alunos e PTs`}
        actions={<SearchField value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="Procurar por nome, email ou cidade" />}
      />
      <Tabs
        label="Filtrar utilizadores"
        value={filter}
        onChange={change}
        options={[
          { value: 'all', label: 'Todos', count: userTotals.all },
          { value: 'students', label: 'Alunos', count: userTotals.students },
          { value: 'pts', label: 'PTs', count: userTotals.pts },
          { value: 'premium', label: 'Premium', count: userTotals.premium },
          { value: 'suspended', label: 'Suspensos', count: userTotals.suspended + suspendedNow },
        ]}
      />

      <Card className={s.tableCard}>
        <table className={p.table}>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th style={{ width: 90 }}>Tipo</th>
              <th style={{ width: 220 }}>Plano</th>
              <th style={{ width: 100 }}>Cidade</th>
              <th style={{ width: 100 }}>Desde</th>
              <th style={{ width: 110 }}>Última vez</th>
              <th style={{ width: 140 }}>Estado</th>
              <th style={{ width: 52 }} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const info = statusInfo[u.status];
              return (
                <tr key={u.id}>
                  <td>
                    <span className={p.person}>
                      <Portrait person={u.person} size={32} />
                      <span className={p.twoLine}>
                        <span className={p.strong}>{u.name}</span>
                        <span className={p.small}>{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`${s.type} ${u.type === 'PT' ? s.typePt : ''}`}>{u.type}</span>
                  </td>
                  <td className={p.dark}>{u.plan}</td>
                  <td>{u.city}</td>
                  <td>{u.since}</td>
                  <td>{u.lastSeen}</td>
                  <td>
                    <StatusPill tone={info.tone} label={info.label} />
                  </td>
                  <td>
                    <RowMenu
                      label={`Ações para ${u.name}`}
                      items={[
                        { label: 'Enviar email', onSelect: () => notify(`Email para ${u.email} aberto no cliente de email.`) },
                        { label: 'Repor palavra-passe', onSelect: () => notify(`Link para repor a palavra-passe enviado a ${u.name.split(' ')[0]}.`) },
                        u.status === 'suspended'
                          ? {
                              label: 'Reativar conta',
                              onSelect: () => {
                                setUserStatus(u.id, 'active');
                                notify(`Conta de ${u.name} reativada.`);
                              },
                            }
                          : { label: 'Suspender conta', danger: true, onSelect: () => setSuspending(u) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <div className={p.empty}>
            <Icon name="user" size={16} />
            <p>Ninguém corresponde a “{query}”.</p>
          </div>
        ) : null}
        <footer className={s.footer}>
          <span className={p.muted}>
            A mostrar {visible.length} de {list.length} (dados de exemplo)
          </span>
          <span className={s.pager}>
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Anterior
            </Button>
            <span className="mono">
              {current + 1} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Seguinte
            </Button>
          </span>
        </footer>
      </Card>

      <ConfirmDialog
        open={suspending !== null}
        title={`Suspender a conta de ${suspending?.name ?? ''}?`}
        body={
          suspending?.type === 'PT'
            ? 'O perfil sai do marketplace e os alunos deixam de poder marcar sessões. Os pagamentos ativos ficam em pausa.'
            : 'A pessoa deixa de conseguir entrar. Os dados ficam guardados e podes reativar a conta a qualquer momento.'
        }
        reasonLabel="Motivo (fica no histórico da conta)"
        reasonPlaceholder="Ex.: várias denúncias de avaliações falsas."
        confirmLabel="Suspender conta"
        danger
        onClose={() => setSuspending(null)}
        onConfirm={() => {
          if (!suspending) return;
          setUserStatus(suspending.id, 'suspended');
          notify(`Conta de ${suspending.name} suspensa.`);
          setSuspending(null);
        }}
      />
    </>
  );
}
