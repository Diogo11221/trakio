import type { ReactNode } from 'react';
import styles from './StoryParts.module.css';

type StepIndexProps = { step: 1 | 2 | 3; label: string };

/** Web/Índice de etapa — index, three ticks and the stage label. */
export function StepIndex({ step, label }: StepIndexProps) {
  return (
    <div className={styles.stepIndex}>
      <span className="mono">{`0${step} / 03`}</span>
      <span className={styles.ticks} aria-hidden="true">
        {[1, 2, 3].map((tick) => (
          <span key={tick} data-active={tick === step} />
        ))}
      </span>
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}

type DetailRowProps = { label: string; value: string; highlight?: boolean };

/** Web/Linha de detalhe — feature line under a stage (label + mono value). */
export function DetailRow({ label, value, highlight = false }: DetailRowProps) {
  return (
    <li className={styles.detailRow}>
      <span>{label}</span>
      <span className={`mono ${highlight ? styles.valueVolt : styles.value}`}>{value}</span>
    </li>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return <ul className={styles.detailList}>{children}</ul>;
}
