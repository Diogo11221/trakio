import { useRef, type CSSProperties } from 'react';
import iconNo from '../assets/figma/icon-no.svg';
import iconYes from '../assets/figma/icon-yes.svg';
import { useRevealChildren } from '../hooks/useInView';
import styles from './Pricing.module.css';

const features = [
  { label: 'Planos de treino e modelos', free: true },
  { label: 'Registo de cargas e descanso automático', free: true },
  { label: 'Progresso e carga máxima estimada', free: true },
  { label: 'Mapa muscular 3D', free: true },
  { label: 'Contratar um PT no marketplace', free: true },
  { label: 'Registo de refeições com IA (foto, voz, texto)', free: false },
] as const;

const trainerPerks = [
  'Perfil verificado no marketplace',
  'Alunos ilimitados',
  'App e dashboard web',
  'Pagamentos automáticos via Stripe',
  'Alertas da IA sobre cada aluno',
] as const;

const Mark = ({ included }: { included: boolean }) => (
  <img src={included ? iconYes : iconNo} alt={included ? 'Incluído' : 'Não incluído'} width={16} height={16} />
);

/** Landing · 05 Preços */
export function Pricing() {
  const section = useRef<HTMLElement>(null);
  useRevealChildren(section);

  return (
    <section ref={section} id="precos" className={styles.section} aria-labelledby="precos-title">
      <div className={styles.frame}>
        <header className={styles.header} data-reveal>
          <h2 id="precos-title">Preços simples</h2>
          <p>Sem fidelização. Cancelas quando quiseres.</p>
        </header>

        <div className={styles.plans}>
          <div className={styles.table} data-reveal role="table" aria-label="Planos para quem treina">
            <div className={`${styles.row} ${styles.headRow}`} role="row">
              <div className={styles.feature} role="columnheader">
                <strong>Para quem treina</strong>
                <span>Sozinho ou com o teu PT</span>
              </div>
              <div className={styles.cell} role="columnheader">
                <strong>Grátis</strong>
                <span className={`mono ${styles.price}`}>0 €</span>
              </div>
              <div className={`${styles.cell} ${styles.premium}`} role="columnheader">
                <strong>Premium</strong>
                <span className={styles.priceRow}>
                  <span className={`mono ${styles.price}`}>4,99 €</span>
                  <span>/mês</span>
                </span>
              </div>
            </div>
            {features.map((feature) => (
              <div key={feature.label} className={styles.row} role="row">
                <div className={styles.feature} role="rowheader">
                  {feature.label}
                </div>
                <div className={styles.cell} role="cell">
                  <Mark included={feature.free} />
                </div>
                <div className={`${styles.cell} ${styles.premium}`} role="cell">
                  <Mark included />
                </div>
              </div>
            ))}
            <div className={`${styles.row} ${styles.footRow}`} role="row">
              <div className={styles.feature} role="cell" />
              <div className={styles.cell} role="cell">
                <a className={styles.outlineButton} href="#comecar">
                  Começar grátis
                </a>
              </div>
              <div className={`${styles.cell} ${styles.premium}`} role="cell">
                <a className={styles.voltButton} href="#premium">
                  Experimentar Premium
                </a>
              </div>
            </div>
          </div>

          <aside className={styles.trainers} data-reveal style={{ '--reveal-delay': '0.1s' } as CSSProperties}>
            <strong className={styles.trainersTitle}>Para personal trainers</strong>
            <span className={styles.priceRow}>
              <span className={`mono ${styles.bigPrice}`}>4 €</span>
              <span>/mês</span>
            </span>
            <p>+ 10% de cada pagamento que recebes dos alunos. Sem alunos, só pagas a subscrição.</p>
            <span className={styles.rule} />
            <ul>
              {trainerPerks.map((perk) => (
                <li key={perk}>
                  <Mark included />
                  {perk}
                </li>
              ))}
            </ul>
            <span className={styles.spacer} />
            <a className={styles.lightButton} href="#criar-perfil-pt">
              Criar perfil de PT
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
