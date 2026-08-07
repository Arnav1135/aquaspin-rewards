export type WorkerMessage = {
  type: string;
  payload?: any;
};

export type WorkerResponse = {
  type: string;
  result?: any;
  error?: string;
};

// Generic worker script for offloading heavy tasks
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'MATH_CALCULATION': {
        // Example: intensive loop
        let result = 0;
        for (let i = 0; i < payload.iterations; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }
        self.postMessage({ type: 'MATH_CALCULATION_SUCCESS', result });
        break;
      }
      
      case 'PHYSICS_SIMULATION': {
        // Placeholder for offloaded physics step calculation
        self.postMessage({ type: 'PHYSICS_SIMULATION_SUCCESS', result: { state: 'updated' } });
        break;
      }

      default:
        self.postMessage({ type: 'UNKNOWN_TYPE', error: 'Unknown worker message type' });
    }
  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err.message });
  }
};
