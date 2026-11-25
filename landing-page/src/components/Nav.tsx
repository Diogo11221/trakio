import { useEffect, useRef } from 'react';
import { subscribeScroll } from '../hooks/scrollBus';
import { useScrollTo } from '../hooks/SmoothScroll';
import { PrimaryButton } from './Buttons';
import { Wordmark } from './Wordmark';
import styles from './Nav.module.css';

const links = [
  { href: '#treinar', label: 'Treinar' },
  { href: '#nutricao', label: 'Nutrição' },
  { href: '#para-pts', label: 'Para PTs' },
  { href: '#precos', label: 'Preços' },
] as const;

/** Web/Navegação — sticky across the whole page. */
export function Nav() {
  const ref = useRef<HTMLElement>(null);
  const scrollTo = useScrollTo();

  useEffect(
    () =>
      subscribeScroll((y) => {
        if (ref.current) ref.current.dataset.scrolled = y > 8 ? 'true' : 'false';
      }),
    [],
  );

  return (
    <header ref={ref} className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark />
        </div>
        <nav aria-label="Principal">
          <ul className={styles.links}>
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollTo(link.href);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.actions}>
          <span className={`${styles.lang} mono`} aria-label="Língua: Português">
            <span className={styles.langActive}>PT</span> / EN
          </span>
          <a className={styles.signIn} href="#entrar">
            Entrar
          </a>
          <PrimaryButton href="#comecar">Começar grátis</PrimaryButton>
        </div>
      </div>
    </header>
  );
}
