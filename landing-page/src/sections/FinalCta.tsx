import { useRef, type CSSProperties } from 'react';
import iconAndroid from '../assets/figma/icon-android.svg';
import iconApple from '../assets/figma/icon-apple.svg';
import logoLarge from '../assets/figma/logo-ring-large.svg';
import { Texture } from '../components/Texture';
import { useRevealChildren } from '../hooks/useInView';
import { useScrollProgress } from '../hooks/useScrollProgress';
import styles from './FinalCta.module.css';

/** CTA final */
export function FinalCta() {
  const section = useRef<HTMLElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  useRevealChildren(section);

  // The ring logo turns in 3D as it scrolls past, like a plate on a bar.
  useScrollProgress(section, (progress) => {
    if (logo.current) {
      logo.current.style.transform = `rotateY(${((progress - 0.5) * 220).toFixed(2)}deg) rotateZ(${((progress - 0.5) * -40).toFixed(2)}deg)`;
    }
  });

  return (
    <section ref={section} id="comecar" className={styles.section} aria-labelledby="cta-title">
      <Texture variant="ripple" />
      <div className={styles.logoStage} data-reveal>
        <img ref={logo} src={logoLarge} alt="" width={56} height={56} />
      </div>
      <h2 id="cta-title" className={styles.title} data-reveal style={{ '--reveal-delay': '0.06s' } as CSSProperties}>
        A próxima série começa aqui.
      </h2>
      <p className={styles.lead} data-reveal style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
        Grátis para começar. Sem cartão.
      </p>
      <div className={styles.actions} data-reveal style={{ '--reveal-delay': '0.18s' } as CSSProperties}>
        <a className={styles.volt} href="#registo">
          Começar grátis
        </a>
        <a className={styles.store} href="#app-store">
          <img src={iconApple} alt="" width={18} height={18} />
          Descarregar para iPhone
        </a>
        <a className={styles.store} href="#google-play">
          <img src={iconAndroid} alt="" width={18} height={18} />
          Descarregar para Android
        </a>
      </div>
    </section>
  );
}
