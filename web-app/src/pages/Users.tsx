import { useState } from 'react';

import { Icon } from '../components/Icon';
import { ApiError, api } from '../api';
import { Photo } from '../components/Photo';
import { Button, Card, ConfirmDialog, PageHeader, RowMenu, SearchField, StatusPill, Tabs, type Tone } from '../components/ui';
import { useAdmin, useApi } from '../data/store';
import { ago, dayMonth, type Page, type Totals, type UserRow, type UserStatus } from '../data/types';
import { thousands } from '../lib';
import p from './pages.module.css';
import s from './Users.module.css';

type Filter = 'all' | 'students' | 'pts' | 'suspended';

const statusInfo: Record<UserStatus, { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Ativo' },
  suspended: { tone: 'danger', label: 'Suspenso' },
};

const PAGE_SIZE = 12;

function plan(u: UserRow): string {
  if (u.role === 'trainer') return u.listed ? 'Verificado · no marketplace' : u.verified ? 'Verificado · fora do marketplace' : 'Por verificar';
  if (u.role === 'admin') return 'Equipa Trakio';
  return [u.coached ? 'Com PT' : 'Sozinho', u.premium ? 'Premium' : null].filter(Boolean).join(' · ');
}

/** Admin · Utilizadores. */
export function Users() {
  const { notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [suspending, setSuspending] = useState<UserRow | null>(null);

  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (query.trim()) params.set('q', query.trim());
  if (filter === 'students') params.set('role', 'client');
  if (filter === 'pts') params.set('role', 'trainer');
  if (filter === 'suspended') params.set('status', 'suspended');
  const { data, reload } = useApi<Page<UserRow>>(`/api/v1/admin/users?${params.toString()}`);
  const totals = useApi<Totals>('/api/v1/admin/users/totals');
  const visible = data?.content ?? [];
  const pages = Math.max(1, data?.totalPages ?? 1);

  const change = (f: Filter) => {
    setFilter(f);
    setPage(0);
  };

  const setStatus = async (u: UserRow, action: 'suspend' | 'reactivate', reason: string) => {
    try {
      await api.post(`/api/v1/admin/users/${u.id}/${action}`, { reason });
      notify(action === 'suspend' ? `Conta de ${u.name ?? u.email} suspensa. A sessão terminou em todos os aparelhos.` : `Conta de ${u.name ?? u.email} reativada.`);
      await Promise.all([reload(), totals.reload()]);
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível alterar a conta.');
    }
  };

  const t = totals.data;
  return (
    <>
      <PageHeader
        title="Utilizadores"
        subtitle={t ? `${thousands(t.all)} contas · ${thousands(t.premium)} com Premium` : 'Alunos e PTs'}
        actions={<SearchField value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="Procurar por nome ou email" />}
      />
      <Tabs
        label="Filtrar utilizadores"
        value={filter}
        onChange={change}
        options={[
          { value: 'all', label: 'Todos', count: t?.all ?? 0 },
          { value: 'students', label: 'Alunos', count: t?.clients ?? 0 },
          { value: 'pts', label: 'PTs', count: t?.trainers ?? 0 },
          { value: 'suspended', label: 'Suspensos', count: t?.suspended ?? 0 },
        ]}
      />

      <Card className={s.tableCard}>
        <table className={p.table}>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th style={{ width: 90 }}>Tipo</th>
              <th style={{ width: 230 }}>Plano</th>
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
              const type = u.role === 'trainer' ? 'PT' : u.role === 'admin' ? 'Admin' : 'Aluno';
              return (
                <tr key={u.id}>
                  <td>
                    <span className={p.person}>
                      <Photo url={u.photoUrl} name={u.name ?? u.email} size={32} />
                      <span className={p.twoLine}>
                        <span className={p.strong}>{u.name ?? 'Perfil por criar'}</span>
                        <span className={p.small}>{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`${s.type} ${type === 'PT' ? s.typePt : ''}`}>{type}</span>
                  </td>
                  <td className={p.dark}>{plan(u)}</td>
                  <td>{u.city ?? '—'}</td>
                  <td>{dayMonth(u.since)}</td>
                  <td>{ago(u.lastSeenAt)}</td>
                  <td>
                    <StatusPill tone={info.tone} label={info.label} />
                  </td>
                  <td>
                    {u.role === 'admin' ? null : (
                      <RowMenu
                        label={`Ações para ${u.name ?? u.email}`}
                        items={[
                          { label: 'Enviar email', onSelect: () => window.open(`mailto:${u.email}`) },
                          u.status === 'suspended'
                            ? { label: 'Reativar conta', onSelect: () => setStatus(u, 'reactivate', 'Reativada no backoffice') }
                            : { label: 'Suspender conta', danger: true, onSelect: () => setSuspending(u) },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && visible.length === 0 ? (
          <div className={p.empty}>
            <Icon name="user" size={16} />
            <p>{query ? `Ninguém corresponde a “${query}”.` : 'Ninguém neste filtro.'}</p>
          </div>
        ) : null}
        <footer className={s.footer}>
          <span className={p.muted}>
            A mostrar {visible.length} de {data?.totalElements ?? 0}
          </span>
          <span className={s.pager}>
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="mono">
              {page + 1} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
              Seguinte
            </Button>
          </span>
        </footer>
      </Card>

      <ConfirmDialog
        open={suspending !== null}
        title={`Suspender a conta de ${suspending?.name ?? suspending?.email ?? ''}?`}
        body={
          suspending?.role === 'trainer'
            ? 'O perfil sai do marketplace e a sessão termina em todos os aparelhos. Os dados ficam guardados e podes reativar a conta.'
            : 'A pessoa deixa de conseguir entrar e a sessão termina em todos os aparelhos. Os dados ficam guardados e podes reativar a conta.'
        }
        reasonLabel="Motivo (fica no histórico da conta)"
        reasonPlaceholder="Ex.: várias denúncias de avaliações falsas."
        confirmLabel="Suspender conta"
        danger
        onClose={() => setSuspending(null)}
        onConfirm={(reason) => {
          if (!suspending) return;
          setStatus(suspending, 'suspend', reason);
          setSuspending(null);
        }}
      />
    </>
  );
}
