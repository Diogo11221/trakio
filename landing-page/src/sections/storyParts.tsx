import { DetailList, DetailRow, StepIndex } from '../components/StoryParts';
import type { StoryStage } from './storyStages';
import styles from './ScrollStory.module.css';

export const LIFT_Z = 120;

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const smooth = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Visibility (0–1) of stage `i` at story position `s` (0–count). */
export function stageVisibility(i: number, s: number, count: number): number {
  const appear = i === 0 ? 1 : smooth((s - i + 0.1) / 0.2);
  const disappear = i === count - 1 ? 1 : 1 - smooth((s - (i + 1) + 0.1) / 0.2);
  return appear * disappear;
}

/** How far the highlight has popped out (0 = flush with the screen, 1 = lifted). */
export function stageLift(i: number, s: number, count: number): number {
  const rise = smooth((s - i - 0.08) / 0.32);
  const fall = i === count - 1 ? 1 : 1 - smooth((s - (i + 1) + 0.28) / 0.18);
  return rise * fall;
}

export function StageCopy({ stage }: { stage: StoryStage }) {
  return (
    <>
      <StepIndex step={stage.step} label={stage.label} />
      <h2 className={styles.title}>
        <span>{stage.title[0]}</span>
        <span>{stage.title[1]}</span>
      </h2>
      <p className={styles.lead}>{stage.lead}</p>
      <DetailList>
        {stage.details.map((detail) => (
          <DetailRow key={detail.label} {...detail} />
        ))}
      </DetailList>
    </>
  );
}

const variantClass = {
  row: styles.highlightRow,
  card: styles.highlightCard,
  list: `${styles.highlightCard} ${styles.highlightList}`,
} as const;

/** The element that pops out of the phone screen, positioned in rig coordinates. */
export function Highlight({ stage, innerRef }: { stage: StoryStage; innerRef?: (el: HTMLDivElement | null) => void }) {
  const { highlight } = stage;
  return (
    <div
      ref={innerRef}
      className={`${styles.highlight} ${variantClass[highlight.variant]}`}
      style={{ left: highlight.left, top: highlight.top }}
    >
      <div className={styles.highlightBody}>
        {highlight.node}
        {highlight.variant !== 'row' && <span className={styles.accent} />}
      </div>
    </div>
  );
}
