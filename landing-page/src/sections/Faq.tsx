import { useId, useRef, useState } from 'react';
import iconMinus from '../assets/figma/icon-minus.svg';
import iconPlus from '../assets/figma/icon-plus.svg';
import { Texture } from '../components/Texture';
import { useRevealChildren } from '../hooks/useInView';
import styles from './Faq.module.css';

const questions = [
  {
    q: 'Preciso de um PT para usar o Trakio?',
    a: 'Não. Podes criar os teus planos ou usar modelos prontos. Se quiseres, contratas um PT mais tarde no marketplace, dentro da app.',
  },
  {
    q: 'Para que servem os dados do relógio?',
    a: 'Com a tua autorização, lemos o sono, a frequência cardíaca e os passos do Apple Health ou do Health Connect para calcular a tua prontidão e avisar quando precisas de uma semana mais leve. Podes desligar quando quiseres.',
  },
  {
    q: 'Como funciona o pagamento ao PT?',
    a: 'Pagas o acompanhamento dentro da app, com cartão, através do Stripe. O valor vai diretamente para o PT; o Trakio fica com 10% para manter a plataforma.',
  },
  {
    q: 'Posso cancelar o Premium quando quiser?',
    a: 'Sim. Cancelas nas definições da conta e confirmas antes de terminar. Continuas com o Premium até ao fim do mês já pago e não há fidelização.',
  },
  {
    q: 'Em que línguas está disponível?',
    a: 'Português de Portugal e inglês. Podes mudar de língua a qualquer momento nas definições.',
  },
] as const;

/** Perguntas frequentes — accordion, first one open. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const section = useRef<HTMLElement>(null);
  useRevealChildren(section);

  return (
    <section ref={section} className={styles.section} aria-labelledby={`${baseId}-title`}>
      <Texture variant="chart" />
      <div className={styles.intro} data-reveal>
        <h2 id={`${baseId}-title`}>Perguntas frequentes</h2>
        <p>
          Não encontras a tua? Escreve-nos para <a href="mailto:ola@trakio.pt">ola@trakio.pt</a>
        </p>
      </div>
      <div className={styles.accordion} data-reveal>
        {questions.map((item, index) => {
          const expanded = open === index;
          const panelId = `${baseId}-panel-${index}`;
          return (
            <div key={item.q} className={styles.item} data-open={expanded}>
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : index)}
                >
                  <span>{item.q}</span>
                  <img src={expanded ? iconMinus : iconPlus} alt="" width={18} height={18} />
                </button>
              </h3>
              <div id={panelId} className={styles.panel} role="region" aria-hidden={!expanded}>
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
