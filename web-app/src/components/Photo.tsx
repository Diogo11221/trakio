import { useEffect, useState } from 'react';

import { fileBlobUrl } from '../api';
import { Icon } from './Icon';

const cache = new Map<string, Promise<string>>();

/** A person's photo from the API (sent with the session token), or a neutral silhouette. */
export function Photo({ url, name, size }: { url: string | null | undefined; name: string; size: number }) {
  const [state, setState] = useState<{ url: string; src: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    if (!cache.has(url)) cache.set(url, fileBlobUrl(url));
    cache
      .get(url)!
      .then((src) => alive && setState({ url, src }))
      .catch(() => cache.delete(url));
    return () => {
      alive = false;
    };
  }, [url]);

  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 } as const;
  if (url && state?.url === url) return <img src={state.src} alt={name} style={{ ...style, objectFit: 'cover' }} />;
  return (
    <span
      aria-label={name}
      role="img"
      style={{ ...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-track)' }}
    >
      <Icon name="user" size={Math.round(size * 0.45)} />
    </span>
  );
}
