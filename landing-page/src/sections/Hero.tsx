import type { CSSProperties, Ref } from 'react';
import { ArrowLink, PrimaryButton } from '../components/Buttons';
import { AppViewport, Phone } from '../components/Phone';
import { TrainScreen } from '../screens/TrainScreen';
import styles from './Hero.module.css';

const delay = (i: number) => ({ '--i': i }) as CSSProperties;

/** Hero copy — shared by the desktop showcase and the mobile hero. */
export function HeroCopy({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={styles.copy}>
      <p className={styles.eyebrow} style={delay(0)}>
        <span className="mono">01</span>
        <span className={styles.rule} />
        <span>Treino · Nutrição · Personal trainers</span>
      </p>
      <h1 id="hero-title" className={styles.title} style={delay(1)}>
        <span className={styles.line}>
          82,5 kg × 8. <span className={styles.muted}>A próxima série</span>
        </span>
        <span className={`${styles.line} ${styles.muted}`}>já sabe o que fizeste.</span>
      </h1>
      <p className={styles.lead} style={delay(2)}>
        Planos, cargas, descanso e nutrição num só sítio — a treinar sozinho ou com o teu PT a acompanhar cada série.
      </p>
      <div className={styles.ctas} style={delay(3)}>
        <PrimaryButton href="#comecar" size="large">
          Começar grátis
        </PrimaryButton>
        <ArrowLink href="#para-pts">Sou Personal Trainer</ArrowLink>
      </div>
      <p className={styles.note} style={delay(4)}>
        iOS, Android e web · liga ao Apple Health e Health Connect
      </p>
    </div>
  );
}

/** Mobile hero: copy, then the phone in normal flow, cropped by the section. */
export function MobileHero() {
  return (
    <section id="topo" className={styles.mobileHero} aria-labelledby="hero-title">
      <HeroCopy />
      <div className={styles.mobilePhone}>
        <div className={styles.phoneEntrance}>
          <Phone className={styles.mobilePhoneTilt} label="App Trakio no ecrã de treino: supino inclinado, série 4 de 4">
            <AppViewport>
              <TrainScreen />
            </AppViewport>
          </Phone>
        </div>
      </div>
    </section>
  );
}
