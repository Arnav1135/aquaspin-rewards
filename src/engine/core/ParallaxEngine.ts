// src/engine/core/ParallaxEngine.ts
export class ParallaxEngine {
  private elements: Map<HTMLElement, number> = new Map();
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
  }

  private handleMouseMove = (e: MouseEvent) => {
    this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  public register(el: HTMLElement, depth: number) {
    this.elements.set(el, depth);
  }

  public unregister(el: HTMLElement) {
    this.elements.delete(el);
  }

  public update(deltaTime: number) {
    // Parallax update runs every frame
    const lerpFactor = 1 - Math.pow(0.005, deltaTime);

    this.elements.forEach((depth, el) => {
      // Current transform (assuming custom props set by this engine)
      const currentX = parseFloat(el.style.getPropertyValue('--parallax-x') || '0');
      const currentY = parseFloat(el.style.getPropertyValue('--parallax-y') || '0');

      // Parallax strength multiplier (max 40px movement)
      const targetX = this.mouseX * depth * 40;
      const targetY = this.mouseY * depth * 40;

      const newX = currentX + (targetX - currentX) * lerpFactor;
      const newY = currentY + (targetY - currentY) * lerpFactor;

      el.style.setProperty('--parallax-x', `${newX}px`);
      el.style.setProperty('--parallax-y', `${newY}px`);
      
      // We apply it via a transform class in CSS that uses these vars
    });
  }
}
