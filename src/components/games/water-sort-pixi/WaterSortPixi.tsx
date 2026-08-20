import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import gsap from 'gsap';

// --- GAME LOGIC & GENERATOR ---
const COLORS = [
  0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 
  0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 
  0xA2845E, 0x8E8E93, 0x00FFFF, 0xFF00FF
];
const TUBE_CAP = 4;

function generateLevel(level: number) {
  const numColors = Math.min(level + 2, 8);
  const numTubes = numColors + 2;
  const tubes: number[][] = Array.from({ length: numTubes }, () => []);
  
  // Create all liquid segments
  const segments: number[] = [];
  for (let i = 0; i < numColors; i++) {
    for (let j = 0; j < TUBE_CAP; j++) segments.push(COLORS[i]);
  }
  
  // Shuffle
  for (let i = segments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [segments[i], segments[j]] = [segments[j], segments[i]];
  }
  
  // Distribute
  let idx = 0;
  for (let i = 0; i < numColors; i++) {
    for (let j = 0; j < TUBE_CAP; j++) {
      tubes[i].push(segments[idx++]);
    }
  }
  
  return tubes;
}

// --- AUDIO SYSTEM ---
class AudioController {
  private ctx: AudioContext | null = null;
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSelect() { this.playTone(600, 'sine', 0.1, 0.1); }
  playPour() { this.playTone(300, 'triangle', 0.4, 0.05); }
  playWin() {
    setTimeout(() => this.playTone(400, 'sine', 0.2, 0.1), 0);
    setTimeout(() => this.playTone(600, 'sine', 0.2, 0.1), 150);
    setTimeout(() => this.playTone(800, 'sine', 0.4, 0.1), 300);
  }
}

const audio = new AudioController();

// --- PIXI ENGINE ---
interface Props {
  level: number;
  onWin: () => void;
}

