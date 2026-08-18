import { SpecialType, CandyColor } from '../../types';

export interface SpecialCombinationContext {
  board: any[][];
  r1: number;
  c1: number;
  s1: SpecialType;
  cColor1: CandyColor;
  r2: number;
  c2: number;
  s2: SpecialType;
  cColor2: CandyColor;
}

export type SpecialCombinationHandler = (context: SpecialCombinationContext) => boolean;

export class SpecialInteractionRegistry {
  private handlers: Map<string, SpecialCombinationHandler> = new Map();

  private getHash(s1: SpecialType, s2: SpecialType): string {
    const arr = [s1, s2].sort();
    return `${arr[0]}_PLUS_${arr[1]}`;
  }

  public register(s1: SpecialType, s2: SpecialType, handler: SpecialCombinationHandler) {
    const hash = this.getHash(s1, s2);
    this.handlers.set(hash, handler);
  }

  public hasHandler(s1: SpecialType, s2: SpecialType): boolean {
    return this.handlers.has(this.getHash(s1, s2));
  }

  public execute(context: SpecialCombinationContext): boolean {
    const hash = this.getHash(context.s1, context.s2);
    const handler = this.handlers.get(hash);
    if (handler) {
      return handler(context);
    }
    return false;
  }
}

export const specialInteractionRegistry = new SpecialInteractionRegistry();
