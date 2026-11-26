import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import { Layout } from './components/Layout';
import { AdminProvider, useAdmin } from './data/store';
import { Login } from './pages/Login';
import { Library } from './pages/Library';
import { Overview } from './pages/Overview';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Verification } from './pages/Verification';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'verificacao', element: <Verification /> },
      { path: 'utilizadores', element: <Users /> },
      { path: 'pagamentos', element: <Payments /> },
      { path: 'denuncias', element: <Reports /> },
      { path: 'biblioteca', element: <Library /> },
      { path: 'definicoes', element: <Settings /> },
    ],
  },
]);

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

/** Nothing of the back office renders without an admin session. */
function Gate() {
  const { session } = useAdmin();
  if (session.status === 'loading') return null;
  if (session.status === 'signedOut') return <Login />;
  return <RouterProvider router={router} />;
}

createRoot(container).render(
  <StrictMode>
    <AdminProvider>
      <Gate />
    </AdminProvider>
  </StrictMode>,
);
