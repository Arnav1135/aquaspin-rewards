import { EventBus } from '../RulesEngine';
import { TileData } from '../../../types';
import { SpecialComboCinematics } from '../../../rendering/managers/SpecialComboCinematics';

export class SpecialInteractionRegistry {
  constructor(private eventBus: any, private cinematics: any) {}
  public hasInteraction(typeA: string, typeB: string): boolean { return true; }
  public async executeInteraction(...args: any[]) {}
}
export const interactionRegistry = new SpecialInteractionRegistry(null, null);
