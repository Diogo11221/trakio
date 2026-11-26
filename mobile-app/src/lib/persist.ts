
/** Storage key for one account's slice of data. */
export function accountKey(accountId: string | undefined, name: string): string | null {
  return accountId ? `trakio.data.${accountId}.${name}` : null;
}

export function isArrayOf<T>(raw: unknown, check: (item: unknown) => boolean): raw is T[] {
  return Array.isArray(raw) && raw.every(check);
}

export function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

/** Local calendar day "2026-11-25" (not UTC). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
