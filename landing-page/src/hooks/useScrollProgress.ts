import { useEffect, useRef, type RefObject } from 'react';
import { subscribeScroll } from './scrollBus';

export type ProgressMode =
  /** 0 when the element's top hits the viewport bottom, 1 when its bottom leaves the top. */
  | 'through'
  /** 0 when the top reaches the viewport top, 1 when the bottom reaches the viewport bottom (pinned sections). */
  | 'pinned'
  /** 0 when the top hits the viewport bottom, 1 when the top reaches the viewport top. */
  | 'enter';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Calls `onProgress` every frame the scroll position changes, with the
 * element's progress (0–1) according to `mode`. No React re-renders: the
 * callback is expected to write styles / CSS variables directly.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  mode: ProgressMode = 'through',
): void {
  const callback = useRef(onProgress);
  callback.current = onProgress;

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    return subscribeScroll((_, viewportH) => {
      const rect = element.getBoundingClientRect();
      let progress: number;
      if (mode === 'pinned') {
        const distance = rect.height - viewportH;
        progress = distance <= 0 ? 0 : -rect.top / distance;
      } else if (mode === 'enter') {
        progress = (viewportH - rect.top) / viewportH;
      } else {
        progress = (viewportH - rect.top) / (viewportH + rect.height);
      }
      callback.current(clamp01(progress));
    });
  }, [ref, mode]);
}
