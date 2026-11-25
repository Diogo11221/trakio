import { NavLink, Outlet, useLocation } from 'react-router';

import logoRing from '../assets/figma/logo-ring.svg';
import { useAdmin } from '../data/store';
import { Icon, type IconName } from './Icon';
import { Portrait } from './Portrait';
import { Toast } from './ui';
import s from './Layout.module.css';

const nav: { to: string; label: string; icon: IconName; badge?: 'verification' | 'reports' }[] = [
  { to: '/', label: 'Visão geral', icon: 'navOverview' },
  { to: '/verificacao', label: 'Verificação de PTs', icon: 'navVerify', badge: 'verification' },
  { to: '/utilizadores', label: 'Utilizadores', icon: 'navUsers' },
  { to: '/pagamentos', label: 'Pagamentos', icon: 'navPayments' },
  { to: '/denuncias', label: 'Denúncias', icon: 'navReports', badge: 'reports' },
  { to: '/biblioteca', label: 'Biblioteca de exercícios', icon: 'navLibrary' },
  { to: '/definicoes', label: 'Definições', icon: 'navSettings' },
];

/** Backoffice shell: fixed sidebar (Figma "Sidebar") + page. */
export function Layout() {
  const { pendingVerifications, openReports } = useAdmin();
  const location = useLocation();
  const counts = { verification: pendingVerifications, reports: openReports };

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <span className={s.logoTile}>
            <img src={logoRing} width={20} height={20} alt="" />
          </span>
          <span className={s.wordmark}>trakio</span>
          <span className={s.adminTag}>Admin</span>
        </div>
        <nav aria-label="Secções" style={{ display: 'contents' }}>
          {nav.map((item) => {
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `${s.nav} ${isActive ? s.navActive : ''}`}
              >
                <Icon name={item.icon} size={18} tint />
                <span className={s.navLabel}>{item.label}</span>
                {count > 0 ? (
                  <span key={count} className={s.badge}>
                    {count}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
        <div className={s.spacer} />
        <div className={s.me}>
          <Portrait person="marta" size={34} />
          <div>
            <div className={s.meName}>Marta Neves</div>
            <div className={s.meRole}>Equipa Trakio</div>
          </div>
        </div>
      </aside>
      <main key={location.pathname} className={s.main}>
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
