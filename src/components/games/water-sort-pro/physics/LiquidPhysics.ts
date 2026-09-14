import { Container, Ticker } from 'pixi.js';
import { LiquidFilter } from '../shaders/LiquidFilter';
import { LiquidGraphics } from '../graphics/LiquidGraphics';

/**
 * Visual liquid-motion helper.
 * Applies the AAA LiquidFilter to the liquid container and updates time/pouring state.
 */
export class LiquidPhysics {
  static applyWaveEffect(container: Container, ticker: Ticker) {
    const filter = new LiquidFilter();
    container.filters = [filter];
    
    // Animate the filter
    const updatePhysics = (ticker: Ticker) => {
      filter.updateTime(ticker.deltaTime);
      
      if (container instanceof LiquidGraphics) {
        // Assume pouring if volume is animating (fractional) or surface is rippling
        const isPouring = Math.abs(container.surfaceRipple) > 0.01 || (container.animatedVolume !== Math.round(container.animatedVolume));
        filter.setPouring(isPouring);
      }
    };
    
    ticker.add(updatePhysics);
    
    // Clean up on destroy
    container.on('destroyed', () => {
      ticker.remove(updatePhysics);
      filter.destroy();
    });
  }
}

