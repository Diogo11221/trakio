import sparkBench from '../assets/figma/sparkline-bench.svg';
import sparkDeadlift from '../assets/figma/sparkline-deadlift.svg';
import sparkPress from '../assets/figma/sparkline-press.svg';
import sparkSquat from '../assets/figma/sparkline-squat.svg';
import styles from './MaxLoadList.module.css';

type Lift = {
  name: string;
  value: string;
  sparkline: string;
  delta?: string;
  stalled?: string;
};

const lifts: readonly Lift[] = [
  { name: 'Supino inclinado', delta: '↑ 10,9%', value: '102,0', sparkline: sparkBench },
  { name: 'Agachamento', delta: '↑ 4,2%', value: '140,0', sparkline: sparkSquat },
  { name: 'Peso morto', stalled: 'Estagnado · 3 sem', value: '165,0', sparkline: sparkDeadlift },
  { name: 'Press militar', delta: '↑ 2,1%', value: '58,0', sparkline: sparkPress },
];

/** Carga máxima estimada — one row per lift with an 8-week sparkline. Authored at 390 pt. */
export function MaxLoadList() {
  return (
    <>
      {lifts.map((lift) => (
        <div key={lift.name} className={styles.row}>
          <span className={styles.name}>
            <span>{lift.name}</span>
            {lift.delta ? (
              <span className={`mono ${styles.delta}`}>{lift.delta}</span>
            ) : (
              <span className={styles.stalled}>{lift.stalled}</span>
            )}
          </span>
          <img src={lift.sparkline} alt="" className={styles.sparkline} />
          <span className={styles.value}>
            <span className="mono">{lift.value}</span>
            <span className="mono">kg</span>
          </span>
        </div>
      ))}
    </>
  );
}
