import muscleMap from '../assets/figma/muscle-map-render.jpg';
import dotVolt from '../assets/figma/dot-volt.svg';
import tabNutrition from '../assets/figma/tab-nutrition.svg';
import tabProfile from '../assets/figma/tab-profile.svg';
import tabProgress from '../assets/figma/tab-progress.svg';
import tabToday from '../assets/figma/tab-today.svg';
import tabTrain from '../assets/figma/tab-train.svg';
import { MaxLoadList } from './MaxLoadList';
import { StatusBar } from './StatusBar';
import styles from './ProgressScreen.module.css';

const tabs = [
  { label: 'Hoje', icon: tabToday },
  { label: 'Treinar', icon: tabTrain },
  { label: 'Nutrição', icon: tabNutrition },
  { label: 'Progresso', icon: tabProgress, active: true },
  { label: 'Perfil', icon: tabProfile },
] as const;

/** App · Progresso — weekly volume on the 3D muscle map + estimated max loads. */
export function ProgressScreen({ list = 'inline' }: { list?: 'inline' | 'placeholder' }) {
  return (
    <div className={styles.screen}>
      <StatusBar time="9:41" />
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.title}>Progresso</span>
          <span className={styles.range}>
            <span>1 mês</span>
            <span data-active="true">2 meses</span>
            <span>1 ano</span>
          </span>
        </div>
        <div className={styles.mapCard}>
          <div className={styles.mapHeader}>
            <span>Volume esta semana</span>
            <span>Arrasta para rodar</span>
          </div>
          <img src={muscleMap} alt="Mapa muscular 3D, de frente e de costas, com peito e ombros destacados" />
          <div className={styles.chips}>
            <span className={styles.chip}>
              <img src={dotVolt} alt="" />
              Peito <span className="mono">14</span>
            </span>
            <span className={styles.chip}>
              <img src={dotVolt} alt="" />
              Ombros <span className="mono">11</span>
            </span>
            <span className={`${styles.chip} ${styles.chipMuted}`}>
              Dorsais <span className="mono">4 ↓</span>
            </span>
          </div>
        </div>
        <span className={styles.caption}>Carga máxima estimada</span>
        <div className={`${styles.list} ${list === 'placeholder' ? styles.placeholder : ''}`}>
          <MaxLoadList />
        </div>
      </div>
      <nav className={styles.tabBar} aria-hidden="true">
        {tabs.map((tab) => (
          <span key={tab.label} className={styles.tab} data-active={'active' in tab}>
            <img src={tab.icon} alt="" />
            {tab.label}
          </span>
        ))}
        <span className={styles.homeIndicator} />
      </nav>
    </div>
  );
}
