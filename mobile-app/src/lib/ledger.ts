import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Person } from '@/components/Portrait';
import { isArrayOf, isRecord } from '@/lib/persist';

/**
 * Payments made on this phone (hiring a PT in the marketplace) — the PT's
 * "Ganhos" reads them. Stripe and backend-core replace this.
 */
export type LedgerEntry = {
  id: string;
  trainer: Person;
  studentId: string;
  studentName: string;
  photoUri: string | null;
  pack: string;
  amount: number;
  at: number;
};

const KEY = 'trakio.data.shared.payments.v1';

async function read(): Promise<LedgerEntry[]> {
  try {
    const raw: unknown = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
    return isArrayOf<LedgerEntry>(raw, (e) => isRecord(e) && typeof e.amount === 'number') ? raw : [];
  } catch {
    return [];
  }
}

export async function recordPayment(entry: LedgerEntry): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...(await read())]));
}

export async function paymentsFor(trainer: Person): Promise<LedgerEntry[]> {
  return (await read()).filter((e) => e.trainer === trainer);
}
