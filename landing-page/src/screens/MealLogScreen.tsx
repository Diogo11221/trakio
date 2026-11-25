import lunchPhoto from '../assets/figma/photo-lunch.jpg';
import camera from '../assets/figma/icon-camera.svg';
import close from '../assets/figma/icon-close.svg';
import mic from '../assets/figma/icon-mic.svg';
import { MealEstimate } from './MealEstimate';
import { StatusBar } from './StatusBar';
import styles from './MealLogScreen.module.css';

/** App · Estimativa da IA — meal logged from a photo. */
export function MealLogScreen({ estimate = 'inline' }: { estimate?: 'inline' | 'placeholder' }) {
  return (
    <div className={styles.screen}>
      <StatusBar time="9:41" />
      <div className={styles.header}>
        <span className={styles.close}>
          <img src={close} alt="" />
        </span>
        <span className={styles.title}>Registar refeição</span>
        <span className={styles.chip}>IA</span>
      </div>

      <div className={styles.content}>
        <div className={styles.userPhoto}>
          <div className={styles.bubble}>
            <img src={lunchPhoto} alt="Foto do almoço: frango grelhado, arroz e salada" />
            <span>Almoço</span>
          </div>
          <span className={`mono ${styles.time}`}>13:02</span>
        </div>
        <div className={styles.aiMessage}>
          <span className={styles.aiAvatar}>
            <span />
          </span>
          <p>Identifiquei 3 alimentos. Confirma as quantidades antes de gravar.</p>
        </div>
        <div className={`${styles.estimate} ${estimate === 'placeholder' ? styles.placeholder : ''}`}>
          <MealEstimate />
        </div>
      </div>

      <div className={styles.composer}>
        <div className={styles.input}>
          <span>Escreve, fala ou envia foto</span>
          <span className={styles.round}>
            <img src={camera} alt="" style={{ width: 18, height: 18 }} />
          </span>
          <span className={styles.round}>
            <img src={mic} alt="" style={{ width: 16, height: 16 }} />
          </span>
        </div>
        <span className={styles.homeIndicator} />
      </div>
    </div>
  );
}
