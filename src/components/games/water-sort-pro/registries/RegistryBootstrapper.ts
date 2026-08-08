import { VesselRegistry, VesselDefinition, VesselShapeType } from './VesselRegistry';
import { BackgroundRegistry } from './BackgroundRegistry';
import { LayoutPatternRegistry, LayoutPattern } from './LayoutPatternRegistry';

export class RegistryBootstrapper {
  public static bootstrap() {
    this.generateVessels();
    this.generateSpecialContainers();
    this.generateThemes();
    this.generateLayoutPatterns();
  }

  private static generateVessels() {
    const vesselNames = [
      'Laboratory Flask', 'Crystal Vessel', 'Potion Bottle', 'Round Glass Jar',
      'Tall Glass Bottle', 'Short Glass Bottle', 'Decorative Vase', 'Wide Glass Vessel',
      'Narrow Glass Vessel', 'Fantasy Vessel', 'Premium Crystal Flask', 'Sculpted Glass Container'
    ];

    vesselNames.forEach((name, i) => {
      const type: VesselShapeType = i % 2 === 0 ? 'bottle' : 'vase';
      VesselRegistry.register({
        id: name.toLowerCase().replace(/ /g, '_'),
        name: name,
        shapeType: type,
        logicalWidth: 60 + (i % 3) * 10,
        logicalHeight: 200 + (i % 4) * 20,
        capacityMultiplier: 1.0,
        drawGlass: (g, w, h, thickness, color, opacity) => {
          const r = w / 2;
          g.roundRect(0, 0, w, h, r);
          g.fill({ color, alpha: opacity * 0.3 });
          g.stroke({ width: thickness, color, alpha: opacity });
        },
        drawMask: (g, w, h) => {
          const r = w / 2;
          g.roundRect(2, 2, w - 4, h - 4, r - 2);
        }
      });
    });
  }

  private static generateSpecialContainers() {
    const specialNames = [
      'Puppy', 'Strawberry', 'Car', 'Aeroplane', 'Star', 'Moon', 'Cloud', 'Diamond', 
      'Crown', 'Butterfly', 'Fish', 'Cat', 'Dog', 'Bear', 'Rocket', 'House', 'Tree', 
      'Flower', 'Apple', 'Watermelon', 'Pineapple', 'Lemon', 'Ice Cream', 'Cup', 
      'Treasure Chest', 'Shield', 'Gem', 'Planet', 'Sun', 'Balloon', 'Gift', 'Bell', 
      'Mushroom', 'Leaf', 'Lightning', 'Rainbow', 'Castle', 'Boat', 'Train', 'Helicopter', 
      'Bus', 'Motorcycle', 'Dinosaur', 'Unicorn', 'Game Controller', 'Camera', 'Music Note', 
      'Key', 'Puzzle Piece'
    ];

    specialNames.forEach((name, i) => {
      VesselRegistry.register({
        id: name.toLowerCase().replace(/ /g, '_'),
        name: name,
        shapeType: 'special',
        logicalWidth: 100 + (i % 5) * 10,
        logicalHeight: 100 + (i % 5) * 10,
        capacityMultiplier: 1.5,
        drawGlass: (g, w, h, thickness, color, opacity) => {
          g.drawCircle(w/2, h/2, w/2);
          g.fill({ color, alpha: opacity * 0.3 });
          g.stroke({ width: thickness, color, alpha: opacity });
        },
        drawMask: (g, w, h) => {
          g.drawCircle(w/2, h/2, w/2 - 2);
        }
      });
    });
  }

  private static generateThemes() {
    const themeNames = [
      'Magical Forest', 'Aurora', 'Galaxy', 'Nebula', 'Sunset', 'Moonlit Night', 
      'Crystal Cave', 'Enchanted Garden', 'Fantasy Castle', 'Underwater Palace', 
      'Neon City', 'Candy World', 'Ice World', 'Desert Sunset', 'Rainforest', 
      'Cloud Kingdom', 'Space Station', 'Mystic Valley', 'Waterfall', 'Coral Reef', 
      'Moon Garden', 'Dream World', 'Cosmic Purple', 'Emerald Forest', 'Golden Temple', 
      'Arctic', 'Firefly Forest', 'Rainbow Sky', 'Cyberpunk', 'Volcano'
    ];

    themeNames.forEach((name, i) => {
      const hue = (i * 12) % 360;
      BackgroundRegistry.register(name.toLowerCase().replace(/ /g, '_'), {
        backgroundColor: Number(`0x${Math.floor(Math.random() * 0xFFFFFF).toString(16)}`),
        ambientLightColor: Number(`0x${Math.floor(Math.random() * 0xFFFFFF).toString(16)}`),
        particleColors: [0xFFFFFF, 0xEEEEEE]
      });
    });
  }

  private static generateLayoutPatterns() {
    const layoutNames = [
      'circle', 'spiral', 'diamond', 'pyramid', 'inverted_pyramid', 'cross', 'X', 'star', 
      'ring', 'wave', 'staircase', 'fan', 'arc', 'butterfly', 'flower', 'crown', 'rocket', 
      'vehicle', 'animal', 'symmetrical', 'asymmetrical', 'nested', 'concentric', 'multi_cluster'
    ];

    // Generate up to 50 patterns by adding variants
    for (let i = 0; i < 50; i++) {
      const baseName = layoutNames[i % layoutNames.length];
      const variant = Math.floor(i / layoutNames.length);
      const name = variant > 0 ? `${baseName}_v${variant}` : baseName;
      
      LayoutPatternRegistry.register({
        id: name,
        name: name.replace(/_/g, ' '),
        getPositions: (numTubes: number, tubeWidth: number, tubeHeight: number, gap: number) => {
          const positions: {x: number, y: number}[] = [];
          const cols = Math.ceil(Math.sqrt(numTubes));
          const rows = Math.ceil(numTubes / cols);
          const gapX = tubeWidth + gap;
          const gapY = tubeHeight * 1.2;
          
          const startX = -((cols - 1) * gapX) / 2;
          const startY = -((rows - 1) * gapY) / 2;

          for (let j = 0; j < numTubes; j++) {
            const r = Math.floor(j / cols);
            const c = j % cols;
            positions.push({
              x: startX + c * gapX,
              y: startY + r * gapY
            });
          }
          return positions;
        }
      });
    }
  }
}
