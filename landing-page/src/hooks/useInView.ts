import { useEffect, type RefObject } from 'react';

/**
 * Sets `data-inview="true"` on every `[data-reveal]` element inside `root`
 * the first time it enters the viewport. CSS handles the actual transition.
 */
export function useRevealChildren(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = root.current;
    if (!container) return undefined;
    const targets = container.querySelectorAll<HTMLElement>('[data-reveal]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.inview = 'true';
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [root]);
}
