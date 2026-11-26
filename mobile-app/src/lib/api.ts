import { API_URL } from '@/lib/config';
import { getAccessToken, loadRefreshToken, saveRefreshToken, setAccessToken } from '@/lib/session';
import type { AuthResponse } from '@/lib/apiTypes';

/** An error the API explained (RFC 9457 problem): `code` is stable, `message` is ready to show. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const OFFLINE = 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.';

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Called when the session can't be renewed any more (signed out elsewhere, suspended…). */
export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

export async function storeSession(auth: AuthResponse): Promise<void> {
  setAccessToken(auth.accessToken);
  await saveRefreshToken(auth.refreshToken);
}

export async function clearSession(): Promise<void> {
  setAccessToken(null);
  await saveRefreshToken(null);
}

let refreshing: Promise<AuthResponse | null> | null = null;

/** Rotates the refresh token. One refresh at a time: parallel 401s wait for the same one. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const token = await loadRefreshToken();
      if (!token) return null;
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await clearSession();
          expiredListeners.forEach((l) => l());
        }
        return null;
      }
      const auth = (await response.json()) as AuthResponse;
      await storeSession(auth);
      return auth;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type RequestOptions = { body?: unknown; form?: FormData; auth?: boolean; signal?: AbortSignal };

async function send(method: string, path: string, options: RequestOptions, retry: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.form) body = options.form;
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body, signal: options.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'offline', OFFLINE);
  }
  if (response.status === 401 && retry && options.auth !== false) {
    const renewed = await refreshSession();
    if (renewed) return send(method, path, options, false);
  }
  return response;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const problem = (data ?? {}) as { code?: string; detail?: string; fields?: Record<string, string> };
    throw new ApiError(response.status, problem.code ?? `http-${response.status}`, problem.detail ?? 'Algo correu mal. Tenta outra vez.',
      problem.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, options: RequestOptions = {}) => send('GET', path, options, true).then((r) => parse<T>(r)),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    send('POST', path, { ...options, body }, true).then((r) => parse<T>(r)),
  put: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    send('PUT', path, { ...options, body }, true).then((r) => parse<T>(r)),
  delete: <T = void>(path: string, body?: unknown) => send('DELETE', path, { body }, true).then((r) => parse<T>(r)),
  upload: <T>(path: string, form: FormData) => send('POST', path, { form }, true).then((r) => parse<T>(r)),
};

/** Absolute URL for a path the API returned ("/api/v1/files/…"). */
export function apiUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

/** Image source for a protected file: expo-image sends the bearer header with it. */
export function protectedImage(uri: string): { uri: string; headers?: Record<string, string> } {
  const token = getAccessToken();
  return uri.startsWith(API_URL) && token ? { uri, headers: { Authorization: `Bearer ${token}` } } : { uri };
}

/** A file picked on the phone, ready for a multipart upload. */
export function filePart(uri: string, name: string, type: string): Blob {
  // React Native's FormData takes { uri, name, type } in place of a Blob.
  return { uri, name, type } as unknown as Blob;
}

export type UploadPurpose = 'avatar' | 'chat' | 'meal' | 'verification';

export async function uploadFile(uri: string, purpose: UploadPurpose, name: string, type: string): Promise<{ id: string; url: string }> {
  const form = new FormData();
  form.append('purpose', purpose);
  form.append('file', filePart(uri, name, type));
  return api.upload('/api/v1/files', form);
}
