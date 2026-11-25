import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import { ArrowLink, PrimaryButton } from '../components/Buttons';
import { AppViewport, Phone } from '../components/Phone';
import { subscribeScroll } from '../hooks/scrollBus';
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { TrainScreen } from '../screens/TrainScreen';
import styles from './Hero.module.css';

const HeroScene = lazy(() => import('../three/HeroScene'));

/** Landing · 00 Hero — phone cropped at the fold, tilted back in 3D. */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const reducedMotion = usePrefersReducedMotion();
  // The plates sit at the edges of a wide hero; on small screens they would be cropped away, so skip the 3D bundle.
  const wideScreen = useMediaQuery('(min-width: 900px)');

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    if (!reducedMotion) window.addEventListener('pointermove', onMove, { passive: true });

    // Scroll: the phone stands up (24° → 0°) and rises while the copy drifts away.
    let current = { tiltX: 24, tiltY: 0 };
    let progress = 0;
    let frame = 0;
    const render = () => {
      const target = {
        tiltX: 24 * (1 - progress) - pointer.current.y * 3,
        tiltY: pointer.current.x * 6,
      };
      current = {
        tiltX: current.tiltX + (target.tiltX - current.tiltX) * 0.12,
        tiltY: current.tiltY + (target.tiltY - current.tiltY) * 0.12,
      };
      if (phone.current) {
        phone.current.style.transform = `translate3d(0, ${-progress * 140}px, 0) rotateX(${current.tiltX.toFixed(3)}deg) rotateY(${current.tiltY.toFixed(3)}deg)`;
      }
      if (copy.current) {
        copy.current.style.transform = `translate3d(0, ${progress * -60}px, 0)`;
        copy.current.style.opacity = String(1 - progress * 1.1);
      }
      frame = requestAnimationFrame(render);
    };
    const unsubscribe = subscribeScroll((y, h) => {
      progress = Math.min(1, Math.max(0, y / (h * 0.85)));
    });
    if (!reducedMotion) frame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [reducedMotion]);

  return (
    <section ref={section} id="topo" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        {wideScreen && (
          <Suspense fallback={null}>
            <HeroScene animate={!reducedMotion} />
          </Suspense>
        )}
      </div>

      <div className={styles.frame}>
        <div ref={copy} className={styles.copy}>
          <p className={styles.eyebrow} style={{ '--i': 0 } as CSSProperties}>
            <span className="mono">01</span>
            <span className={styles.rule} />
            <span>Treino · Nutrição · Personal trainers</span>
          </p>
          <h1 id="hero-title" className={styles.title} style={{ '--i': 1 } as CSSProperties}>
            <span className={styles.line}>
              82,5 kg × 8. <span className={styles.muted}>A próxima série</span>
            </span>
            <span className={`${styles.line} ${styles.muted}`}>já sabe o que fizeste.</span>
          </h1>
          <p className={styles.lead} style={{ '--i': 2 } as CSSProperties}>
            Planos, cargas, descanso e nutrição num só sítio — a treinar sozinho ou com o teu PT a acompanhar cada
            série.
          </p>
          <div className={styles.ctas} style={{ '--i': 3 } as CSSProperties}>
            <PrimaryButton href="#comecar" size="large">
              Começar grátis
            </PrimaryButton>
            <ArrowLink href="#para-pts">Sou Personal Trainer</ArrowLink>
          </div>
          <p className={styles.note} style={{ '--i': 4 } as CSSProperties}>
            iOS, Android e web · liga ao Apple Health e Health Connect
          </p>
        </div>

        <div className={styles.phoneStage}>
          <div className={styles.phoneEntrance}>
            <Phone ref={phone} className={styles.phone} label="App Trakio no ecrã de treino: supino inclinado, série 4 de 4">
              <AppViewport>
                <TrainScreen />
              </AppViewport>
            </Phone>
          </div>
        </div>

        <div className={styles.scrollCue} aria-hidden="true">
          <span className={styles.mouse}>
            <span />
          </span>
          Desliza para ver como funciona
        </div>
        <div className={styles.storyIndex} aria-hidden="true">
          <span className={styles.ticks}>
            <span data-active="true" />
            <span />
            <span />
          </span>
          Treinar · Nutrição · Evolução
        </div>
      </div>
    </section>
  );
}
