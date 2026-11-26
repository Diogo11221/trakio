import { useCallback, useEffect, useState } from 'react';

import { registerRefresher } from '@/lib/refresh';

/**
 * Data that belongs to one account, loaded from the API: fetched when `owner` changes, reloaded by
 * pull-to-refresh, and never shown to another account (state is tagged with its owner).
 * `fetcher` must be stable (useCallback); null = nothing to load.
 */
export function useRemote<T>(owner: string | null, fetcher: (() => Promise<T>) | null) {
  const [state, setState] = useState<{ owner: string | null; data: T | null }>({ owner: null, data: null });

  const reload = useCallback(async () => {
    if (!owner || !fetcher) return;
    await fetcher().then((data) => setState({ owner, data }));
  }, [fetcher, owner]);

  useEffect(() => {
    if (!owner || !fetcher) return;
    let alive = true;
    fetcher()
      .then((data) => alive && setState({ owner, data }))
      .catch(() => undefined);
    const off = registerRefresher(reload);
    return () => {
      alive = false;
      off();
    };
  }, [fetcher, owner, reload]);

  /** Local change after a successful write, without another round-trip. */
  const update = useCallback(
    (change: (data: T) => T) => setState((s) => (s.owner === owner && s.data !== null ? { owner, data: change(s.data) } : s)),
    [owner],
  );

  return { data: state.owner === owner ? state.data : null, reload, update };
}
