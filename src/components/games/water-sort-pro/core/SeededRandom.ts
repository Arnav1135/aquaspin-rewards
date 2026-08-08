export class SeededRandom {
  private seed: number;

  constructor(seedString: string | number) {
    if (typeof seedString === 'string') {
      let hash = 0;
      for (let i = 0; i < seedString.length; i++) {
        const char = seedString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      this.seed = Math.abs(hash);
    } else {
      this.seed = seedString;
    }
  }

  // Simple LCG (Linear Congruential Generator)
  public nextFloat(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min) + min);
  }

  public chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  public pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    return array[this.nextInt(0, array.length)];
  }

  public shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
