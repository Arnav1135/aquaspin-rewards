import { MechanicDefinition } from './interfaces';

export class MechanicRegistry {
  private mechanics: Map<string, MechanicDefinition> = new Map();

  public register(mechanic: MechanicDefinition) {
    if (this.mechanics.has(mechanic.id)) {
      console.warn(`Mechanic ${mechanic.id} is already registered. Overwriting.`);
    }
    this.mechanics.set(mechanic.id, mechanic);
  }

  public get(id: string): MechanicDefinition | undefined {
    return this.mechanics.get(id);
  }

  public getAll(): MechanicDefinition[] {
    return Array.from(this.mechanics.values());
  }

  public getByCategory(category: string): MechanicDefinition[] {
    return this.getAll().filter(m => m.category.includes(category as any));
  }
}

// Global singleton instance for the engine
export const mechanicRegistry = new MechanicRegistry();
