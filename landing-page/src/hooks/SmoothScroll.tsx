import Lenis from 'lenis';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery';

const LenisContext = createContext<Lenis | null>(null);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      wheelMultiplier: 0.9,
      anchors: { offset: 0 },
    });
    setLenis(instance);
    return () => {
      instance.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/** Scrolls to an in-page anchor, smoothly when Lenis is running. */
export function useScrollTo(): (target: string) => void {
  const lenis = useContext(LenisContext);
  return (target: string) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) return;
    if (lenis) {
      lenis.scrollTo(element, { duration: 1.6 });
    } else {
      element.scrollIntoView({ behavior: 'auto' });
    }
  };
}
