import { Orchestrator, AnimationEvent } from './Orchestrator';

export class SoundEngineImpl {
  constructor() {
    Orchestrator.subscribe("animation_event", this.handleAnimationEvent.bind(this));
  }

  private handleAnimationEvent(event: AnimationEvent) {
    // Stub for Web Audio API / Howler
    if (event.animationKey === "match_pop") {
      this.playSound("pop.mp3", 0.5);
    } else if (event.animationKey === "swap") {
      this.playSound("swoosh.mp3", 0.2);
    } else if (event.animationKey === "swap_revert") {
      this.playSound("boing.mp3", 0.3);
    }
  }

  private playSound(key: string, volume: number) {
    // In a real implementation, this would trigger an HTMLAudioElement or Howl instance
    console.log(`[SoundEngine] Playing ${key} at volume ${volume}`);
  }
}

export const SoundEngine = new SoundEngineImpl();
