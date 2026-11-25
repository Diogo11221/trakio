import type { ReactNode } from 'react';
import arrowRight from '../assets/figma/icon-arrow-right.svg';
import arrowUpRight from '../assets/figma/icon-arrow-up-right.svg';
import styles from './Buttons.module.css';

type PrimaryButtonProps = {
  href: string;
  size?: 'small' | 'large';
  children: ReactNode;
};

/** Web/Botão principal — Volt CTA. Small for the nav, large (with arrow) for the hero. */
export function PrimaryButton({ href, size = 'small', children }: PrimaryButtonProps) {
  return (
    <a className={`${styles.primary} ${size === 'large' ? styles.large : styles.small}`} href={href}>
      <span>{children}</span>
      {size === 'large' && <img src={arrowRight} alt="" width={16} height={16} className={styles.arrow} />}
    </a>
  );
}

/** Web/Link com seta — secondary text link with underline and arrow. */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.arrowLink} href={href}>
      <span>{children}</span>
      <img src={arrowUpRight} alt="" width={14} height={14} />
    </a>
  );
}
