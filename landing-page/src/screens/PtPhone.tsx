import battery from '../assets/figma/ios-battery.svg';
import signal from '../assets/figma/ios-signal.svg';
import chevronMuted from '../assets/figma/pt/chevron-muted.svg';
import chevron from '../assets/figma/pt/chevron.svg';
import dotAlert from '../assets/figma/pt/dot-alert.svg';
import tabEarnings from '../assets/figma/pt/tab-earnings.svg';
import tabHome from '../assets/figma/pt/tab-home.svg';
import tabMessages from '../assets/figma/pt/tab-messages.svg';
import tabPlans from '../assets/figma/pt/tab-plans.svg';
import tabStudents from '../assets/figma/pt/tab-students.svg';
import { Portrait, type Person } from './Portrait';
import styles from './PtPhone.module.css';

const attention: ReadonlyArray<{ person: Person; name: string; reason: string }> = [
  { person: 'miguel', name: 'Miguel Costa', reason: 'Cansaço alto previsto para quinta' },
  { person: 'ana', name: 'Ana Ribeiro', reason: 'Faltou 2 treinos esta semana' },
  { person: 'joao', name: 'João Martins', reason: 'Peso morto sem evolução há 3 semanas' },
];

const tabs = [
  { label: 'Início', icon: tabHome, active: true },
  { label: 'Alunos', icon: tabStudents },
  { label: 'Planos', icon: tabPlans },
  { label: 'Mensagens', icon: tabMessages },
  { label: 'Ganhos', icon: tabEarnings },
] as const;

/** Telemóvel · App do PT — PT home at 0.6 scale. */
export function PtPhone() {
  return (
    <div className={styles.phone} role="img" aria-label="App do PT: 18 alunos ativos, 3 com alertas, 1240 € este mês">
      <div className={styles.screen}>
        <div className={styles.statusBar}>
          <span>9:41</span>
          <span className={styles.island} />
          <span className={styles.indicators}>
            <img src={signal} alt="" style={{ width: 10.8, height: 7.2 }} />
            <img src={battery} alt="" style={{ width: 15.6, height: 7.8 }} />
          </span>
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <span>
              <span>Terça, 24 de novembro</span>
              <strong>Bom dia, Rita</strong>
            </span>
            <Portrait person="rita" size={25.2} />
          </div>
          <div className={`${styles.card} ${styles.summary}`}>
            <span>
              <span className="mono">18</span>
              <span>alunos ativos</span>
            </span>
            <span>
              <span className={styles.alert}>
                <img src={dotAlert} alt="" />
                <span className="mono">3</span>
              </span>
              <span>com alertas</span>
            </span>
            <span>
              <span className="mono">1240€</span>
              <span>este mês</span>
            </span>
          </div>
          <div className={styles.sectionTitle}>
            <strong>Precisam de atenção</strong>
            <span>Ver todos</span>
          </div>
          <div className={styles.card}>
            {attention.map((item) => (
              <div key={item.name} className={styles.listRow}>
                <Portrait person={item.person} size={24} />
                <span className={styles.listText}>
                  <strong>{item.name}</strong>
                  <span>{item.reason}</span>
                </span>
                <img src={chevron} alt="" className={styles.chevron} />
              </div>
            ))}
          </div>
          <div className={styles.sectionTitle}>
            <strong>Hoje</strong>
          </div>
          <div className={styles.card}>
            <div className={styles.listRow}>
              <span className={`mono ${styles.hour}`}>10:00</span>
              <span className={styles.listText}>
                <span className={styles.medium}>Sessão online · Sofia Lopes</span>
                <span>Videochamada · 45 min</span>
              </span>
              <span className={styles.join}>Entrar</span>
            </div>
            <div className={styles.listRow}>
              <span className={`mono ${styles.hour}`}>18:30</span>
              <span className={styles.listText}>
                <span className={styles.medium}>Avaliação inicial · Tomás Silva</span>
                <span>Ginásio de Alvalade</span>
              </span>
              <img src={chevronMuted} alt="" className={styles.chevron} />
            </div>
          </div>
        </div>
        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <span key={tab.label} data-active={'active' in tab}>
              <img src={tab.icon} alt="" />
              {tab.label}
            </span>
          ))}
          <span className={styles.homeIndicator} />
        </div>
      </div>
    </div>
  );
}
