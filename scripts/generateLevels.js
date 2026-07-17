// AUTO-GENERATED — run: node scripts/generateLevels.js
// DO NOT EDIT MANUALLY
// 150 levels across 10 worlds (15 levels each)

function generateLevel(id) {
  const difficulty = Math.floor((id - 1) / 5); // 0-29 across 150 levels
  const tier = Math.floor((id - 1) / 15);      // 0-9 across 150 levels

  const baseMoves     = Math.max(10, 25 + tier * 3 - Math.floor(difficulty * 0.4));
  const baseColors    = Math.min(6, 4 + Math.floor(id / 40));
  const baseScore1    = 3000  + id * 600;
  const baseScore2    = 8000  + id * 1200;
  const baseScore3    = 16000 + id * 2400;

  let objective;
  const objType = id <= 10  ? 'score'
    : id <= 35  ? (id % 3 === 0 ? 'jelly'      : 'score')
    : id <= 60  ? (id % 2 === 0 ? 'ingredient' : 'jelly')
    : id <= 90  ? (id % 3 === 0 ? 'order'      : id % 3 === 1 ? 'jelly' : 'score')
    : id <= 120 ? (id % 2 === 0 ? 'order'      : 'jelly')
    : 'order'; 

  if (objType === 'score') {
    objective = [{ type: 'score', target: baseScore1 }];
  } else if (objType === 'jelly') {
    objective = [{ type: 'jelly', target: 0 }];
    if (id > 90) objective.push({ type: 'score', target: Math.floor(baseScore1 * 0.6) });
  } else if (objType === 'ingredient') {
    objective = [{ type: 'ingredient', target: 2 + Math.floor(id / 20) }];
    if (id > 60) objective.push({ type: 'jelly', target: 0 });
  } else {
    const orderTarget = 8 + Math.floor(difficulty * 1.5);
    const orderColors = id > 120
      ? ['red','blue','green','yellow']
      : id > 90
      ? ['red','blue','green']
      : ['red','blue'];
    objective = orderColors.map(color => ({ type: 'order', color, target: orderTarget }));
    if (id > 120) objective.push({ type: 'score', target: Math.floor(baseScore1 * 0.5) });
  }

  const jelly = [];
  const doubleJelly = [];
  if (objType === 'jelly' || (Array.isArray(objective) && objective.some(o => o.type === 'jelly'))) {
    const count = Math.min(40, 6 + Math.floor(difficulty * 2));
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      const key = `${c},${r}`;
      if (!jelly.includes(key)) jelly.push(key);
    }
    if (id > 20) {
      const doubleCount = Math.floor(jelly.length * Math.min(0.6, (id - 20) / 100));
      jelly.slice(0, doubleCount).forEach(k => doubleJelly.push(k));
    }
  }

  const holes = [];
  if (id > 15) {
    const holePatterns = [
      ['0,0','0,8','8,0','8,8'],
      ['0,0','0,1','1,0','0,7','0,8','1,8','7,0','8,0','7,8','8,8'],
      ['4,0','4,1','4,7','4,8'],
      ['0,4','1,4','7,4','8,4'],
      ['0,0','1,0','2,0','0,8','1,8','2,8','6,0','7,0','8,0','6,8','7,8','8,8'],
      ['3,0','4,0','5,0','3,8','4,8','5,8'],
      ['0,3','0,4','0,5','8,3','8,4','8,5','3,0','4,0','5,0','3,8','4,8','5,8'],
    ];
    const pattern = holePatterns[(id - 16) % holePatterns.length];
    holes.push(...pattern);
  }

  const icing = {};
  if (id > 10) {
    const icingCount = Math.min(16, 2 + Math.floor((id - 10) / 8));
    const icingLayer  = id > 90 ? 3 : id > 45 ? 2 : 1;
    for (let i = 0; i < icingCount; i++) {
      const r = Math.floor(Math.random() * 7) + 1;
      const c = Math.floor(Math.random() * 7) + 1;
      const key = `${c},${r}`;
      icing[key] = icingLayer;
    }
  }

  const levelNames = [
    'Sweet Start','Jelly Land','Icing World','Candy Castle','Sugar Rush',
    'Caramel Coast','Lollipop Lake','Toffee Town','Chocolate Hills','Waffle Woods',
    'Marshmallow Marsh','Fudge Falls','Gumdrop Grove','Taffy Tunnel','Bonbon Bay',
    'Peppermint Plains','Caramel Caves','Nougat Nook','Praline Peak','Sundae Summit',
    'Cotton Candy Cliffs','Jellybean Junction','Truffle Trail','Mochi Mountains','Brownie Basin',
    'Sherbet Shore','Butterscotch Bridge','Cream Puff Cavern','Sorbet Sea','Honeycomb Hills',
    'Macaron Meadow','Trifle Tower','Churro Canyon','Brigadeiro Bluff','Baklava Bay',
    'Pocky Pass','Marzipan Mesa','Profiterole Peak','Biscotti Basin','Halva Heights',
    'Croissant Canyon','Eclair Estate','Cannoli Cove','Tiramisu Trail','Dacquoise Dale',
    'Crème Brûlée Bluff','Kouign-Amann Knoll','Religieuse Ridge','Opera Outcrop','Paris-Brest Pass',
    'Mille-Feuille Mesa','Croquembouche Crest','Saint-Honoré Summit','Financier Falls','Petit-Four Peak',
    'Madeline Manor','Galette Gorge','Clafoutis Cove','Gateau Gulch','Savarin Swamp',
    'Licorice Labyrinth','Anise Arch','Fennel Falls','Sambuca Springs','Ouzo Outpost',
    'Absinthe Alley','Tamarind Trail','Salmiak Shore','Pontefract Plateau','Black Jack Bluff',
    'Twizzler Tunnel','Red Vine Ridge','Whips & Waves','Lace Lagoon','Candy Rope Rapids',
    'Cocoa Crater','Truffle Tornado','Ganache Gorge','Praline Plateau','Valrhona Valley',
    'Gianduja Gulch','Mendiants Mesa','Rocher Ridge','Ferrero Falls','Callebaut Cove',
    'Criollo Cliffs','Forastero Flats','Trinitario Trail','Dark Dungeon','Milk Maze',
    'Rainbow Rush','Prism Peak','Spectrum Spire','Vivid Vortex','Chromatic Chasm',
    'Hue Hurricane','Tint Typhoon','Shade Surge','Tone Tidal','Pigment Pass',
    'Dye Delta','Colour Cascade','Palette Plunge','Saturation Swamp','Luminance Lagoon',
    'Frost Frontier','Glacial Gorge','Blizzard Basin','Sleet Summit','Snowdrift Shore',
    'Ice Crystal Cove','Avalanche Alley','Permafrost Pass','Arctic Arch','Polar Peak',
    'Tundra Tunnel','Aurora Abyss','Iceberg Isle','Hypothermia Heights','Freeze Frame Falls',
    'Volcano Valley','Magma Mesa','Lava Lagoon','Cinder Cove','Ember Expanse',
    'Inferno Island','Scorched Summit','Blaze Basin','Furnace Falls','Caldera Canyon',
    'Pyroclastic Peak','Obsidian Outcrop','Tephra Trail','Ashfall Arch','Igneous Inlet',
    'Crystal Kingdom','Diamond Domain','Sapphire Spire','Ruby Ridge','Emerald Estate',
    'Amethyst Arch','Topaz Tower','Opal Ocean','Garnet Gulch','Onyx Outpost',
    'Tourmaline Trail','Jade Junction','Malachite Maze','Lapis Labyrinth','Ultimate Apex',
  ];

  return {
    id,
    name: levelNames[id - 1] || `Level ${id}`,
    world: Math.ceil(id / 15),                         // 1–10
    moves: Math.max(10, baseMoves - Math.floor(difficulty * 0.8)),
    rows: 9, cols: 9,
    maxColors: baseColors,
    candyTypes: ['red','orange','yellow','green','blue','purple'].slice(0, baseColors),
    holes,
    icing,
    jelly,
    doubleJelly,
    objectives: objective,
    starThresholds: [baseScore1, baseScore2, baseScore3],
    hasChocolate:   id > 50,
    chocolateStart: id > 50
      ? id > 100 ? ['2,2','6,6','4,4'] : id > 75 ? ['4,4','2,6'] : ['4,4']
      : [],
    licorice: id > 60
      ? Array.from({ length: Math.min(6, Math.floor((id - 60) / 10)) }, (_, i) =>
          `${(i * 2) % 9},${Math.floor(i / 3) * 3 + 1}`)
      : [],
    ingredients: ['ingredient'].includes(objType) || (Array.isArray(objective) && objective.some(o => o.type === 'ingredient'))
      ? [
          { col: 4, type: 'cherry' },
          ...(id > 50 ? [{ col: 2, type: 'hazelnut' }] : []),
          ...(id > 100 ? [{ col: 7, type: 'cherry' }] : []),
        ]
      : [],
    portals: id > 35 && id % 7 === 0
      ? id > 85
        ? [
            { inRow: 0, inCol: 0, outRow: 8, outCol: 8 },
            { inRow: 0, inCol: 8, outRow: 8, outCol: 0 },
          ]
        : [{ inRow: 0, inCol: 0, outRow: 8, outCol: 8 }]
      : [],
  };
}

const levels = Array.from({ length: 150 }, (_, i) => generateLevel(i + 1));

const output = `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// 150 levels across 10 worlds (15 levels each)

export const LEVELS = ${JSON.stringify(levels, null, 2)};

export function getLevel(id) {
  return LEVELS.find(l => l.id === id) || null;
}

export function getLevelsInWorld(world) {
  return LEVELS.filter(l => l.world === world);
}

export const TOTAL_LEVELS = 150;
export const TOTAL_WORLDS = 10;
`;

import { writeFileSync } from 'fs';
writeFileSync('./public/candy-crunch/src/data/levels.js', output);
console.log('✅ Generated 150 levels across 10 worlds → public/candy-crunch/src/data/levels.js');
