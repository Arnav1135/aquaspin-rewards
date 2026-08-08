import { LevelGenerator } from '../core/LevelGenerator';

self.onmessage = (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  if (type === 'GENERATE') {
    const { targetDifficulty, colorCount, tubeCount, tubeCapacity, seedString } = payload;
    try {
      const levelDef = LevelGenerator.generate(targetDifficulty, colorCount, tubeCount, tubeCapacity, seedString);
      self.postMessage({ id, type: 'GENERATE_SUCCESS', payload: levelDef });
    } catch (err: any) {
      self.postMessage({ id, type: 'GENERATE_ERROR', error: err.message });
    }
  }
};
