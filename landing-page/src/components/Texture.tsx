import { useEffect, useRef, type CSSProperties } from 'react';
import styles from './Texture.module.css';

export type TextureVariant = 'ruling' | 'dial' | 'dots' | 'knurl' | 'chart' | 'ripple';

type TextureProps = {
  variant: TextureVariant;
  className?: string;
  style?: CSSProperties;
};

/**
 * Slow, ambient background texture for a section. Animations only run while
 * the texture is on screen and stop entirely with prefers-reduced-motion.
 */
export function Texture({ variant, className, style }: TextureProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.playing = entry?.isIntersecting ? 'true' : 'false';
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`${styles.texture} ${styles[variant]} ${className ?? ''}`}
      style={style}
      data-playing="false"
    />
  );
}
