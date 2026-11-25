import { useEffect, useRef, type CSSProperties } from 'react';
import { AppViewport, Phone } from '../components/Phone';
import { DetailList, DetailRow, StepIndex } from '../components/StoryParts';
import { subscribeScroll } from '../hooks/scrollBus';
import { useRevealChildren } from '../hooks/useInView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { storyStages, type StoryStage } from './storyStages';
import styles from './ScrollStory.module.css';

const RIG_HEIGHT = 780;
const LIFT_Z = 120;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Visibility (0–1) of stage `i` at story position `s` (0–3). */
function stageVisibility(i: number, s: number, count: number): number {
  const appear = i === 0 ? 1 : smooth((s - i + 0.1) / 0.2);
  const disappear = i === count - 1 ? 1 : 1 - smooth((s - (i + 1) + 0.1) / 0.2);
  return appear * disappear;
}

/** How far the highlight has popped out (0 = flush with the screen, 1 = lifted). */
function stageLift(i: number, s: number, count: number): number {
  const rise = smooth((s - i - 0.08) / 0.32);
  const fall = i === count - 1 ? 1 : 1 - smooth((s - (i + 1) + 0.28) / 0.18);
  return rise * fall;
}

function StageCopy({ stage }: { stage: StoryStage }) {
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

function Highlight({ stage, innerRef }: { stage: StoryStage; innerRef?: (el: HTMLDivElement | null) => void }) {
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

/** Desktop: one pinned phone; the copy and screen change with scroll and each highlight pops out in 3D. */
function PinnedStory() {
  const section = useRef<HTMLElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const scaler = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const copies = useRef<Array<HTMLDivElement | null>>([]);
  const screens = useRef<Array<HTMLDivElement | null>>([]);
  const highlights = useRef<Array<HTMLDivElement | null>>([]);
  const progressBar = useRef<HTMLSpanElement>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const count = storyStages.length;
    let s = 0;
    let tilt = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const apply = () => {
      let dimAmount = 0;
      storyStages.forEach((_, i) => {
        const vis = stageVisibility(i, s, count);
        const lift = stageLift(i, s, count);
        dimAmount += vis * lift;

        const copy = copies.current[i];
        if (copy) {
          copy.style.opacity = vis.toFixed(3);
          copy.style.transform = `translate3d(0, ${((1 - vis) * (s > i ? -32 : 32)).toFixed(1)}px, 0)`;
          copy.style.visibility = vis < 0.01 ? 'hidden' : 'visible';
        }
        const screen = screens.current[i];
        if (screen) screen.style.opacity = vis.toFixed(3);
        const highlight = highlights.current[i];
        if (highlight) {
          highlight.style.opacity = vis.toFixed(3);
          highlight.style.setProperty('--lift', lift.toFixed(3));
          highlight.style.transform = `translateZ(${(lift * LIFT_Z).toFixed(1)}px)`;
        }
      });
      if (dim.current) dim.current.style.opacity = (dimAmount * 0.66).toFixed(3);
      if (progressBar.current) progressBar.current.style.transform = `scaleY(${(s / count).toFixed(4)})`;
    };

    const animateTilt = () => {
      const target = {
        x: 8 - pointer.current.y * 2.5,
        y: -34 + (s / count) * 12 + pointer.current.x * 4,
      };
      tilt = { x: tilt.x + (target.x - tilt.x) * 0.08, y: tilt.y + (target.y - tilt.y) * 0.08 };
      if (rig.current) {
        rig.current.style.transform = `rotateX(${tilt.x.toFixed(3)}deg) rotateY(${tilt.y.toFixed(3)}deg) rotateZ(7deg)`;
      }
      frame = requestAnimationFrame(animateTilt);
    };
    tilt = { x: 8, y: -34 };
    frame = requestAnimationFrame(animateTilt);

    const unsubscribe = subscribeScroll((_, viewportH) => {
      const element = section.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const distance = rect.height - viewportH;
      s = clamp01(-rect.top / distance) * count;
      if (scaler.current) {
        const scale = Math.min(1, (viewportH - 96) / RIG_HEIGHT);
        scaler.current.style.setProperty('--rig-scale', scale.toFixed(4));
      }
      apply();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      unsubscribe();
    };
  }, []);

  return (
    <section ref={section} className={styles.pinned} aria-label="Como funciona">
      {storyStages.map((stage, i) => (
        <span key={stage.id} id={stage.id} className={styles.anchor} style={{ top: `${(i / storyStages.length) * 100}%` }} />
      ))}
      <div className={styles.sticky}>
        <div className={styles.frame}>
          <div className={styles.copyStack}>
            {storyStages.map((stage, i) => (
              <div
                key={stage.id}
                ref={(el) => {
                  copies.current[i] = el;
                }}
                className={styles.copy}
                aria-hidden={false}
              >
                <StageCopy stage={stage} />
              </div>
            ))}
          </div>

          <div className={styles.stage}>
            <div ref={scaler} className={styles.scaler}>
              <div ref={rig} className={styles.rig}>
                <Phone
                  className={styles.phone}
                  label="Telemóvel com a app Trakio"
                  overlay={<div ref={dim} className={styles.dim} />}
                >
                  {storyStages.map((stage, i) => (
                    <div
                      key={stage.id}
                      ref={(el) => {
                        screens.current[i] = el;
                      }}
                      className={styles.screenLayer}
                      role="img"
                      aria-label={stage.phoneLabel}
                    >
                      <AppViewport>{stage.screen}</AppViewport>
                    </div>
                  ))}
                </Phone>
                {storyStages.map((stage, i) => (
                  <Highlight
                    key={stage.id}
                    stage={stage}
                    innerRef={(el) => {
                      highlights.current[i] = el;
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.rail} aria-hidden="true">
            <span ref={progressBar} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Narrow screens: the three stages stacked, each with its own phone and the highlight already lifted. */
function StackedStory() {
  const root = useRef<HTMLElement>(null);
  useRevealChildren(root);
  return (
    <section ref={root} className={styles.stacked} aria-label="Como funciona">
      {storyStages.map((stage) => (
        <article key={stage.id} id={stage.id} className={styles.stackedStage}>
          <div className={styles.copy} data-reveal>
            <StageCopy stage={stage} />
          </div>
          <div className={styles.stackedFigure} data-reveal>
            <div className={styles.rig} style={{ transform: 'rotateX(8deg) rotateY(-24deg) rotateZ(7deg)' }}>
              <Phone className={styles.phone} label={stage.phoneLabel} overlay={<div className={styles.dim} style={{ opacity: 0.66 }} />}>
                <AppViewport>{stage.screen}</AppViewport>
              </Phone>
              <div style={{ '--lift': 1 } as CSSProperties}>
                <HighlightLifted stage={stage} />
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function HighlightLifted({ stage }: { stage: StoryStage }) {
  return (
    <div style={{ transform: `translateZ(${LIFT_Z}px)`, transformStyle: 'preserve-3d', position: 'absolute', inset: 0 }}>
      <Highlight stage={stage} />
    </div>
  );
}

export function ScrollStory() {
  const narrow = useMediaQuery('(max-width: 960px)');
  return narrow ? <StackedStory /> : <PinnedStory />;
}
