import { useEffect, useRef } from 'react';
import { AppViewport, Phone } from '../components/Phone';
import { subscribeScroll } from '../hooks/scrollBus';
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { HeroCopy, MobileHero } from './Hero';
import { StackedStory } from './ScrollStory';
import { clamp01, Highlight, LIFT_Z, mix, smooth, StageCopy, stageLift, stageVisibility } from './storyParts';
import { storyStages } from './storyStages';
import styles from './Showcase.module.css';

/* Scroll lengths, in viewport heights. */
const INTRO = 1; // hero → story hand-off
const STAGE = 0.9; // each of the three stages
const COUNT = storyStages.length;
const SECTION_VH = 1 + INTRO + COUNT * STAGE;

/* Rig geometry (Figma "3D Rig · phone + highlight"): 461 × 780, phone at (81, 20), 360 × 740. */
const RIG_W = 461;
const RIG_H = 780;
const PHONE_X = 81;
const PHONE_Y = 20;
const PHONE_W = 360;
/** Vertical room the tilted rig and its pop-outs need, so nothing is clipped. */
const RIG_ROOM = 880;

type Layout = {
  vw: number;
  vh: number;
  heroCx: number;
  heroCy: number;
  storyCx: number;
  storyCy: number;
  storyScale: number;
};

/**
 * Desktop: hero and "how it works" share one pinned stage and ONE phone.
 * The phone starts cropped under the hero copy, tilted back; scrolling carries
 * it to the right-hand rig, where the copy and screen change per stage and
 * each highlight pops out in 3D.
 */
