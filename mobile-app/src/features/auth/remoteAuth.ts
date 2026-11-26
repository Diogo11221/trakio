import { ApiError, api, apiUrl, clearSession, refreshSession, storeSession, uploadFile } from '@/lib/api';
import type { AuthResponse, MeDto } from '@/lib/apiTypes';
import { API_URL } from '@/lib/config';
import { loadRefreshToken } from '@/lib/session';
import { AuthError, type Profile, type PublicAccount, type Role } from '@/features/auth/types';

/** Accounts on backend-core. Same shape the screens used with the on-phone test accounts. */

/** Development shortcuts for the accounts the "dev" profile creates (never shown in release builds). */
export const DEMO_PASSWORD = 'trakio123';
export const demoLogins: { email: string; label: string; role: Role }[] = __DEV__
  ? [
      { email: 'miguel@trakio.test', label: 'Miguel · aluno', role: 'client' },
      { email: 'rita@trakio.test', label: 'Rita · PT', role: 'trainer' },
    ]
  : [];

const photo = (url: string | null) => (url ? apiUrl(url) : null);

export function toAccount(me: MeDto): PublicAccount {
  if (me.role === 'admin') throw new AuthError('admin-account');
  const p = me.profile;
  let profile: Profile | null = null;
  if (p?.kind === 'client') {
    const t = me.trainer;
    profile = {
      kind: 'client',
      name: p.name,
      photoUri: photo(p.photoUrl),
      sex: p.sex,
      birthYear: p.birthYear,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      goalWeightKg: p.goalWeightKg,
      goal: p.goal,
      activity: p.activity,
      daysPerWeek: p.daysPerWeek,
      experience: p.experience,
      coached: p.coached,
      trainer: t
        ? {
            id: t.trainerId,
            name: t.name,
            article: t.article,
            photoUri: photo(t.photoUrl),
            pack: t.pack,
            price: t.priceCents / 100,
            period: t.period === 'month' ? 'mês' : 'avulso',
            conversationId: t.conversationId,
          }
        : null,
    };
  } else if (p?.kind === 'trainer') {
    profile = { ...p, kind: 'trainer', photoUri: photo(p.photoUrl) };
  }
  return { id: me.id, email: me.email, role: me.role, createdAt: me.createdAt, profile, premium: me.premium, preferences: me.preferences };
}

function authError(e: unknown): never {
  if (e instanceof ApiError) throw new AuthError(e.code, e.message);
  throw e;
}

async function signedIn(auth: AuthResponse): Promise<PublicAccount> {
  const account = toAccount(auth.account);
  await storeSession(auth);
  return account;
}

/** Restores the session saved on this phone (rotating its refresh token). */
export async function currentAccount(): Promise<PublicAccount | null> {
  if (!(await loadRefreshToken())) return null;
  const auth = await refreshSession();
  if (!auth) return null;
  try {
    return toAccount(auth.account);
  } catch {
    await clearSession();
    return null;
  }
}

export async function reload(): Promise<PublicAccount> {
  return toAccount(await api.get<MeDto>('/api/v1/me'));
}

export async function signUp(email: string, password: string, role: Role): Promise<PublicAccount> {
  const auth = await api.post<AuthResponse>('/api/v1/auth/sign-up', { email, password, role }, { auth: false }).catch(authError);
  return signedIn(auth);
}

export async function signIn(email: string, password: string): Promise<PublicAccount> {
  const auth = await api.post<AuthResponse>('/api/v1/auth/sign-in', { email, password }, { auth: false }).catch(authError);
  if (auth.account.role === 'admin') {
    await api.post('/api/v1/auth/sign-out', { refreshToken: auth.refreshToken }, { auth: false }).catch(() => undefined);
    throw new AuthError('admin-account');
  }
  return signedIn(auth);
}

export async function signOut(): Promise<void> {
  const token = await loadRefreshToken();
  if (token) await api.post('/api/v1/auth/sign-out', { refreshToken: token }, { auth: false }).catch(() => undefined);
  await clearSession();
}

/** Photos picked on the phone are uploaded first; server photos are kept by id. */
async function photoFileId(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  const prefix = `${API_URL}/api/v1/files/`;
  if (uri.startsWith(prefix)) return uri.slice(prefix.length).split('?')[0] ?? null;
  const type = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const file = await uploadFile(uri, 'avatar', type === 'image/png' ? 'foto.png' : 'foto.jpg', type);
  return file.id;
}

export async function saveProfile(profile: Profile): Promise<PublicAccount> {
  const fileId = await photoFileId(profile.photoUri);
  const body =
    profile.kind === 'client'
      ? {
          kind: 'client',
          name: profile.name,
          photoFileId: fileId,
          sex: profile.sex,
          birthYear: profile.birthYear,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          goalWeightKg: profile.goal === 'maintain' ? null : profile.goalWeightKg,
          goal: profile.goal,
          activity: profile.activity,
          daysPerWeek: profile.daysPerWeek,
          experience: profile.experience,
        }
      : {
          kind: 'trainer',
          name: profile.name,
          photoFileId: fileId,
          article: profile.article,
          city: profile.city,
          area: profile.area,
          online: profile.online,
          bio: profile.bio,
          specialties: profile.specialties,
        };
  return toAccount(await api.put<MeDto>('/api/v1/me/profile', body));
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<PublicAccount> {
  const auth = await api.post<AuthResponse>('/api/v1/me/password', { currentPassword, newPassword }).catch(authError);
  return signedIn(auth);
}

/** Deletes the account on the server (asks for the password again) and forgets the session. */
export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/api/v1/me', { password }).catch(authError);
  await clearSession();
}
