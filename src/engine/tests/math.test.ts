// src/engine/tests/math.test.ts
import { ObjectPool } from '../core/ObjectPoolManager';
import { SaveSystem } from '../storage/SaveSystem';

export function runEngineTests() {
  // Test ObjectPool
  const pool = new ObjectPool(() => ({ val: 0, active: false }), 5);
  if (pool.getFreeCount() !== 5) throw new Error('ObjectPool initial count failed');

  const item = pool.acquire();
  if (!item.active || pool.getActiveCount() !== 1) throw new Error('ObjectPool acquire failed');

  pool.release(item);
  if (item.active || pool.getActiveCount() !== 0) throw new Error('ObjectPool release failed');

  // Test SaveSystem
  const testData = { score: 100, level: 3 };
  if (!SaveSystem.save('test_game', testData)) throw new Error('SaveSystem save failed');

  const loaded = SaveSystem.load<typeof testData>('test_game');
  if (loaded?.score !== 100 || loaded?.level !== 3) throw new Error('SaveSystem load failed');

  return true;
}
