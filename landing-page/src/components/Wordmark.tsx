import logoRing from '../assets/figma/logo-ring.svg';
import styles from './Wordmark.module.css';

export function Wordmark({ href = '#topo' }: { href?: string }) {
  return (
    <a className={styles.wordmark} href={href} aria-label="Trakio — início">
      <img src={logoRing} alt="" width={24} height={24} />
      <span>trakio</span>
    </a>
  );
}
