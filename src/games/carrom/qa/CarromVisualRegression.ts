import * as THREE from 'three';

export class CarromVisualRegression {
  private static snapshots: Map<string, string> = new Map();

  static captureSnapshot(name: string, renderer: THREE.WebGLRenderer): string {
    const dataUrl = renderer.domElement.toDataURL('image/png');
    this.snapshots.set(name, dataUrl);
    console.log(`[VisualRegression] Captured: ${name}`);
    return dataUrl;
  }

  static compareSnapshot(name: string, renderer: THREE.WebGLRenderer): { match: boolean; diff: number } {
    const current = renderer.domElement.toDataURL('image/png');
    const previous = this.snapshots.get(name);
    if (!previous) {
      this.snapshots.set(name, current);
      return { match: true, diff: 0 };
    }
    // Simple string comparison (real impl would use pixel diff)
    const match = current === previous;
    return { match, diff: match ? 0 : 1 };
  }

  static getSnapshotNames(): string[] {
    return Array.from(this.snapshots.keys());
  }
}
