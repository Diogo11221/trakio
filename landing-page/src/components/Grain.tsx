import styles from './Grain.module.css';

/** Film-grain texture over the whole page (pure CSS/SVG noise, no image request). */
export function Grain() {
  return <div className={styles.grain} aria-hidden="true" />;
}
