export type CandyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';

export type CandyShape = 'fish' | 'jelly-bean' | 'lozenge' | 'teardrop' | 'square' | 'circle' | 'cluster';

export type SpecialType =
  | 'none'
  | 'striped-h'
  | 'striped-v'
  | 'wrapped'
  | 'color-bomb'
  | 'jelly-fish'
  | 'coconut-wheel'
  | 'lucky-candy'
  | 'galaxy'
  | 'rainbow-bomb'
  | 'lightning';

export type BlockerType =
  | 'none'
  | 'frosting-1'
  | 'frosting-2'
  | 'frosting-3'
  | 'chocolate'
  | 'licorice-swirl'
  | 'marmalade'
  | 'licorice-lock'
  | 'candy-cane-fence';

export type IngredientType = 'none' | 'cherry' | 'hazelnut';

export type ObjectiveType = 'score' | 'jelly' | 'ingredients' | 'orders';

export interface TileData {
  id: string;
  row: number;
  col: number;
  color: CandyColor;
  shape: CandyShape;
  special: SpecialType;
  blocker: BlockerType;
  jellyLayers: number; // 0 = none, 1 = single jelly, 2 = double jelly
  ingredient: IngredientType;
  isWrappedCellophane?: boolean; // Fish/Candy wrapped in cellophane wrapper
  isMatched?: boolean;
  isFalling?: boolean;
  fallOffset?: number;
  isSelected?: boolean;
  isAiSuggested?: boolean;
}

export interface OrderTarget {
  color?: CandyColor;
  special?: SpecialType;
  blocker?: BlockerType;
  ingredient?: IngredientType;
  required: number;
  current: number;
}

export interface LevelConfig {
  levelNumber: number;
  title: string;
  description: string;
  rows: number;
  cols: number;
  moves: number;
  targetScore: number;
  objectiveType: ObjectiveType;
  jellyMap?: number[][];
  blockerMap?: BlockerType[][];
  ingredientCount?: number;
  orderTargets?: OrderTarget[];
  colorsAvailable: CandyColor[];
  aiTips?: string;
  gravityDir?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  portals?: { from: {r: number, c: number}, to: {r: number, c: number} }[];
}

export type BoosterType =
  | 'lollipop-hammer'
  | 'hand-switch'
  | 'extra-moves'
  | 'ufo'
  | 'party-booster';

export interface AiMoveAdvice {
  recommendedSwap: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
  };
  explanation: string;
  comboForecast: string;
  strategicRating: number;
  suggestedBooster?: BoosterType | null;
}

export interface AiCommentary {
  phrase: string;
  excitementLevel: 'sweet' | 'tasty' | 'delicious' | 'divine' | 'sugar_crush';
  shoutout: string;
}

export interface LevelValidationResult {
  isValid: boolean;
  issues: string[];
  initialLegalMoves: number;
  config: LevelConfig;
}


