import checkVolt from '../assets/figma/icon-check-volt.svg';
import styles from './SetRow.module.css';

type SetRowProps = {
  set: number;
  previous: string;
  kg: string;
  reps: string;
  state: 'done' | 'active' | 'placeholder';
  className?: string;
};

/** Treino/Linha de série — Done = logged (volt check), Active = editable inputs. Authored at 390 pt. */
export function SetRow({ set, previous, kg, reps, state, className }: SetRowProps) {
  return (
    <div className={`${styles.row} ${styles[state]} ${className ?? ''}`}>
      <span className={`mono ${styles.set}`}>{set}</span>
      <span className={`mono ${styles.prev}`}>{previous}</span>
      {state === 'done' ? (
        <>
          <span className={`mono ${styles.kg}`}>{kg}</span>
          <span className={`mono ${styles.reps}`}>{reps}</span>
          <span className={styles.check}>
            <img src={checkVolt} alt="Feita" />
          </span>
        </>
      ) : (
        <>
          <span className={`mono ${styles.kg} ${styles.input}`}>{kg}</span>
          <span className={`mono ${styles.reps} ${styles.input}`}>{reps}</span>
          <span className={`${styles.check} ${styles.checkEmpty}`} />
        </>
      )}
    </div>
  );
}