export default function WaterSortPixi({ level, onWin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const stateRef = useRef({
    tubes: [] as number[][],
    selected: -1,
    animating: false,
    won: false
  });

  // Re-init level
  useEffect(() => {
    stateRef.current.tubes = generateLevel(level);
    stateRef.current.selected = -1;
    stateRef.current.animating = false;
    stateRef.current.won = false;
    renderScene();
  }, [level]);

  // Init Pixi
  useEffect(() => {
    if (!containerRef.current) return;
    
    const app = new PIXI.Application({
      resizeTo: containerRef.current,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    
    // Background interaction to deselect
    app.stage.eventMode = 'static';
    app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
    app.stage.on('pointerdown', () => {
      if (stateRef.current.selected !== -1 && !stateRef.current.animating) {
        stateRef.current.selected = -1;
        renderScene();
      }
    });

    renderScene();

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  const handleTubeClick = (index: number) => {
    const s = stateRef.current;
    if (s.animating || s.won) return;
    
    audio.init();

    if (s.selected === -1) {
      if (s.tubes[index].length > 0) {
        s.selected = index;
        audio.playSelect();
        renderScene();
      }
    } else {
      if (s.selected === index) {
        s.selected = -1;
        audio.playSelect();
        renderScene();
      } else {
        // Attempt pour
        const src = s.tubes[s.selected];
        const tgt = s.tubes[index];
        
        if (src.length === 0) {
          s.selected = -1;
          renderScene();
          return;
        }

        const color = src[src.length - 1];
        
        if (tgt.length < TUBE_CAP && (tgt.length === 0 || tgt[tgt.length - 1] === color)) {
          // Calculate pour amount
          let amount = 0;
          for (let i = src.length - 1; i >= 0; i--) {
            if (src[i] === color) amount++;
            else break;
          }
          amount = Math.min(amount, TUBE_CAP - tgt.length);
          
          s.animating = true;
          audio.playPour();
          
          // Animate pour visually (we'll just use GSAP on the re-rendered scene)
          // For simplicity in this short codebase, we do logic update, then render with GSAP
          for (let i = 0; i < amount; i++) {
            src.pop();
            tgt.push(color);
          }
          
          s.selected = -1;
          renderScene(index); // passing index to animate the target filling
          
          setTimeout(() => {
            s.animating = false;
            
            // Check win
            const won = s.tubes.every(t => t.length === 0 || (t.length === TUBE_CAP && t.every(c => c === t[0])));
            if (won) {
              s.won = true;
              audio.playWin();
              setTimeout(() => onWin(), 1500);
            }
          }, 400); // Wait for animation
          
        } else {
          // Invalid pour, just swap selection
          if (tgt.length > 0) {
            s.selected = index;
            audio.playSelect();
            renderScene();
          } else {
            s.selected = -1;
            renderScene();
          }
        }
      }
    }
  };

  const renderScene = (fillTargetIdx?: number) => {
    const app = appRef.current;
    if (!app) return;
    
    app.stage.removeChildren();
    
    const { width, height } = app.screen;
    const s = stateRef.current;
    
    const tubeWidth = Math.min(width * 0.1, 60);
    const tubeHeight = tubeWidth * 3.5;
    const gap = tubeWidth * 0.4;
    
    const columns = Math.ceil(Math.sqrt(s.tubes.length));
    const rows = Math.ceil(s.tubes.length / columns);
    
    const gridW = columns * tubeWidth + (columns - 1) * gap;
    const gridH = rows * tubeHeight + (rows - 1) * gap * 2;
    
    const startX = (width - gridW) / 2;
    const startY = (height - gridH) / 2 + tubeHeight * 0.2; // Offset down a bit
    
    s.tubes.forEach((tube, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = startX + col * (tubeWidth + gap);
      const y = startY + row * (tubeHeight + gap * 2);
      
      const container = new PIXI.Container();
      container.x = x;
      container.y = y;
      
      // Interactions
      container.eventMode = 'static';
      container.cursor = 'pointer';
      container.on('pointerdown', () => handleTubeClick(i));
      
      // Tube Background/Glass
      const glass = new PIXI.Graphics();
      glass.lineStyle(4, 0xFFFFFF, 0.4);
      glass.beginFill(0xFFFFFF, 0.05);
      // Draw U shape
      glass.moveTo(0, 0);
      glass.lineTo(0, tubeHeight - tubeWidth/2);
      glass.arc(tubeWidth/2, tubeHeight - tubeWidth/2, tubeWidth/2, Math.PI, 0, true);
      glass.lineTo(tubeWidth, 0);
      glass.endFill();
      
      // Selection glow
      if (s.selected === i) {
        glass.lineStyle(6, 0xFFFFFF, 0.8);
        glass.drawRoundedRect(-3, -3, tubeWidth+6, tubeHeight+tubeWidth/2+6, tubeWidth/2);
        
        // GSAP bobbing
        gsap.to(container, { y: y - 20, duration: 0.3, ease: 'back.out(1.5)' });
      } else {
        gsap.to(container, { y: y, duration: 0.3, ease: 'power2.out' });
      }
      
      // Liquids
      const liqContainer = new PIXI.Container();
      // Masking liquids to fit inside tube
      const mask = new PIXI.Graphics();
      mask.beginFill(0xFFFFFF);
      mask.drawRoundedRect(2, 2, tubeWidth - 4, tubeHeight + tubeWidth/2 - 4, tubeWidth/2);
      mask.endFill();
      liqContainer.mask = mask;
      container.addChild(mask);
      
      const segmentHeight = (tubeHeight - 10) / TUBE_CAP;
      
      tube.forEach((color, j) => {
        const liq = new PIXI.Graphics();
        liq.beginFill(color);
        liq.drawRect(2, tubeHeight - (j + 1) * segmentHeight, tubeWidth - 4, segmentHeight + 1);
        liq.endFill();
        
        // Top highlight
        const hl = new PIXI.Graphics();
        hl.beginFill(0xFFFFFF, 0.3);
        hl.drawEllipse(tubeWidth/2, tubeHeight - (j + 1) * segmentHeight, (tubeWidth-4)/2, 4);
        hl.endFill();
        liq.addChild(hl);
        
        // Animate newly poured liquid
        if (i === fillTargetIdx && j >= tube.length - 1) { // roughly animating the top segments
          liq.scale.y = 0;
          liq.y = segmentHeight;
          gsap.to(liq.scale, { y: 1, duration: 0.4, ease: 'bounce.out' });
          gsap.to(liq, { y: 0, duration: 0.4, ease: 'bounce.out' });
        }
        
        liqContainer.addChild(liq);
      });
      
      container.addChild(liqContainer);
      container.addChild(glass);
      
      // Add a subtle front reflection
      const reflection = new PIXI.Graphics();
      reflection.beginFill(0xFFFFFF, 0.15);
      reflection.drawRoundedRect(tubeWidth * 0.1, 5, tubeWidth * 0.2, tubeHeight - 10, 5);
      reflection.endFill();
      container.addChild(reflection);

      app.stage.addChild(container);
    });
  };

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {/* HTML overlay elements can go here if needed */}
    </div>
  );
}
