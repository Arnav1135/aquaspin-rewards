// src/engine/core/ObjectPoolManager.ts

export interface Poolable {
  reset?: () => void;
  active?: boolean;
}

export class ObjectPool<T extends Poolable> {
  private freeList: T[] = [];
  private activeList: Set<T> = new Set();
  private factory: () => T;
  private maxCapacity: number;

  constructor(factory: () => T, initialSize: number = 20, maxCapacity: number = 500) {
    this.factory = factory;
    this.maxCapacity = maxCapacity;

    for (let i = 0; i < initialSize; i++) {
      this.freeList.push(this.factory());
    }
  }

  public acquire(): T {
    let item: T;
    if (this.freeList.length > 0) {
      item = this.freeList.pop()!;
    } else {
      item = this.factory();
    }

    if (item.reset) {
      item.reset();
    }
    item.active = true;
    this.activeList.add(item);
    return item;
  }

  public release(item: T) {
    if (!this.activeList.has(item)) return;

    item.active = false;
    this.activeList.delete(item);

    if (this.freeList.length < this.maxCapacity) {
      this.freeList.push(item);
    }
  }

  public clear() {
    this.freeList = [];
    this.activeList.clear();
  }

  public getActiveCount(): number {
    return this.activeList.size;
  }

  public getFreeCount(): number {
    return this.freeList.length;
  }
}
