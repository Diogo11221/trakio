import { Wordmark } from '../components/Wordmark';
import styles from './Footer.module.css';

const columns = [
  { title: 'Produto', links: ['Treinar', 'Nutrição', 'Progresso', 'Preços'] },
  { title: 'Para PTs', links: ['Criar perfil', 'Marketplace', 'Pagamentos'] },
  { title: 'Empresa', links: ['Sobre', 'Contactos', 'Ajuda'] },
  { title: 'Legal', links: ['Privacidade', 'Termos', 'Cookies'] },
] as const;

/** Rodapé */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        <Wordmark />
        <p>
          Treino, nutrição e personal trainers.
          <br />
          Feito em Portugal.
        </p>
        <small>© 2026 Trakio · Português / English</small>
      </div>
      <nav className={styles.columns} aria-label="Rodapé">
        {columns.map((column) => (
          <div key={column.title}>
            <h3>{column.title}</h3>
            <ul>
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </footer>
  );
}
