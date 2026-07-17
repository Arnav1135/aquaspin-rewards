// src/components/layout/ViewTransitionWrapper.tsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function ViewTransitionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevLocation = useRef(location.pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (prevLocation.current !== location.pathname) {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          // React Router handles DOM mutation
        });
      }
      prevLocation.current = location.pathname;
    }
  }, [location]);

  return <div ref={containerRef} className="contents">{children}</div>;
}
