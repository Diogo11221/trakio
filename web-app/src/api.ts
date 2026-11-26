/**
 * backend-core client for the back office. The access token (15 min) only lives in memory; the
 * refresh token is in sessionStorage, so closing the tab ends the admin session.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const REFRESH_KEY = 'trakio.admin.refresh';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type Me = { id: string; email: string; role: 'client' | 'trainer' | 'admin' };
type AuthResponse = { accessToken: string; refreshToken: string; account: Me };

let accessToken: string | null = null;
let refreshing: Promise<Me | null> | null = null;
const expired = new Set<() => void>();

export function onExpired(listener: () => void): () => void {
  expired.add(listener);
  return () => expired.delete(listener);
}

function store(auth: AuthResponse) {
  accessToken = auth.accessToken;
  sessionStorage.setItem(REFRESH_KEY, auth.refreshToken);
}

export function clearSession() {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
}

export function hasStoredSession(): boolean {
  return sessionStorage.getItem(REFRESH_KEY) !== null;
}

/** One rotation at a time; a failed one ends the session. */
export function refresh(): Promise<Me | null> {
  refreshing ??= (async () => {
    try {
      const token = sessionStorage.getItem(REFRESH_KEY);
      if (!token) return null;
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!response.ok) {
        clearSession();
        expired.forEach((l) => l());
        return null;
      }
      const auth = (await response.json()) as AuthResponse;
      if (auth.account.role !== 'admin') {
        clearSession();
        return null;
      }
      store(auth);
      return auth.account;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'offline', 'Sem ligação ao servidor.');
  }
  if (response.status === 401 && retry && (await refresh())) return request<T>(method, path, body, false);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const problem = (data ?? {}) as { code?: string; detail?: string };
    throw new ApiError(response.status, problem.code ?? `http-${response.status}`, problem.detail ?? 'Algo correu mal. Tenta outra vez.');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
};

/** Back-office sign-in: only admin accounts get in. */
export async function signIn(email: string, password: string): Promise<Me> {
  const auth = await request<AuthResponse>('POST', '/api/v1/auth/sign-in', { email, password }, false);
  if (auth.account.role !== 'admin') {
    await request('POST', '/api/v1/auth/sign-out', { refreshToken: auth.refreshToken }, false).catch(() => undefined);
    throw new ApiError(403, 'not-admin', 'Esta conta não tem acesso ao backoffice.');
  }
  store(auth);
  return auth.account;
}

export async function signOut(): Promise<void> {
  const token = sessionStorage.getItem(REFRESH_KEY);
  if (token) await request('POST', '/api/v1/auth/sign-out', { refreshToken: token }, false).catch(() => undefined);
  clearSession();
}

/** Protected files (photos, documents) need the bearer header: fetched and shown from memory. */
export async function fileBlobUrl(path: string): Promise<string> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const go = () => fetch(url, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  let response = await go();
  if (response.status === 401 && (await refresh())) response = await go();
  if (!response.ok) throw new ApiError(response.status, 'file', 'Ficheiro indisponível.');
  return URL.createObjectURL(await response.blob());
}

/** Opens a document in a new tab through a 5-minute signed link (no token in the URL). */
export async function openFile(path: string): Promise<void> {
  const id = path.split('/api/v1/files/')[1]?.split('?')[0];
  if (!id) return;
  const tab = window.open('', '_blank', 'noopener');
  const link = await api.post<{ url: string }>(`/api/v1/files/${id}/link`);
  if (tab) tab.location.href = `${API_URL}${link.url}`;
  else window.location.assign(`${API_URL}${link.url}`);
}
