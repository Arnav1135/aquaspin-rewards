import { useEffect } from 'react';
import * as THREE from 'three';
import { useAnimations } from '@react-three/drei';

/**
 * Phase 2 - Step 2: Animation System
 * Wrapper around drei's useAnimations providing a clean state machine with crossfading.
 */
export function useGameAnimation(
  animations: THREE.AnimationClip[],
  ref: React.MutableRefObject<THREE.Object3D | null | undefined>,
  currentState: string,
  fadeDuration: number = 0.2
) {
  const { actions } = useAnimations(animations, ref);

  useEffect(() => {
    if (!actions || !actions[currentState]) return;

    // Reset, fade in, and play the new animation
    const currentAction = actions[currentState];
    currentAction.reset().fadeIn(fadeDuration).play();

    // Crossfade out all other playing animations
    return () => {
      currentAction.fadeOut(fadeDuration);
    };
  }, [actions, currentState, fadeDuration]);

  return actions;
}
