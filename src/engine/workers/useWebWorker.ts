import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkerMessage, WorkerResponse } from './heavy-task.worker';

export function useWebWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the worker. Vite natively supports this syntax.
    workerRef.current = new Worker(new URL('./heavy-task.worker', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      setIsProcessing(false);
      if (e.data.error) {
        setError(e.data.error);
        console.error('Worker Error:', e.data.error);
      } else {
        setLastResult(e.data.result);
      }
    };

    workerRef.current.onerror = (err) => {
      setIsProcessing(false);
      setError(err.message);
      console.error('Worker Runtime Error:', err);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const postMessage = useCallback((message: WorkerMessage) => {
    if (!workerRef.current) return;
    setIsProcessing(true);
    setError(null);
    workerRef.current.postMessage(message);
  }, []);

  return { postMessage, isProcessing, lastResult, error };
}
