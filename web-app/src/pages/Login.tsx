import { useState, type FormEvent } from 'react';

import logoRing from '../assets/figma/logo-ring.svg';
import { Button, Card, fieldStyles } from '../components/ui';
import { useAdmin } from '../data/store';
import s from './Login.module.css';

/** Back office sign-in (admin accounts only; they're created on the server, never here). */
export function Login() {
  const { signIn } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setBusy(false);
    }
  };

  return (
    <main className={s.page}>
      <Card className={s.card}>
        <div className={s.brand}>
          <img src={logoRing} width={24} height={24} alt="" />
          <span className={s.wordmark}>trakio</span>
          <span className={s.tag}>Admin</span>
        </div>
        <form onSubmit={submit} className={s.form}>
          <label className={fieldStyles.field}>
            Email
            <input className={fieldStyles.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className={fieldStyles.field}>
            Palavra-passe
            <input
              className={fieldStyles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'A entrar…' : 'Entrar'}
          </Button>
        </form>
        <p className={s.note}>Só contas de administração. A sessão termina quando fechas este separador.</p>
      </Card>
    </main>
  );
}
