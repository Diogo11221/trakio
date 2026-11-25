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

/* Body geometry (px): the front outline, its corner radius and the thickness. */
const W = 360;
const H = 740;
const R = 62;
const DEPTH = 28;
const CORNER_STEPS = 6;

type Edge = { x: number; y: number; length: number; angle: number; shade: string };

/**
 * The side band as real geometry: one thin strip per straight side and per
 * corner segment, each turned 90° to run from the front (z = 0) to the back
 * (z = −DEPTH). Each strip is shaded by how much it faces a light at the top
 * left, which is what makes the rim read as brushed metal. ~30 small elements
 * instead of stacking full-size layers keeps the 3D cheap to composite.
 */
function buildEdges(): Edge[] {
  const points: Array<[number, number]> = [];
  const arc = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= CORNER_STEPS; i += 1) {
      const a = ((from + (i / CORNER_STEPS) * 90) * Math.PI) / 180;
      points.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
  };
  // Clockwise on screen (y down), starting at the top-left corner.
  arc(R, R, 180);
  arc(W - R, R, 270);
  arc(W - R, H - R, 0);
  arc(R, H - R, 90);
  points.push(points[0] as [number, number]);

  const light = { x: -0.6, y: -0.8 };
  const edges: Edge[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i] as [number, number];
    const [x2, y2] = points[i + 1] as [number, number];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.5) continue;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // Outward normal of a clockwise outline.
    const nx = Math.sin(angle);
    const ny = -Math.cos(angle);
    const lit = Math.max(0, nx * light.x + ny * light.y);
    const tone = Math.round(26 + lit * 62);
    edges.push({ x: x1, y: y1, length: length + 0.8, angle, shade: `rgb(${tone}, ${tone + 2}, ${tone + 7})` });
  }
  return edges;
}

const edges = buildEdges();

/**
 * iPhone in brushed titanium (360 × 740), with real thickness: a shaded side
 * band and a glass back, so the phone reads as a solid object when it turns. The screen is 330 × 710; app
 * screens are authored at 390 pt wide and rendered through <AppViewport>.
 */
export function Phone({ children, overlay, className, style, ref, label }: PhoneProps) {
  return (
    <div ref={ref} className={`${styles.phone} ${className ?? ''}`} style={style} role="img" aria-label={label}>
      <span className={styles.body} aria-hidden="true">
        <span className={styles.back} style={{ transform: `translateZ(${-DEPTH}px)` }} />
        {edges.map((edge, i) => (
          <span
            key={i}
            className={styles.edge}
            style={
              {
                width: edge.length,
                height: DEPTH,
                '--shade': edge.shade,
                transform: `translate3d(${edge.x.toFixed(2)}px, ${edge.y.toFixed(2)}px, 0) rotateZ(${edge.angle.toFixed(4)}rad) rotateX(-90deg)`,
              } as CSSProperties
            }
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
