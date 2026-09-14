import { useEffect, useRef, useCallback } from 'react';

/**
 * A safe timeout hook that automatically clears any pending timeouts
 * when the component unmounts. This prevents memory leaks and state updates
 * on unmounted components (which is especially critical in betting games
 * where payouts or outcome reveals happen after delays).
 */
export function useSafeTimeout() {
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeouts.current.push(id);
    return id;
  }, []);

  const clearSafeTimeouts = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  useEffect(() => {
    return clearSafeTimeouts;
  }, [clearSafeTimeouts]);

  return { setSafeTimeout, clearSafeTimeouts };
}