function PinnedShowcase() {
  const section = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const heroCopy = useRef<HTMLDivElement>(null);
  const heroChrome = useRef<HTMLDivElement>(null);
  const heroBg = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLSpanElement>(null);
  const copies = useRef<Array<HTMLDivElement | null>>([]);
  const screens = useRef<Array<HTMLDivElement | null>>([]);
  const highlights = useRef<Array<HTMLDivElement | null>>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let layout: Layout | null = null;
    let intro = 0; // 0 → 1 across the hand-off
    let s = 0; // 0 → COUNT across the stages
    let pointer = { x: 0, y: 0 };
    let smoothPointer = { x: 0, y: 0 };
    let frame = 0;
    let visible = true;
    let lastTransform = '';
    let lastOrigin = '';
    let measuredFor = '';

    const measure = (): Layout | null => {
      const stickyEl = sticky.current;
      const slotEl = slot.current;
      const copyEl = heroCopy.current;
      if (!stickyEl || !slotEl || !copyEl) return null;
      const vw = stickyEl.clientWidth;
      const vh = stickyEl.clientHeight;
      const navH = 72;
      const storyScale = Math.min(1, (vh - navH - 24) / RIG_ROOM);
      slotEl.style.setProperty('--rig-scale', storyScale.toFixed(4));
      const stickyRect = stickyEl.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      // Phone sits just below the hero copy (offsets ignore the copy's own transforms).
      const phoneTop = copyEl.offsetTop + copyEl.offsetHeight + 44;
      const storyCx = slotRect.left - stickyRect.left + slotRect.width / 2;
      const storyCy = navH + (vh - navH) / 2;
      return {
        vw,
        vh,
        heroCx: vw / 2 - (PHONE_X + PHONE_W / 2 - RIG_W / 2),
        heroCy: phoneTop - PHONE_Y + RIG_H / 2,
        storyCx,
        storyCy,
        storyScale,
      };
    };

    const onMove = (event: PointerEvent) => {
      pointer = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    if (!reducedMotion) window.addEventListener('pointermove', onMove, { passive: true });

    const applyScroll = () => {
      // Hero layer leaves like a normal scroll, slightly slower, and fades.
      if (heroLayer.current && layout) {
        heroLayer.current.style.transform = `translate3d(0, ${(-intro * layout.vh * 0.6).toFixed(1)}px, 0)`;
        heroLayer.current.style.opacity = (1 - smooth(intro / 0.55)).toFixed(3);
      }
      if (heroChrome.current) heroChrome.current.style.opacity = (1 - smooth(intro / 0.2)).toFixed(3);
      if (heroBg.current) heroBg.current.style.opacity = (1 - intro).toFixed(3);

      const copyIn = smooth((intro - 0.55) / 0.45);
      let dimAmount = 0;
      storyStages.forEach((_, i) => {
        const vis = stageVisibility(i, s, COUNT);
        const lift = stageLift(i, s, COUNT);
        dimAmount += vis * lift;

        const copy = copies.current[i];
        if (copy) {
          const shown = i === 0 ? vis * copyIn : vis;
          copy.style.opacity = shown.toFixed(3);
          copy.style.transform = `translate3d(0, ${((1 - shown) * (s > i ? -32 : 32)).toFixed(1)}px, 0)`;
          copy.style.visibility = shown < 0.01 ? 'hidden' : 'visible';
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
      const storyIn = smooth((intro - 0.7) / 0.3);
      if (rail.current) rail.current.style.opacity = storyIn.toFixed(3);

      if (railFill.current) railFill.current.style.transform = `scaleY(${(s / COUNT).toFixed(4)})`;
    };

    const renderRig = (now: number) => {
      smoothPointer = {
        x: smoothPointer.x + (pointer.x - smoothPointer.x) * 0.08,
        y: smoothPointer.y + (pointer.y - smoothPointer.y) * 0.08,
      };
      if (layout && rig.current && world.current) {
        const e = smooth(intro);
        const cx = mix(layout.heroCx, layout.storyCx, e);
        const cy = mix(layout.heroCy, layout.storyCy, e);
        const scale = mix(1, layout.storyScale, e);
        const px = smoothPointer.x;
        const py = smoothPointer.y;
        // Idle float in the hero: a slow bob and sway (incommensurate periods so it
        // never looks like a loop). Fades out as the phone travels into the story.
        const t = reducedMotion ? 0 : now / 1000;
        const idle = 1 - e * 0.8;
        const bob = Math.sin(t * 0.9) * 7 * idle;
        const swayY = (Math.sin(t * 0.55) * 4 + Math.sin(t * 0.23) * 2) * idle;
        const swayX = Math.sin(t * 0.7 + 1.3) * 1.6 * idle;
        const swayZ = Math.sin(t * 0.43 + 0.6) * 1.2 * idle;
        const rx = mix(24, 8, e) - py * mix(3, 2.5, e) + swayX;
        const ry = mix(0, -34 + (s / COUNT) * 12, e) + px * mix(6, 4, e) + swayY;
        const rz = mix(0, 7, e) + swayZ;
        const transform =
          `translate3d(${(cx - RIG_W / 2).toFixed(1)}px, ${(cy - RIG_H / 2 + bob).toFixed(1)}px, 0) ` +
          `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        const origin = `${mix(layout.vw / 2, cx, e).toFixed(0)}px ${mix(layout.vh * 0.45, cy, e).toFixed(0)}px`;
        // Only touch the DOM when something actually moved.
        if (transform !== lastTransform) {
          rig.current.style.transform = transform;
          lastTransform = transform;
        }
        if (origin !== lastOrigin) {
          world.current.style.perspectiveOrigin = origin;
          lastOrigin = origin;
        }
      }
      frame = visible ? requestAnimationFrame(renderRig) : 0;
    };

    // Stop the loop entirely once the showcase is off screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) frame = requestAnimationFrame(renderRig);
    });
    if (section.current) observer.observe(section.current);

    const unsubscribe = subscribeScroll((_, viewportH) => {
      const element = section.current;
      if (!element) return;
      // Measuring forces a layout; only do it when the viewport size changes.
      const size = `${window.innerWidth}x${viewportH}`;
      if (size !== measuredFor || !layout) {
        layout = measure();
        measuredFor = size;
      }
      const u = -element.getBoundingClientRect().top / viewportH;
      intro = clamp01(u / INTRO);
      s = clamp01((u - INTRO) / (COUNT * STAGE)) * COUNT;
      applyScroll();
    });
    // Fonts change the hero copy height; re-measure once they are ready.
    document.fonts?.ready.then(() => {
      layout = measure();
    });
    frame = requestAnimationFrame(renderRig);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      unsubscribe();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={section}
      id="topo"
      className={styles.showcase}
      style={{ height: `${SECTION_VH * 100}vh` }}
      aria-labelledby="hero-title"
    >
      {storyStages.map((stage, i) => (
        <span
          key={stage.id}
          id={stage.id}
          className={styles.anchor}
          style={{ top: `${(1 + INTRO + (i + 0.35) * STAGE) * 100 - 100}vh` }}
        />
      ))}

      <div ref={sticky} className={styles.sticky}>
        <div ref={heroBg} className={styles.heroBg} aria-hidden="true" />

        <div ref={heroLayer} className={styles.heroLayer}>
          <HeroCopy ref={heroCopy} />
        </div>
        <div ref={heroChrome} className={styles.heroChrome} aria-hidden="true">
          <div className={styles.heroChromeInner}>
          <div className={styles.scrollCue}>
            <span className={styles.mouse}>
              <span />
            </span>
            Desliza para ver como funciona
          </div>
          <div className={styles.storyIndex}>
            <span className={styles.ticks}>
              <span data-active="true" />
              <span />
              <span />
            </span>
            Treinar · Nutrição · Evolução
          </div>
          </div>
        </div>

        <div className={styles.frame}>
          <div className={styles.copyStack}>
            {storyStages.map((stage, i) => (
              <div
                key={stage.id}
                ref={(el) => {
                  copies.current[i] = el;
                }}
                className={styles.copy}
              >
                <StageCopy stage={stage} />
              </div>
            ))}
          </div>
          <div className={styles.stage}>
            {/* Empty box marking where the rig lands; measured, never painted. */}
            <div ref={slot} className={styles.slot} />
          </div>
          <div ref={rail} className={styles.rail} aria-hidden="true">
            <span ref={railFill} />
          </div>
        </div>

        <div className={styles.world}>
          {/* Perspective sits on the rig's direct parent: an animated element in between would flatten the 3D. */}
          <div ref={world} className={styles.entrance}>
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
      </div>
    </section>
  );
}

export function Showcase() {
  const narrow = useMediaQuery('(max-width: 960px)');
  return narrow ? (
    <>
      <MobileHero />
      <StackedStory />
    </>
  ) : (
    <PinnedShowcase />
  );
}
