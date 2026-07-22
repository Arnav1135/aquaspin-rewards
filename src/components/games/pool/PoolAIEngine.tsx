import { useFrame } from '@react-three/fiber';
import { usePoolStore } from './store';
import { useState } from 'react';

export function PoolAIEngine() {
  const phase = usePoolStore((state) => state.phase);
  const setPhase = usePoolStore((state) => state.setPhase);
  const ballsPocketed = usePoolStore((state) => state.ballsPocketed);

  // We keep a simple timer to reset the phase from shooting back to aiming.
  // In a real robust implementation we'd subscribe to all ball velocities,
  // but as a simplified "watchdog", we can use a timeout or basic heuristic.
  const [shootTimer, setShootTimer] = useState(0);

  useFrame((_, delta) => {
    if (phase === 'shooting') {
      setShootTimer((t) => t + delta);
      // Wait at least 3 seconds, then assume balls have stopped for this simplified version.
      // Alternatively, we could check if everything is asleep.
      if (shootTimer > 4.0) {
        setPhase('aiming');
        setShootTimer(0);
        
        // Win condition check
        if (ballsPocketed.length >= 15) {
          setPhase('win');
        }
      }
    }
  });

  return null;
}
