import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { AuthError, demoTrainerLink, type Account, type Profile, type PublicAccount, type Role } from '@/features/auth/types';

/**
 * Test accounts kept on this phone (AsyncStorage) until backend-core exposes
 * auth. Same shape as the future API — swap this module, keep the screens.
 */

const ACCOUNTS_KEY = 'trakio.test.accounts.v1';
const SESSION_KEY = 'trakio.test.session.v1';

export const DEMO_PASSWORD = 'trakio123';
export const demoLogins: { email: string; label: string; role: Role }[] = [
  { email: 'miguel@trakio.test', label: 'Miguel · aluno', role: 'client' },
  { email: 'rita@trakio.test', label: 'Rita · PT', role: 'trainer' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hash(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function toPublic({ passwordHash: _hash, salt: _salt, ...account }: Account): PublicAccount {
  return account;
}

function isAccount(value: unknown): value is Account {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return typeof a.id === 'string' && typeof a.email === 'string' && typeof a.passwordHash === 'string' && (a.role === 'client' || a.role === 'trainer');
}

async function demoAccounts(): Promise<Account[]> {
  const salt = 'demo';
  const passwordHash = await hash(DEMO_PASSWORD, salt);
  const createdAt = '2026-09-01T09:00:00.000Z';
  return [
    {
      id: 'demo-miguel',
      email: 'miguel@trakio.test',
      role: 'client',
      createdAt,
      passwordHash,
      salt,
      profile: {
        kind: 'client',
        name: 'Miguel Costa',
        photoUri: null,
        demoPerson: 'miguel',
        sex: 'male',
        birthYear: 1997,
        heightCm: 178,
        weightKg: 78.4,
        goalWeightKg: 81,
        goal: 'gain',
        activity: 'moderate',
        daysPerWeek: 4,
        experience: 'some',
        coached: true,
        trainer: demoTrainerLink,
      },
    },
    {
      id: 'demo-rita',
      email: 'rita@trakio.test',
      role: 'trainer',
      createdAt,
      passwordHash,
      salt,
      profile: {
        kind: 'trainer',
        name: 'Rita Santos',
        photoUri: null,
        demoPerson: 'rita',
        city: 'Lisboa',
        online: true,
        specialties: ['Hipertrofia', 'Perda de peso', 'Nutrição'],
      },
    },
  ];
}

async function readAccounts(): Promise<Account[]> {
  let stored: Account[] = [];
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) stored = parsed.filter(isAccount);
    } catch {
      // Corrupted test data — start again with the demo accounts.
    }
  }
  // The demo accounts are always there, even after "Apagar conta".
  const missing = (await demoAccounts()).filter((demo) => !stored.some((a) => a.id === demo.id));
  if (missing.length === 0) return stored;
  const accounts = [...missing, ...stored];
  await writeAccounts(accounts);
  return accounts;
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function currentAccount(): Promise<PublicAccount | null> {
  const id = await AsyncStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const account = (await readAccounts()).find((a) => a.id === id);
  if (!account) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
  return toPublic(account);
}

export async function signUp(email: string, password: string, role: Role): Promise<PublicAccount> {
  const clean = normaliseEmail(email);
  if (!EMAIL.test(clean)) throw new AuthError('invalid-email');
  if (password.length < 8) throw new AuthError('weak-password');
  const accounts = await readAccounts();
  if (accounts.some((a) => a.email === clean)) throw new AuthError('email-taken');

  const salt = Crypto.randomUUID();
  const account: Account = {
    id: Crypto.randomUUID(),
    email: clean,
    role,
    createdAt: new Date().toISOString(),
    profile: null,
    passwordHash: await hash(password, salt),
    salt,
  };
  await writeAccounts([...accounts, account]);
  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return toPublic(account);
}

export async function signIn(email: string, password: string): Promise<PublicAccount> {
  const clean = normaliseEmail(email);
  const account = (await readAccounts()).find((a) => a.email === clean);
  if (!account || (await hash(password, account.salt)) !== account.passwordHash) throw new AuthError('wrong-credentials');
  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return toPublic(account);
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function saveProfile(accountId: string, profile: Profile): Promise<PublicAccount> {
  const accounts = await readAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new AuthError('not-found');
  const updated: Account = { ...account, profile };
  await writeAccounts(accounts.map((a) => (a.id === accountId ? updated : a)));
  return toPublic(updated);
}

/** Removes the account from this phone (a deleted demo account is recreated with its demo data). */
export async function deleteAccount(accountId: string): Promise<void> {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((a) => a.id !== accountId));
  await AsyncStorage.removeItem(SESSION_KEY);
}
