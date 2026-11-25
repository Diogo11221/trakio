import type { CSSProperties, ReactNode, Ref } from 'react';
import styles from './Phone.module.css';

type PhoneProps = {
  children: ReactNode;
  /** Extra layers rendered on top of the screen (e.g. the dim overlay of a scroll stage). */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
  label: string;
};

/** Thickness of the phone body, in px, built from stacked slices behind the front. */
const DEPTH = 28;
const SLICES = 20;
const slices = Array.from({ length: SLICES }, (_, i) => i + 1);

/**
 * iPhone in brushed titanium (360 × 740), with real thickness: rounded slices
 * stacked behind the front form the side band and the back, so the phone
 * reads as a solid object when it turns. The screen is 330 × 710; app
 * screens are authored at 390 pt wide and rendered through <AppViewport>.
 */
export function Phone({ children, overlay, className, style, ref, label }: PhoneProps) {
  return (
    <div ref={ref} className={`${styles.phone} ${className ?? ''}`} style={style} role="img" aria-label={label}>
      <span className={styles.body} aria-hidden="true">
        {slices.map((i) => (
          <span
            key={i}
            className={i === SLICES ? styles.back : styles.slice}
            style={{ transform: `translateZ(${(-(i * DEPTH) / SLICES).toFixed(2)}px)` }}
          />
        ))}
      </span>
      <span className={`${styles.button} ${styles.action}`} />
      <span className={`${styles.button} ${styles.volUp}`} />
      <span className={`${styles.button} ${styles.volDown}`} />
      <span className={`${styles.button} ${styles.power}`} />
      <div className={styles.frame}>
        <div className={styles.bezel}>
          <div className={styles.screen}>
            {children}
            {overlay}
            <span className={styles.glare} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders an app screen authored at 390 × 844 inside the 330-wide phone screen (scale 0.846). */
export function AppViewport({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.viewport} ${className ?? ''}`}>{children}</div>;
}
