/**
 * A single rAF loop that notifies subscribers whenever the window scroll
 * position or viewport size changes. Works with Lenis (which drives the real
 * window scroll) and with native scrolling when reduced motion is on.
 */
type Listener = (scrollY: number, viewportH: number) => void;

const listeners = new Set<Listener>();
let frame = 0;
let lastY = Number.NaN;
let lastH = Number.NaN;
let forced = false;

function tick(): void {
  const y = window.scrollY;
  const h = window.innerHeight;
  if (forced || y !== lastY || h !== lastH) {
    lastY = y;
    lastH = h;
    forced = false;
    listeners.forEach((listener) => listener(y, h));
  }
  frame = requestAnimationFrame(tick);
}

function onResize(): void {
  forced = true;
}

export function subscribeScroll(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('resize', onResize);
    frame = requestAnimationFrame(tick);
  }
  forced = true;
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      lastY = Number.NaN;
      lastH = Number.NaN;
    }
  };
}
