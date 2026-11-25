import { useRef, type CSSProperties } from 'react';
import { AppViewport, Phone } from '../components/Phone';
import { useRevealChildren } from '../hooks/useInView';
import { Highlight, LIFT_Z, StageCopy } from './storyParts';
import { storyStages } from './storyStages';
import styles from './ScrollStory.module.css';

/** Narrow screens: the three stages stacked, each with its own phone and the highlight already lifted. */
export function StackedStory() {
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
              <Phone
                className={styles.phone}
                label={stage.phoneLabel}
                overlay={<div className={styles.dim} style={{ opacity: 0.66 }} />}
              >
                <AppViewport>{stage.screen}</AppViewport>
              </Phone>
              <div
                style={
                  {
                    '--lift': 1,
                    position: 'absolute',
                    inset: 0,
                    transform: `translateZ(${LIFT_Z}px)`,
                    transformStyle: 'preserve-3d',
                  } as CSSProperties
                }
              >
                <Highlight stage={stage} />
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
