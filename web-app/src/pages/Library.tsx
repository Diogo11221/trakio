import { useState } from 'react';

import thumb from '../assets/figma/render-bench-thumb.jpg';
import { Icon } from '../components/Icon';
import { Button, Card, ConfirmDialog, fieldStyles, PageHeader, RowMenu, SearchField, StatusPill, Tabs, type Tone } from '../components/ui';
import { ApiError, api } from '../api';
import { useAdmin, useApi } from '../data/store';
import { groupLabels, type DemoStatus, type ExerciseRow, type MuscleGroup, type Page } from '../data/types';
import p from './pages.module.css';
import s from './Library.module.css';

type Group = 'all' | MuscleGroup;

const groups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

const demoInfo: Record<DemoStatus, { tone: Tone; label: string }> = {
  ready: { tone: 'success', label: 'Pronta' },
  production: { tone: 'warning', label: 'Em produção' },
  todo: { tone: 'neutral', label: 'Por fazer' },
};

/** Admin · Biblioteca de exercícios. */
export function Library() {
  const { notify } = useAdmin();
  const [group, setGroup] = useState<Group>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; group: MuscleGroup; muscles: string; equipment: string }>({ name: '', group: 'chest', muscles: '', equipment: '' });

  const params = new URLSearchParams({ size: '100' });
  if (query.trim()) params.set('q', query.trim());
  if (group !== 'all') params.set('group', group);
  const { data, reload } = useApi<Page<ExerciseRow>>(`/api/v1/admin/exercises?${params.toString()}`);
  const totals = useApi<Record<DemoStatus, number>>('/api/v1/admin/exercises/demo-totals');
  const list = data?.content ?? [];
  const live = (demo: DemoStatus) => totals.data?.[demo] ?? 0;
  const total = live('ready') + live('production') + live('todo');

  const save = async (task: () => Promise<unknown>, message: string) => {
    try {
      await task();
      notify(message);
      await Promise.all([reload(), totals.reload()]);
      return true;
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Não foi possível guardar.');
      return false;
    }
  };

  return (
    <>
      <PageHeader
        title="Biblioteca de exercícios"
        subtitle="Os exercícios que alunos e PTs usam nos planos, com a demonstração 3D de cada um."
        actions={<Button size="sm" onClick={() => setAdding(true)}>+ Novo exercício</Button>}
      />

      <Card className={s.demoCard}>
        <div className={s.demoTotal}>
          <span className={p.kpiLabel}>Demonstrações 3D</span>
          <span className={s.demoValue}>
            <span className="mono">{live('ready')}</span>
            <span className={p.muted}>de {total} prontas</span>
          </span>
        </div>
        <div className={s.demoBar} role="img" aria-label={`${live('ready')} prontas, ${live('production')} em produção, ${live('todo')} por fazer`}>
          <span style={{ flexGrow: live('ready'), background: 'var(--color-success)' }} />
          <span style={{ flexGrow: live('production'), background: 'var(--color-warning)' }} />
          <span style={{ flexGrow: live('todo'), background: 'var(--color-track)' }} />
        </div>
        <div className={s.demoLegend}>
          {(['ready', 'production', 'todo'] as const).map((d) => (
            <span key={d}>
              <StatusPill tone={demoInfo[d].tone} label={demoInfo[d].label} />
              <span className="mono">{live(d)}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className={p.toolbar}>
        <Tabs label="Grupo muscular" value={group} onChange={setGroup} options={[{ value: 'all', label: 'Todos' }, ...groups.map((g) => ({ value: g, label: groupLabels[g] }))]} />
        <SearchField value={query} onChange={setQuery} placeholder="Procurar exercício" width={260} />
      </div>

      <Card className={s.tableCard}>
        <table className={p.table}>
          <thead>
            <tr>
              <th style={{ width: 420 }}>Exercício</th>
              <th>Músculos</th>
              <th style={{ width: 160 }}>Equipamento</th>
              <th style={{ width: 160 }}>Demonstração 3D</th>
              <th style={{ width: 120 }}>Usado em</th>
              <th style={{ width: 52 }} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => {
              const info = demoInfo[e.demoStatus];
              return (
                <tr key={e.id}>
                  <td>
                    <span className={p.person} style={{ gap: 14 }}>
                      <span className={s.thumb}>
                        {e.demoStatus === 'ready' ? <img src={thumb} alt="" className={s.thumbImg} /> : <Icon name="dumbbell" size={20} />}
                      </span>
                      <span className={p.strong}>{e.name}</span>
                    </span>
                  </td>
                  <td>{e.muscles}</td>
                  <td>{e.equipment}</td>
                  <td>
                    <StatusPill tone={info.tone} label={info.label} />
                  </td>
                  <td className={p.dark}>{e.usedIn === 1 ? '1 plano' : `${e.usedIn} planos`}</td>
                  <td>
                    <RowMenu
                      label={`Ações para ${e.name}`}
                      items={[
                        ...(e.demoStatus !== 'ready'
                          ? [
                              {
                                label: e.demoStatus === 'todo' ? 'Pedir demonstração 3D' : 'Marcar demonstração como pronta',
                                onSelect: () => {
                                  const next = e.demoStatus === 'todo' ? 'production' : 'ready';
                                  save(
                                    () => api.put(`/api/v1/admin/exercises/${e.id}/demo-status`, { demoStatus: next }),
                                    next === 'production' ? `Demonstração de “${e.name}” pedida à equipa de 3D.` : `A demonstração de “${e.name}” está pronta.`,
                                  );
                                },
                              },
                            ]
                          : [
                              {
                                label: 'Voltar a pôr em produção',
                                onSelect: () =>
                                  save(() => api.put(`/api/v1/admin/exercises/${e.id}/demo-status`, { demoStatus: 'production' }), `“${e.name}” voltou para produção.`),
                              },
                            ]),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && list.length === 0 ? <p className={p.empty}>Nenhum exercício encontrado.</p> : null}
      </Card>

      <ConfirmDialog
        open={adding}
        title="Novo exercício"
        body="Fica disponível para os PTs logo a seguir. A demonstração 3D é pedida à parte."
        confirmLabel="Adicionar"
        onClose={() => setAdding(false)}
        onConfirm={async () => {
          if (draft.name.trim().length < 3) {
            notify('Dá um nome ao exercício.');
            return;
          }
          const ok = await save(
            () =>
              api.post('/api/v1/admin/exercises', {
                name: draft.name.trim(),
                group: draft.group,
                muscles: draft.muscles.trim() || groupLabels[draft.group],
                equipment: draft.equipment.trim(),
              }),
            `“${draft.name.trim()}” adicionado à biblioteca.`,
          );
          if (!ok) return;
          setDraft({ name: '', group: 'chest', muscles: '', equipment: '' });
          setAdding(false);
          setGroup('all');
        }}
      >
        <label className={fieldStyles.field}>
          Nome
          <input className={fieldStyles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Remada curvada" autoFocus />
        </label>
        <div className={fieldStyles.field}>
          Grupo muscular
          <div className={s.groupPicker}>
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                className={`${s.groupOption} ${draft.group === g ? s.groupOptionActive : ''}`}
                onClick={() => setDraft({ ...draft, group: g })}
                aria-pressed={draft.group === g}
              >
                {groupLabels[g]}
              </button>
            ))}
          </div>
        </div>
        <label className={fieldStyles.field}>
          Músculos
          <input className={fieldStyles.input} value={draft.muscles} onChange={(e) => setDraft({ ...draft, muscles: e.target.value })} placeholder="Ex.: Costas, bíceps" />
        </label>
        <label className={fieldStyles.field}>
          Material
          <input className={fieldStyles.input} value={draft.equipment} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })} placeholder="Ex.: Barra" />
        </label>
      </ConfirmDialog>
    </>
  );
}
