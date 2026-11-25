import { useEffect, useRef } from 'react';
import { subscribeScroll } from '../hooks/scrollBus';
import styles from './Backdrop.module.css';

/** Grid period (px) of the registration marks; the line grid (80px) divides it. */
const PERIOD = 320;
const PARALLAX = 0.35;

/**
 * Page-wide drafting grid behind every dark section: hairlines every 80px
 * with "+" registration marks every 320px. It drifts at a slower rate than
 * the content (parallax), so the page has depth without any glow.
 */
export function Backdrop() {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeScroll((y) => {
        if (grid.current) {
          const offset = -((y * PARALLAX) % PERIOD);
          grid.current.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
        }
      }),
    [],
  );

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div ref={grid} className={styles.grid} />
    </div>
  );
}
