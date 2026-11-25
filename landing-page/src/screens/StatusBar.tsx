import battery from '../assets/figma/ios-battery.svg';
import signal from '../assets/figma/ios-signal.svg';
import styles from './StatusBar.module.css';

/** Mobile/Barra de estado iOS — dark, with Dynamic Island. Authored at 390 pt. */
export function StatusBar({ time }: { time: string }) {
  return (
    <div className={styles.bar}>
      <span className={styles.time}>{time}</span>
      <span className={styles.island} />
      <span className={styles.indicators}>
        <img src={signal} alt="" className={styles.signal} />
        <img src={battery} alt="" className={styles.battery} />
      </span>
    </div>
  );
}
