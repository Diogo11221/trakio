import styles from './Backdrop.module.css';

/**
 * One continuous background behind the whole page: large, very soft pools of
 * graphite and steel light (and a trace of Volt) drifting slowly, like light
 * moving across brushed metal. Dark sections are transparent so it flows
 * from one to the next. Pure CSS transforms, so it stays on the compositor.
 */
export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <span className={`${styles.pool} ${styles.steel}`} />
      <span className={`${styles.pool} ${styles.graphite}`} />
      <span className={`${styles.pool} ${styles.volt}`} />
      <span className={`${styles.pool} ${styles.cool}`} />
      <span className={styles.vignette} />
    </div>
  );
}
