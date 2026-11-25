import { useEffect, useRef, useState, type ReactNode } from 'react';

type FitScaleProps = {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
};

/** Scales a fixed-size composition (authored at Figma size) down to fit its container's width. */
export function FitScale({ width, height, children, className }: FitScaleProps) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = outer.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outer} className={className} style={{ width: '100%', maxWidth: width, height: height * scale }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}
