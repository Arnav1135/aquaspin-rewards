export type Difficulty = 'low' | 'medium' | 'high';
export type Rows = 8 | 9 | 10 | 11 | 12 | 13 | 14;

export const PLINKO_TABLES: Record<Difficulty, Record<number, number[] | null>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    9:  [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    11: [8.4, 3.0, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3.0, 8.4],
    12: [10,  3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    13: [8.1, 4.0, 3.0, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3.0, 4.0, 8.1],
    14: [7.1, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 7.1]
  },
  medium: {
    8:  [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    9:  [18, 4.0, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4.0, 18],
    10: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
    11: [24, 6.0, 3.0, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3.0, 6.0, 24],
    12: [33, 11,  4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    13: [43, 13,  6.0, 3.0, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3.0, 6.0, 13, 43],
    14: [58, 15,  7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58]
  },
  high: {
    8:  [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    9:  [43, 7.0, 2.0, 0.6, 0.2, 0.2, 0.6, 2.0, 7.0, 43],
    10: [76, 10,  3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
    11: [120,14,  5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    12: [170,24,  8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
    13: [260,37,  11,  4.0, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 4.0, 11, 37, 260],
    14: null
  }
};

export const HOUSE_EDGE_TARGETS: Record<Difficulty, number> = {
  low: 0.99,   // ~1% edge -> sum = 0.99
  medium: 0.98, // ~2% edge -> sum = 0.98
  high: 0.965  // ~3.5% edge -> sum = 0.965
};

export function getBinomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 0; i < k; i++) {
    c = c * (n - i) / (i + 1);
  }
  return c;
}

export function getProbability(rows: number, k: number): number {
  return getBinomialCoefficient(rows, k) * Math.pow(0.5, rows);
}

export function verifyBinomialCorrectness(rows: number, multipliers: number[], difficulty: Difficulty): number {
  let sum = 0;
  for (let k = 0; k <= rows; k++) {
    sum += getProbability(rows, k) * multipliers[k];
  }
  const target = HOUSE_EDGE_TARGETS[difficulty];
  if (Math.abs(sum - target) > 0.01) {
    console.warn(`[Plinko] Table verification failed for ${difficulty} ${rows} rows. Expected ~${target}, got ${sum.toFixed(4)}`);
  }
  return sum;
}

function generateRow(rows: number, difficulty: Difficulty): number[] {
  const targetEdge = HOUSE_EDGE_TARGETS[difficulty];
  const half = Math.floor(rows / 2);
  const raw: number[] = new Array(half + 1).fill(0);
  
  const shape = new Array(half + 1).fill(0);
  for (let k = 0; k <= half; k++) {
    const dist = half - k;
    if (difficulty === 'low') {
      shape[k] = Math.pow(dist, 1.5) + 0.5;
    } else if (difficulty === 'medium') {
      shape[k] = Math.pow(dist, 2.2) + 0.2;
    } else {
      shape[k] = Math.pow(dist, 3.5) + 0.1;
    }
  }

  let currentSum = 0;
  for (let k = 0; k <= half; k++) {
    const count = (k === rows / 2) ? 1 : 2; 
    currentSum += shape[k] * count;
  }
  
  const scale = targetEdge / currentSum;
  
  for (let k = 0; k <= half; k++) {
    const rawVal = (shape[k] * scale) / getProbability(rows, k);
    if (rawVal < 10) {
      raw[k] = Number(rawVal.toPrecision(2));
    } else {
      raw[k] = Math.round(rawVal);
    }
  }
  
  const full = new Array(rows + 1).fill(0);
  for (let k = 0; k <= half; k++) {
    full[k] = raw[k];
    full[rows - k] = raw[k];
  }
  
  return full;
}

for (const diff of Object.keys(PLINKO_TABLES) as Difficulty[]) {
  for (let r = 8; r <= 14; r++) {
    if (!PLINKO_TABLES[diff][r]) {
      PLINKO_TABLES[diff][r] = generateRow(r, diff);
    }
    verifyBinomialCorrectness(r, PLINKO_TABLES[diff][r]!, diff);
  }
}

export function getMultiplierTable(difficulty: Difficulty, rows: number): number[] {
  return PLINKO_TABLES[difficulty][rows]!;
}

export interface BucketStyle {
  backgroundColor: string;
  color: string;
  multiplier: number;
}

// Helper to interpolate between colors
function lerpColor(c1: number[], c2: number[], t: number) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

export function generateColors(difficulty: Difficulty, multipliers: number[]): BucketStyle[] {
  const logM = multipliers.map(m => Math.log10(Math.max(m, 0.1)));
  const minLog = Math.min(...logM);
  const maxLog = Math.max(...logM);
  const range = maxLog === minLog ? 1 : maxLog - minLog;

  const palettes = {
    low: ['#7DF9E9', '#5CC9E8', '#3AAEDD', '#2E93D6', '#1E6FC9', '#0D4FA8'],
    medium: ['#C6F24C', '#A0E639', '#6FCB3A', '#4FB33B', '#3B9C3C', '#2E8B33'],
    high: ['#F2A6E8', '#D97BE0', '#C24DD6', '#A02FCB', '#7E1FB8', '#5A159E']
  };

  const colors = palettes[difficulty].map(hexToRgb);

  return multipliers.map((m, i) => {
    const t = 1.0 - ((logM[i] - minLog) / range); // 0 = brightest (edge), 1 = darkest (center)
    
    // Map t to the color array
    const maxIdx = colors.length - 1;
    const scaledT = t * maxIdx;
    const idx1 = Math.floor(scaledT);
    const idx2 = Math.min(maxIdx, idx1 + 1);
    const fraction = scaledT - idx1;
    
    const rgb = lerpColor(colors[idx1], colors[idx2], fraction);
    const bgColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    
    // Text contrast
    const lum = 0.2126 * (rgb[0]/255) + 0.7152 * (rgb[1]/255) + 0.0722 * (rgb[2]/255);
    const textColor = lum > 0.5 ? '#0f172a' : '#ffffff';

    return {
      backgroundColor: bgColor,
      color: textColor,
      multiplier: m
    };
  });
}
