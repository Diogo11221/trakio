/**
 * Pull-to-refresh for the tabs: every data provider registers how to reload itself, and
 * pulling down reloads them all.
 */
type Refresher = () => Promise<unknown>;
const refreshers = new Set<Refresher>();

export function registerRefresher(refresher: Refresher): () => void {
  refreshers.add(refresher);
  return () => refreshers.delete(refresher);
}

export async function refreshAll(): Promise<void> {
  await Promise.allSettled([...refreshers].map((r) => r()));
}
