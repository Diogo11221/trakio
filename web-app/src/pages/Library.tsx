import { useState } from 'react';

import thumb from '../assets/figma/render-bench-thumb.jpg';
import { Icon } from '../components/Icon';
import { Button, Card, ConfirmDialog, fieldStyles, PageHeader, RowMenu, SearchField, StatusPill, Tabs, type Tone } from '../components/ui';
import { demoTotals, exercises as sampleExercises, type DemoStatus, type Exercise } from '../data/mock';
import { useAdmin } from '../data/store';
import p from './pages.module.css';
import s from './Library.module.css';

type Group = 'all' | Exercise['group'];

const groups: Exercise['group'][] = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core'];

const demoInfo: Record<DemoStatus, { tone: Tone; label: string }> = {
  ready: { tone: 'success', label: 'Pronta' },
  production: { tone: 'warning', label: 'Em produção' },
  todo: { tone: 'neutral', label: 'Por fazer' },
};

/** Admin · Biblioteca de exercícios. */
export function Library() {
  const { exercises, addExercise, setDemoStatus, notify } = useAdmin();
  const [group, setGroup] = useState<Group>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', group: 'Peito' as Exercise['group'], muscles: '', equipment: '' });

  const q = query.trim().toLowerCase();
  const list = exercises.filter(
    (e) => (group === 'all' || e.group === group) && (!q || e.name.toLowerCase().includes(q) || e.muscles.toLowerCase().includes(q)),
  );
  // demoTotals covers the whole library; the sample rows shown here are part of it,
  // so changes made in this session are applied as a delta on top.
  const countBy = (rows: Exercise[], demo: DemoStatus) => rows.filter((e) => e.demo === demo).length;
  const live = (demo: DemoStatus) => demoTotals[demo] + countBy(exercises, demo) - countBy(sampleExercises, demo);
  const total = live('ready') + live('production') + live('todo');

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
        <Tabs label="Grupo muscular" value={group} onChange={setGroup} options={[{ value: 'all', label: 'Todos' }, ...groups.map((g) => ({ value: g, label: g }))]} />
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
              const info = demoInfo[e.demo];
              return (
                <tr key={e.id} className={e.id.startsWith('e-') ? s.newRow : undefined}>
                  <td>
                    <span className={p.person} style={{ gap: 14 }}>
                      <span className={s.thumb}>
                        {e.thumb ? <img src={thumb} alt="" className={s.thumbImg} /> : <Icon name="dumbbell" size={20} />}
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
                        ...(e.demo !== 'ready'
                          ? [
                              {
                                label: e.demo === 'todo' ? 'Pedir demonstração 3D' : 'Marcar demonstração como pronta',
                                onSelect: () => {
                                  setDemoStatus(e.id, e.demo === 'todo' ? 'production' : 'ready');
                                  notify(e.demo === 'todo' ? `Demonstração de “${e.name}” pedida à equipa de 3D.` : `A demonstração de “${e.name}” está pronta.`);
                                },
                              },
                            ]
                          : []),
                        { label: 'Editar', onSelect: () => notify('A edição de exercícios chega com a API da biblioteca.') },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 ? <p className={p.empty}>Nenhum exercício encontrado.</p> : null}
      </Card>

      <ConfirmDialog
        open={adding}
        title="Novo exercício"
        body="Fica disponível para os PTs logo a seguir. A demonstração 3D é pedida à parte."
        confirmLabel="Adicionar"
        onClose={() => setAdding(false)}
        onConfirm={() => {
          if (draft.name.trim().length < 3) {
            notify('Dá um nome ao exercício.');
            return;
          }
          addExercise({ name: draft.name.trim(), group: draft.group, muscles: draft.muscles.trim() || draft.group, equipment: draft.equipment.trim() || '—' });
          notify(`“${draft.name.trim()}” adicionado à biblioteca.`);
          setDraft({ name: '', group: 'Peito', muscles: '', equipment: '' });
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
                {g}
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
