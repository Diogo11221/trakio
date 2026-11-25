import { useRef, type CSSProperties } from 'react';
import { FitScale } from '../components/FitScale';
import { Texture } from '../components/Texture';
import { useRevealChildren } from '../hooks/useInView';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { PtDashboard } from '../screens/PtDashboard';
import { PtPhone } from '../screens/PtPhone';
import styles from './ForTrainers.module.css';

const details = [
  { label: 'Apareces no marketplace', value: '4 €/mês' },
  { label: 'Recebes os pagamentos pela app', value: 'taxa de 10%' },
  { label: 'Alertas de cansaço e de carga parada', value: 'incluído' },
] as const;

/** Landing · 04 Para PTs — light section with the web dashboard and the PT app. */
export function ForTrainers() {
  const section = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  useRevealChildren(section);

  // The window and phone settle from a steep angle into place as the section scrolls in.
  useScrollProgress(section, (progress) => {
    const t = Math.min(1, Math.max(0, (progress - 0.08) / 0.42));
    visual.current?.style.setProperty('--settle', (1 - t * (2 - t)).toFixed(4));
    visual.current?.style.setProperty('--drift', (progress - 0.5).toFixed(4));
  });

  return (
    <section ref={section} id="para-pts" className={styles.section} aria-labelledby="para-pts-title">
      <Texture variant="dots" />
      <div className={styles.frame}>
        <div className={styles.copy}>
          <p className={styles.kicker} data-reveal>
            Para personal trainers
          </p>
          <h2 id="para-pts-title" className={styles.title} data-reveal style={{ '--reveal-delay': '0.06s' } as CSSProperties}>
            <span>Os teus alunos,</span>
            <span>num só ecrã.</span>
          </h2>
          <p className={styles.lead} data-reveal style={{ '--reveal-delay': '0.12s' } as CSSProperties}>
            Planos, mensagens, pagamentos e a evolução de cada aluno. A IA avisa-te de quem precisa de atenção antes de
            ser tarde.
          </p>
          <ul className={styles.details} data-reveal style={{ '--reveal-delay': '0.18s' } as CSSProperties}>
            {details.map((detail) => (
              <li key={detail.label}>
                <span>{detail.label}</span>
                <span className="mono">{detail.value}</span>
              </li>
            ))}
          </ul>
          <div className={styles.actions} data-reveal style={{ '--reveal-delay': '0.24s' } as CSSProperties}>
            <a className={styles.darkButton} href="#criar-perfil-pt">
              Criar perfil de PT
            </a>
            <a className={styles.textLink} href="#precos">
              Ver preços
            </a>
          </div>
        </div>

        <FitScale width={822} height={709} className={styles.visualFit}>
          <div ref={visual} className={styles.visual}>
            <div className={styles.window}>
              <PtDashboard />
            </div>
            <div className={styles.phone}>
              <PtPhone />
            </div>
          </div>
        </FitScale>
      </div>
    </section>
  );
}
