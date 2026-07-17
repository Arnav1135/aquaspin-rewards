// src/engine/core/VelocityTracker.ts

interface VelocityState {
  vx: number;
  vy: number;
  scaleX: number;
  scaleY: number;
}

export const VelocityTracker = new WeakMap<Element, VelocityState>();

export function getVelocity(el: Element): VelocityState {
  if (!VelocityTracker.has(el)) {
    VelocityTracker.set(el, { vx: 0, vy: 0, scaleX: 0, scaleY: 0 });
  }
  return VelocityTracker.get(el)!;
}

export function updateVelocity(el: Element, state: Partial<VelocityState>) {
  const current = getVelocity(el);
  VelocityTracker.set(el, { ...current, ...state });
}
