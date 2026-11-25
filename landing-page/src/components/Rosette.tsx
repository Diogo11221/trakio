import { useMemo, type Ref } from 'react';

type Band = { radius: number; amplitude: number; lobes: number; curves: number; wobble: number };

const bands: readonly Band[] = [
  { radius: 310, amplitude: 22, lobes: 24, curves: 36, wobble: 0 },
  { radius: 235, amplitude: 16, lobes: 16, curves: 28, wobble: 0 },
  { radius: 170, amplitude: 10, lobes: 12, curves: 20, wobble: 0 },
];

/** One closed polar wave r(θ) = R + A·sin(nθ + φ) + w·sin(5θ). */
function wavePath(band: Band, phase: number): string {
  const steps = 720;
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r = band.radius + band.amplitude * Math.sin(band.lobes * t + phase) + band.wobble * Math.sin(5 * t);
    d += `${i === 0 ? 'M' : 'L'}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return `${d}Z`;
}

/**
 * Guilloché rosette — interlaced polar waves, like the engraving on a plate
 * or a certificate. Purely decorative; the parent rotates it on scroll.
 */
export function Rosette({ className, ref }: { className?: string; ref?: Ref<SVGSVGElement> }) {
  const paths = useMemo(
    () =>
      bands.flatMap((band) =>
        Array.from({ length: band.curves }, (_, k) => wavePath(band, (k / band.curves) * Math.PI * 2)),
      ),
    [],
  );
  return (
    <svg ref={ref} className={className} viewBox="-360 -360 720 720" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.6">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
