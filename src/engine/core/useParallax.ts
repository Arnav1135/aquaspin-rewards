// src/engine/core/useParallax.ts
import { useEffect, useRef } from 'react';
import { parallax } from './PerspectiveProvider';

export function useParallax<T extends HTMLElement>(depth: number) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      parallax.register(ref.current, depth);
    }
    return () => {
      if (ref.current) {
        parallax.unregister(ref.current);
      }
    };
  }, [depth]);

  return ref;
}
