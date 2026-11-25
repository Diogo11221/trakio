import benchRender from '../assets/figma/demo-3d-bench.jpg';
import checkDark from '../assets/figma/icon-check-dark.svg';
import chevronLeft from '../assets/figma/icon-chevron-left.svg';
import chevronRight from '../assets/figma/icon-chevron-right.svg';
import { SetRow } from './SetRow';
import { StatusBar } from './StatusBar';
import styles from './TrainScreen.module.css';

export const doneSets = [
  { set: 1, previous: '77,5 × 8', kg: '80,0', reps: '8' },
  { set: 2, previous: '80,0 × 8', kg: '82,5', reps: '8' },
  { set: 3, previous: '80,0 × 7', kg: '82,5', reps: '8' },
] as const;

export const activeSet = { set: 4, previous: '80,0 × 7', kg: '82,5', reps: '8' } as const;

/**
 * App · Treinar A — set in progress. `activeRow` = 'placeholder' when the
 * active set is popped out of the screen by a scroll stage.
 */
export function TrainScreen({ activeRow = 'active' }: { activeRow?: 'active' | 'placeholder' }) {
  return (
    <div className={styles.screen}>
      <div className={styles.demo}>
        <img src={benchRender} alt="Demonstração 3D do supino inclinado" />
        <span className={styles.fadeBottom} />
        <span className={styles.fadeTop} />
      </div>
      <StatusBar time="9:49" />
      <div className={styles.topBar}>
        <span className={styles.back}>
          <img src={chevronLeft} alt="" />
        </span>
        <span className={`mono ${styles.session}`}>32:14</span>
      </div>
      <div className={styles.demoControls}>
        <span className={styles.toggle}>
          <span>Frente</span>
          <span data-active="true">Lado</span>
        </span>
      </div>

      <div className={styles.content}>
        <div className={styles.progress} aria-label="Exercício 2 de 6">
          <span className={styles.segDone} />
          <span className={styles.segCurrent} />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.title}>Supino inclinado</span>
            <span className={styles.count}>2 de 6</span>
          </div>
          <span className={styles.subtitle}>4 séries de 8 a 10 repetições</span>
        </div>
        <div className={styles.sets}>
          <div className={styles.setsHeader}>
            <span style={{ width: 28 }}>Série</span>
            <span style={{ width: 86 }}>Última vez</span>
            <span className={styles.center} style={{ flex: 1 }}>
              Peso
            </span>
            <span className={styles.center} style={{ width: 56 }}>
              Repetições
            </span>
            <span className={`mono ${styles.center}`} style={{ width: 30, fontSize: 10 }}>
              ✓
            </span>
          </div>
          {doneSets.map((row) => (
            <SetRow key={row.set} {...row} state="done" />
          ))}
          <SetRow {...activeSet} state={activeRow} />
        </div>
        <div className={styles.upNext}>
          <span className={`mono ${styles.index}`}>3</span>
          <span className={styles.upNextText}>
            <span>A seguir</span>
            <span>Crucifixo na polia · 3 × 12</span>
          </span>
          <span className={styles.viewWorkout}>
            Ver treino
            <img src={chevronRight} alt="" />
          </span>
        </div>
      </div>

      <div className={styles.bottom}>
        <span className={styles.cta}>
          Concluir série
          <img src={checkDark} alt="" />
        </span>
        <span className={styles.homeIndicator} />
      </div>
    </div>
  );
}
