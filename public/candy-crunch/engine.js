/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           CANDY CRUNCH — INTELLIGENT 4D GAME ENGINE v2.0               ║
 * ║  Autonomous AI Level Generator · Fluid Physics · Premium Graphics       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 *  Architecture:
 *   ┌─ AILevelEngine      — generates each level based on player performance
 *   ├─ CandyRenderer      — draws high-fidelity 4D SVG candy graphics
 *   ├─ PhysicsEngine      — spring-based positional tweening + gravity
 *   ├─ ParticleSystem     — burst/sparkle/confetti effects on canvas
 *   ├─ MatchEngine        — detects all match types (3,4,5,T,L,combo)
 *   ├─ SpecialEngine      — handles all special candy combinations
 *   ├─ AnimationQueue     — serialises async animation chains
 *   └─ GameController     — orchestrates everything
 */

'use strict';

window.addEventListener('DOMContentLoaded', () => {

/* ═══════════════════════════════════════════════════════════════
   §1  CONSTANTS
═══════════════════════════════════════════════════════════════ */
const COLORS = ['red','orange','yellow','green','blue','purple'];

const COLOR_PALETTE = {
  red:    { primary:'#ff2233', mid:'#cc0011', dark:'#7a0008', light:'#ff9999', glow:'rgba(255,30,60,0.8)' },
  orange: { primary:'#ff7700', mid:'#dd5500', dark:'#883300', light:'#ffcc88', glow:'rgba(255,120,0,0.8)' },
  yellow: { primary:'#ffdd00', mid:'#d4aa00', dark:'#886600', light:'#fff099', glow:'rgba(255,220,0,0.8)' },
  green:  { primary:'#22cc44', mid:'#009922', dark:'#005511', light:'#aaffbb', glow:'rgba(30,200,60,0.8)'  },
  blue:   { primary:'#0099ff', mid:'#0066cc', dark:'#003380', light:'#99ddff', glow:'rgba(0,150,255,0.8)' },
  purple: { primary:'#cc22ff', mid:'#8800cc', dark:'#440066', light:'#ee99ff', glow:'rgba(180,0,255,0.8)' },
};

const CELL_TYPES  = { NORMAL:'normal', BLOCKER:'blocker', EMPTY:'empty' };
const CANDY_TYPES = { NORMAL:'normal', STRIPE_H:'stripe_h', STRIPE_V:'stripe_v',
                      WRAPPED:'wrapped', BOMB:'bomb', FISH:'fish', TIMER:'timer' };

const ANIM = {
  SWAP:     220,  // ms
  REVERT:   200,
  CLEAR:    350,
  FALL:     260,
  SPAWN:    300,
  SPECIAL:  180,
  CASCADE:  80,   // delay between cascades
};

const BLOCKER_TYPES = { FROSTING:'frosting', CHOCOLATE:'chocolate', LICORICE:'licorice' };

/* ═══════════════════════════════════════════════════════════════
   §2  AI LEVEL ENGINE
═══════════════════════════════════════════════════════════════ */
class AILevelEngine {
  constructor() {
    this.playerHistory = [];        // {level, score, moves_used, time_ms, cascades}
    this.learningRate  = 0.25;
  }

  /**
   * recordResult — call when a level is completed.
   */
  recordResult(data) {
    this.playerHistory.push(data);
    // Keep last 10 entries for rolling average
    if (this.playerHistory.length > 10) this.playerHistory.shift();
  }

  /** Computes a skill score 0-1 based on recent history */
  _skillScore() {
    if (this.playerHistory.length === 0) return 0.5;
    const recent = this.playerHistory.slice(-5);
    const avgMoveEff = recent.reduce((s, r) => s + (r.moves_used / r.moves_total), 0) / recent.length;
    const avgCascade = recent.reduce((s, r) => s + Math.min(r.cascades / 10, 1), 0) / recent.length;
    return Math.min(1, (1 - avgMoveEff) * 0.6 + avgCascade * 0.4);
  }

  /**
   * generate — main entry point. Returns a full LevelConfig.
   */
  generate(levelNum) {
    const skill  = this._skillScore();
    const phase  = Math.floor((levelNum - 1) / 5); // 0..∞, each 5 levels = new "phase"

    // ── Grid size ──────────────────────────────────────────────
    const baseGrid  = 7 + Math.min(phase, 3);     // 7→10 over phases 0-3
    const gridW = Math.min(10, baseGrid);
    const gridH = gridW;

    // ── Move budget ────────────────────────────────────────────
    const baseMoves = 30 - phase * 2;
    const skillAdj  = Math.round((0.5 - skill) * 8); // easier if skill low
    const moves = Math.max(12, baseMoves + skillAdj);

    // ── Score target ───────────────────────────────────────────
    const baseTarget = 800 + phase * 1200 + levelNum * 300;
    const target = Math.round(baseTarget * (0.85 + skill * 0.3));

    // ── Objective ─────────────────────────────────────────────
    let objective = 'score';        // 'score' | 'jelly' | 'blocker'
    if (levelNum >= 3  && levelNum % 3 === 0) objective = 'jelly';
    if (levelNum >= 7  && levelNum % 5 === 0) objective = 'blocker';

    // ── Blocker config ────────────────────────────────────────
    const useFrosting  = levelNum >= 3;
    const useChocolate = levelNum >= 5;
    const useLicorice  = levelNum >= 7;
    const useTimerBomb = levelNum >= 6 && levelNum % 4 === 0;

    const frostingDensity   = useFrosting  ? Math.min(0.12 + phase * 0.04, 0.3)  : 0;
    const chocolateDensity  = useChocolate ? Math.min(0.06 + phase * 0.03, 0.15) : 0;
    const licoriceDensity   = useLicorice  ? Math.min(0.05 + phase * 0.03, 0.12) : 0;
    const timerBombCount    = useTimerBomb ? Math.min(phase + 1, 4) : 0;

    // ── Jelly region (for jelly levels) ───────────────────────
    let jellyRegion = [];
    if (objective === 'jelly' || levelNum % 2 === 0) {
      // Make inner cross or ring of cells have jelly
      const margin = Math.max(1, Math.floor(gridW * 0.18));
      for (let r = margin; r < gridH - margin; r++) {
        for (let c = margin; c < gridW - margin; c++) {
          if (Math.random() < 0.55) jellyRegion.push(r * gridW + c);
        }
      }
    }

    // ── Gravity direction — advanced levels alternate ─────────
    const gravityDir = (phase >= 4 && levelNum % 7 === 0) ? 'up' : 'down';

    // ── Colour count — fewer colours = easier ─────────────────
    const colourCount = Math.min(6, 4 + Math.floor(phase / 2));

    return {
      levelNum, gridW, gridH, moves, target, objective,
      jellyRegion,
      frostingDensity, chocolateDensity, licoriceDensity, timerBombCount,
      colourCount, gravityDir,
      stars: [target, Math.round(target * 1.5), Math.round(target * 2.2)],
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   §3  CANDY RENDERER — 4D high-fidelity SVGs
═══════════════════════════════════════════════════════════════ */
/**
 * CandyRenderer — uses professional SVG files from D:\candy-svg-set-v2
 * (now copied into public/candy-crunch/).
 * Falls back to inline SVG only for timer overlay and blockers.
 */
class CandyRenderer {
  /**
   * SVG_CACHE — maps "key" → raw SVG text string.
   * Preloaded by CandyRenderer.preload() at startup.
   */
  static _cache = {};
  static _loaded = false;

  /** Call once at startup — fetches all 42 SVGs in parallel */
  static async preload() {
    const files = [
      'basic_red','basic_orange','basic_yellow','basic_green','basic_blue','basic_purple',
      'striped_red','striped_orange','striped_yellow','striped_green','striped_blue','striped_purple',
      'wrapped_red','wrapped_orange','wrapped_yellow','wrapped_green','wrapped_blue','wrapped_purple',
      'special_bomb_red','special_bomb_orange','special_bomb_yellow','special_bomb_green','special_bomb_blue','special_bomb_purple',
      'special_fish_red','special_fish_orange','special_fish_yellow','special_fish_green','special_fish_blue','special_fish_purple',
      'special_swirl_red','special_swirl_orange','special_swirl_yellow','special_swirl_green','special_swirl_blue','special_swirl_purple',
      'special_mystery_red','special_mystery_orange','special_mystery_yellow','special_mystery_green','special_mystery_blue','special_mystery_purple',
    ];

    await Promise.all(files.map(async key => {
      try {
        const resp = await fetch(`/candy-crunch/${key}.svg`);
        if (resp.ok) {
          let text = await resp.text();
          // Make SVG fill its container and add drop-shadow
          text = text.replace(
            '<svg ',
            '<svg style="width:100%;height:100%;display:block;overflow:visible;" '
          );
          CandyRenderer._cache[key] = text;
        }
      } catch(e) { /* silently skip if not found */ }
    }));
    CandyRenderer._loaded = true;
  }

  /**
   * _key — maps (color, candyType) → SVG file key.
   */
  static _key(color, type) {
    switch(type) {
      case CANDY_TYPES.STRIPE_H:
      case CANDY_TYPES.STRIPE_V:  return `striped_${color}`;
      case CANDY_TYPES.WRAPPED:   return `wrapped_${color}`;
      case CANDY_TYPES.BOMB:      return `special_bomb_${color}`;
      case CANDY_TYPES.FISH:      return `special_fish_${color}`;
      case CANDY_TYPES.TIMER:     return `basic_${color}`;
      default:                    return `basic_${color}`;
    }
  }

  /**
   * render — returns HTML string for the candy cell-inner.
   * If file is in cache, uses that. Otherwise falls back to inline SVG.
   */
  static render(color, type = CANDY_TYPES.NORMAL) {
    const key = CandyRenderer._key(color, type);
    if (CandyRenderer._cache[key]) {
      return CandyRenderer._addGlow(CandyRenderer._cache[key], color);
    }
    // Fallback inline (used before preload completes)
    return CandyRenderer._inlineFallback(color, type);
  }

  /** Wraps the SVG string with a glow drop-shadow matching the candy colour */
  static _addGlow(svgText, color) {
    const p = COLOR_PALETTE[color] || {};
    const glow = p.glow || 'rgba(255,255,255,0.5)';
    return svgText.replace(
      /style="([^"]*width:100%[^"]*)"/,
      `style="$1;filter:drop-shadow(0 4px 10px ${glow})"`
    );
  }

  /** Timer bomb — base candy + countdown circle overlay */
  static renderTimer(color, countdown) {
    const base = CandyRenderer.render(color, CANDY_TYPES.NORMAL);
    const timerOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"
           style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">
        <circle cx="100" cy="120" r="38" fill="rgba(20,10,30,0.88)" stroke="white" stroke-width="3"/>
        <text x="100" y="132" font-size="38" font-weight="900"
              fill="${countdown <= 3 ? '#ff2244' : '#ffe066'}"
              font-family="Fredoka One,sans-serif" text-anchor="middle">${countdown}</text>
      </svg>`;
    return `<div style="position:relative;width:100%;height:100%;">${base}${timerOverlay}</div>`;
  }

  /** Blocker SVGs — still inline for simplicity */
  static renderBlocker(type, strength) {
    switch (type) {
      case BLOCKER_TYPES.FROSTING: {
        const fill2   = strength === 2 ? '#d1f0f7' : '#ffffff';
        const stroke2 = strength === 2 ? '#00acc1' : '#ffa726';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <ellipse cx="100" cy="180" rx="55" ry="12" fill="rgba(0,0,0,0.2)"/>
          <rect x="25" y="25" width="150" height="150" rx="28" fill="${fill2}" stroke="${stroke2}" stroke-width="8"/>
          <path d="M45,100 Q100,30 155,100 Q100,170 45,100 Z" fill="rgba(255,255,255,0.55)"/>
          <circle cx="100" cy="100" r="20" fill="#e91e63"/>
          <circle cx="80" cy="65" r="14" fill="rgba(255,255,255,0.6)"/>
        </svg>`;
      }
      case BLOCKER_TYPES.CHOCOLATE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <ellipse cx="100" cy="184" rx="55" ry="12" fill="rgba(0,0,0,0.25)"/>
          <rect x="18" y="18" width="164" height="164" rx="18" fill="#4e2f1d" stroke="#27100a" stroke-width="6"/>
          <rect x="30" y="30" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="108" y="30" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="30" y="108" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="108" y="108" width="62" height="62" rx="8" fill="#5d3a24"/>
          <circle cx="61" cy="61" r="12" fill="rgba(255,255,255,0.18)"/>
        </svg>`;
      case BLOCKER_TYPES.LICORICE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <ellipse cx="100" cy="184" rx="55" ry="12" fill="rgba(0,0,0,0.25)"/>
          <circle cx="100" cy="100" r="82" fill="#1a1a1a" stroke="#000" stroke-width="6"/>
          <circle cx="100" cy="100" r="60" fill="none" stroke="#333" stroke-width="8"/>
          <circle cx="100" cy="100" r="38" fill="none" stroke="#4d4d4d" stroke-width="7"/>
          <circle cx="100" cy="100" r="16" fill="#1a1a1a" stroke="#666" stroke-width="4"/>
          <circle cx="72" cy="68" r="12" fill="white" opacity="0.22"/>
        </svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <rect x="20" y="20" width="160" height="160" rx="20" fill="#666"/>
        </svg>`;
    }
  }

  /** Inline fallback SVG for when cache hasn't loaded yet */
  static _inlineFallback(color, type) {
    const p = COLOR_PALETTE[color] || COLOR_PALETTE.red;
    const id = `fb_${color}_${Math.random().toString(36).slice(2,5)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"
       style="width:100%;height:100%;display:block;filter:drop-shadow(0 4px 8px ${p.glow})">
      <defs>
        <radialGradient id="fbg_${id}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${p.light}"/>
          <stop offset="50%" stop-color="${p.primary}"/>
          <stop offset="100%" stop-color="${p.dark}"/>
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="180" rx="55" ry="12" fill="rgba(0,0,0,0.2)"/>
      <circle cx="100" cy="100" r="78" fill="url(#fbg_${id})" stroke="${p.mid}" stroke-width="3"/>
      <ellipse cx="78" cy="68" rx="30" ry="18" fill="rgba(255,255,255,0.55)" transform="rotate(-25 78 68)"/>
      <circle cx="128" cy="62" r="10" fill="white" opacity="0.8"/>
    </svg>`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   §4  PARTICLE SYSTEM
═══════════════════════════════════════════════════════════════ */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.particles = [];
    this._raf  = null;
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * burst — scatter particles from a point with given color
   */
  burst(x, y, color, count = 18) {
    const p = COLOR_PALETTE[color] || { primary:'#fff', glow:'rgba(255,255,255,0.8)' };
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 6,
        color: Math.random() < 0.5 ? p.primary : p.light || '#fff',
        alpha: 1,
        decay: 0.025 + Math.random() * 0.025,
        gravity: 0.2 + Math.random() * 0.15,
        shape: Math.random() < 0.5 ? 'circle' : 'star',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  /** confetti cascade for level complete */
  confetti(count = 90) {
    const colours = Object.values(COLOR_PALETTE).map(p => p.primary);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 3,
        vy: 3 + Math.random() * 4,
        size: 6 + Math.random() * 8,
        color: colours[Math.floor(Math.random() * colours.length)],
        alpha: 1,
        decay: 0.008 + Math.random() * 0.008,
        gravity: 0.12,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        w: 8 + Math.random() * 8,
        h: 4 + Math.random() * 4,
      });
    }
  }

  _drawStar(ctx, x, y, r, rotation) {
    const pts = 5;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.4;
      const a = (i * Math.PI) / pts - Math.PI / 2 + rotation;
      i === 0 ? ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
              : ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fill();
  }

  _loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter(p => p.alpha > 0.02);

    this.particles.forEach(p => {
      p.x        += p.vx;
      p.y        += p.vy;
      p.vy       += p.gravity;
      p.vx       *= 0.97;
      p.alpha    -= p.decay;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'star') {
        this._drawStar(ctx, 0, 0, p.size, 0);
      } else if (p.shape === 'rect') {
        ctx.fillRect(-(p.w || p.size)/2, -(p.h || p.size)/2, p.w || p.size, p.h || p.size);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    this._raf = requestAnimationFrame(() => this._loop());
  }
}

/* ═══════════════════════════════════════════════════════════════
   §5  ANIMATION QUEUE — serialize multi-step animations
═══════════════════════════════════════════════════════════════ */
class AnimationQueue {
  constructor() { this._queue = []; this._running = false; }

  push(fn) { this._queue.push(fn); this._run(); }

  _run() {
    if (this._running || this._queue.length === 0) return;
    this._running = true;
    const fn = this._queue.shift();
    const result = fn();
    if (result && typeof result.then === 'function') {
      result.then(() => { this._running = false; this._run(); });
    } else {
      this._running = false; this._run();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   §6  MATCH ENGINE
═══════════════════════════════════════════════════════════════ */
class MatchEngine {
  /**
   * findAll — returns array of match objects.
   * Each: { type: 'row'|'col', indices: [], color, length }
   */
  static findAll(cells, W, H) {
    const matches = [];

    // ── Horizontal runs ──────────────────────────────────────
    for (let r = 0; r < H; r++) {
      let run = []; let runColor = null;
      for (let c = 0; c <= W; c++) {
        const idx = r * W + c;
        const cell = c < W ? cells[idx] : null;
        const color = (cell && cell.type === CELL_TYPES.NORMAL) ? cell.candyColor : null;

        if (color && color === runColor) {
          run.push(idx);
        } else {
          if (run.length >= 3) matches.push({ dir:'h', indices: [...run], color: runColor, length: run.length });
          run = c < W && color ? [idx] : [];
          runColor = color;
        }
      }
    }

    // ── Vertical runs ─────────────────────────────────────────
    for (let c = 0; c < W; c++) {
      let run = []; let runColor = null;
      for (let r = 0; r <= H; r++) {
        const idx = r * W + c;
        const cell = r < H ? cells[idx] : null;
        const color = (cell && cell.type === CELL_TYPES.NORMAL) ? cell.candyColor : null;

        if (color && color === runColor) {
          run.push(idx);
        } else {
          if (run.length >= 3) matches.push({ dir:'v', indices: [...run], color: runColor, length: run.length });
          run = r < H && color ? [idx] : [];
          runColor = color;
        }
      }
    }

    return matches;
  }

  /**
   * classifySpecialSpawn — given matches, determine what special candy to spawn.
   * Returns array of { index, candyType, color }.
   */
  static classifySpecialSpawn(matches, draggedIndex) {
    const spawns = [];
    const hMatches = matches.filter(m => m.dir === 'h');
    const vMatches = matches.filter(m => m.dir === 'v');

    // Detect T or L shapes (intersections)
    for (const hm of hMatches) {
      for (const vm of vMatches) {
        const inter = hm.indices.filter(i => vm.indices.includes(i));
        if (inter.length > 0 && hm.color === vm.color) {
          const pivot = inter[0];
          spawns.push({ index: pivot, candyType: CANDY_TYPES.WRAPPED, color: hm.color, reason: 'T/L' });
        }
      }
    }

    // Detect straight 5s or 4s from individual matches
    for (const m of matches) {
      const already = spawns.some(s => m.indices.includes(s.index));
      if (already) continue;

      const pivot = m.indices.includes(draggedIndex) ? draggedIndex
                  : m.indices[Math.floor(m.indices.length / 2)];

      if (m.length >= 5) {
        spawns.push({ index: pivot, candyType: CANDY_TYPES.BOMB, color: m.color, reason: '5-match' });
      } else if (m.length === 4) {
        const t = m.dir === 'h' ? CANDY_TYPES.STRIPE_V : CANDY_TYPES.STRIPE_H;
        spawns.push({ index: pivot, candyType: t, color: m.color, reason: '4-match' });
      }
    }

    return spawns;
  }
}

/* ═══════════════════════════════════════════════════════════════
   §7  SPECIAL ENGINE
═══════════════════════════════════════════════════════════════ */
class SpecialEngine {
  /**
   * Checks if swap is two special candies and handles their combo.
   * Returns false if no combo found.
   */
  static resolveCombo(c1, c2, cells, W, H, clearFn, cascadeFn) {
    const t1 = c1.candyType, t2 = c2.candyType;
    const isSpecial = t => t !== CANDY_TYPES.NORMAL && t !== CANDY_TYPES.TIMER;
    if (!isSpecial(t1) && !isSpecial(t2)) return false;

    const isStripe  = t => t === CANDY_TYPES.STRIPE_H || t === CANDY_TYPES.STRIPE_V;
    const isBomb    = t => t === CANDY_TYPES.BOMB;
    const isWrapped = t => t === CANDY_TYPES.WRAPPED;
    const isFish    = t => t === CANDY_TYPES.FISH;

    // ── 7) Color Bomb + Color Bomb → clears nearly every candy on the board
    if (isBomb(t1) && isBomb(t2)) {
      clearFn(c1, 'clear'); clearFn(c2, 'clear');
      const normals = cells.filter(c => c.type === CELL_TYPES.NORMAL && c.candyColor);
      const skip = new Set();
      while (skip.size < Math.min(4, normals.length))
        skip.add(normals[Math.floor(Math.random() * normals.length)].idx);
      normals.forEach(c => { if (!skip.has(c.idx)) clearFn(c, 'bomb-bomb'); });
      return true;
    }

    // ── All Color Bomb combos ─────────────────────────────────────────────
    if (isBomb(t1) || isBomb(t2)) {
      const bomb  = isBomb(t1) ? c1 : c2;
      const other = isBomb(t1) ? c2 : c1;

      // ── 5) Color Bomb + Striped → all of that color become striped & all activate
      if (isStripe(other.candyType)) {
        clearFn(bomb, 'clear');
        cells.forEach(c => {
          if (c.type === CELL_TYPES.NORMAL && c.candyColor === other.candyColor) {
            c.candyType = Math.random() < 0.5 ? CANDY_TYPES.STRIPE_H : CANDY_TYPES.STRIPE_V;
            clearFn(c, 'striped');
          }
        });
        return true;
      }

      // ── 6) Color Bomb + Wrapped → all of that color become wrapped & all activate
      if (isWrapped(other.candyType)) {
        clearFn(bomb, 'clear');
        cells.forEach(c => {
          if (c.type === CELL_TYPES.NORMAL && c.candyColor === other.candyColor) {
            c.candyType = CANDY_TYPES.WRAPPED;
            clearFn(c, 'wrapped');
          }
        });
        return true;
      }

      // ── 10) Color Bomb + Fish → ~75% of fish color become fish & activate
      if (isFish(other.candyType)) {
        clearFn(bomb, 'clear');
        cells.forEach(c => {
          if (c.type === CELL_TYPES.NORMAL && c.candyColor === other.candyColor && Math.random() < 0.75) {
            c.candyType = CANDY_TYPES.FISH;
            clearFn(c, 'fish');
          }
        });
        clearFn(other, 'fish');
        return true;
      }

      // ── 4) Color Bomb + Normal → removes every candy of that color
      const targetColor = other.candyColor;
      clearFn(bomb, 'clear');
      cells.forEach(c => {
        if (c.type === CELL_TYPES.NORMAL && c.candyColor === targetColor) clearFn(c, 'color-bomb');
      });
      return true;
    }

    // ── 1) Striped + Striped → clears one full row AND one full column crossing at activation point
    if (isStripe(t1) && isStripe(t2)) {
      clearFn(c1, 'clear'); clearFn(c2, 'clear');
      SpecialEngine.clearRow(c2.row, cells, W, clearFn);
      SpecialEngine.clearCol(c2.col, cells, W, H, clearFn);
      return true;
    }

    // ── 2) Wrapped + Wrapped → massive 5×5 double explosion
    if (isWrapped(t1) && isWrapped(t2)) {
      clearFn(c1, 'clear'); clearFn(c2, 'clear');
      SpecialEngine.explodeArea(c2.row, c2.col, 2, cells, W, H, clearFn);
      setTimeout(() => SpecialEngine.explodeArea(c2.row, c2.col, 2, cells, W, H, clearFn), 280);
      return true;
    }

    // ── 3) Striped + Wrapped → 3 horizontal + 3 vertical blasts centred on activation point
    if ((isStripe(t1) || isStripe(t2)) && (isWrapped(t1) || isWrapped(t2))) {
      const anchor = isWrapped(t2) ? c2 : c1;
      clearFn(c1, 'clear'); clearFn(c2, 'clear');
      for (let dr = -1; dr <= 1; dr++) {
        const rr = anchor.row + dr;
        if (rr >= 0 && rr < H) SpecialEngine.clearRow(rr, cells, W, clearFn);
      }
      for (let dc = -1; dc <= 1; dc++) {
        const cc = anchor.col + dc;
        if (cc >= 0 && cc < W) SpecialEngine.clearCol(cc, cells, W, H, clearFn);
      }
      return true;
    }

    // ── Fish combos ────────────────────────────────────────────────────────
    if (isFish(t1) || isFish(t2)) {
      const fish  = isFish(t1) ? c1 : c2;
      const other = isFish(t1) ? c2 : c1;

      // ── 8) Fish + Striped → 3 striped fish swim to targets, each clears full row or column
      if (isStripe(other.candyType)) {
        clearFn(fish, 'clear'); clearFn(other, 'clear');
        for (let i = 0; i < 3; i++) {
          const avail = cells.filter(c => c.type === CELL_TYPES.NORMAL && c.candyColor);
          if (!avail.length) break;
          const t = avail[Math.floor(Math.random() * avail.length)];
          setTimeout(() => {
            Math.random() < 0.5
              ? SpecialEngine.clearRow(t.row, cells, W, clearFn)
              : SpecialEngine.clearCol(t.col, cells, W, H, clearFn);
          }, 120 * (i + 1));
        }
        return true;
      }

      // ── 9) Fish + Wrapped → fish explode with wrapped-candy 3×3 power at target
      if (isWrapped(other.candyType)) {
        clearFn(fish, 'clear'); clearFn(other, 'clear');
        for (let i = 0; i < 3; i++) {
          const avail = cells.filter(c => c.type === CELL_TYPES.NORMAL && c.candyColor);
          if (!avail.length) break;
          const t = avail[Math.floor(Math.random() * avail.length)];
          setTimeout(() => SpecialEngine.explodeArea(t.row, t.col, 1, cells, W, H, clearFn), 140 * (i + 1));
        }
        return true;
      }

      // Default fish activation
      clearFn(c1, 'fish'); clearFn(c2, 'fish');
      return true;
    }

    return false;
  }

  static clearRow(r, cells, W, clearFn) {
    for (let c = 0; c < W; c++) { const cell = cells[r * W + c]; if (cell) clearFn(cell, 'row'); }
  }
  static clearCol(c, cells, W, H, clearFn) {
    for (let r = 0; r < H; r++) { const cell = cells[r * W + c]; if (cell) clearFn(cell, 'col'); }
  }
  static explodeArea(row, col, radius, cells, W, H, clearFn) {
    for (let r = row - radius; r <= row + radius; r++)
      for (let c = col - radius; c <= col + radius; c++)
        if (r >= 0 && r < H && c >= 0 && c < W) clearFn(cells[r * W + c], 'area');
  }
}

/* ═══════════════════════════════════════════════════════════════
   §8  GAME CONTROLLER
═══════════════════════════════════════════════════════════════ */
class GameController {
  constructor() {
    this.board       = document.getElementById('board');
    this.scoreEl     = document.getElementById('display-score');
    this.levelEl     = document.getElementById('display-level');
    this.targetEl    = document.getElementById('display-target');
    this.movesEl     = document.getElementById('display-moves');
    this.progressEl  = document.getElementById('progress-fill');
    this.objText     = document.getElementById('obj-text');
    this.modalEl     = document.getElementById('game-modal');
    this.modalTitle  = document.getElementById('modal-title');
    this.modalBody   = document.getElementById('modal-body');
    this.modalBtn    = document.getElementById('modal-btn');
    this.modalScore  = document.getElementById('modal-score');
    this.modalStars  = document.getElementById('modal-stars');
    this.particleCvs = document.getElementById('particle-canvas');

    this.aiEngine    = new AILevelEngine();
    this.particles   = new ParticleSystem(this.particleCvs);
    this.aniQueue    = new AnimationQueue();

    this.levelNum    = 1;
    this.score       = 0;
    this.moves       = 0;
    this.config      = null;
    this.cells       = [];
    this.W = 0; this.H = 0;
    this.cellSize    = 0;
    this.isLocked    = false;
    this.cascadeDepth = 0;
    this.levelStartTime = Date.now();

    // Drag state
    this._drag = { active: false, cell: null, startX: 0, startY: 0 };

    this.modalBtn.addEventListener('click', () => this._onModalBtn());

    this._startLevel(1);
  }

  /* ──────────────────────────────────────────────────────────────
     LEVEL MANAGEMENT
  ────────────────────────────────────────────────────────────── */
  _startLevel(n) {
    this.levelNum = n;
    this.config   = this.aiEngine.generate(n);
    const cfg     = this.config;

    this.W = cfg.gridW; this.H = cfg.gridH;
    this.score  = 0;
    this.moves  = cfg.moves;
    this.cascadeDepth = 0;
    this.isLocked = false;
    this.levelStartTime = Date.now();

    // Set board pixel size (responsive)
    const maxPx = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.64, 560);
    this.cellSize = Math.floor(maxPx / this.W);
    const boardPx = this.cellSize * this.W;
    this.board.style.width  = boardPx + 'px';
    this.board.style.height = boardPx + 'px';

    // HUD
    this.levelEl.textContent  = n;
    this.scoreEl.textContent  = 0;
    this.targetEl.textContent = cfg.target;
    this.movesEl.textContent  = this.moves;
    this.progressEl.style.width = '0%';

    // Objective label
    const objLabels = { score: 'Reach the Target!', jelly: 'Clear all Jelly!', blocker: 'Clear all Blockers!' };
    this.objText.textContent = objLabels[cfg.objective] || 'Play!';

    this.modalEl.classList.add('modal-hidden');

    this._buildBoard();
  }

  _buildBoard() {
    this.board.innerHTML = '';
    this.cells = [];
    const cfg = this.config;
    const colors = COLORS.slice(0, cfg.colourCount);

    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.W; c++) {
        const idx = r * this.W + c;
        const el  = document.createElement('div');
        el.className = 'cell';
        el.style.cssText = `
          left:${c * this.cellSize}px;
          top:${r * this.cellSize}px;
          width:${this.cellSize}px;
          height:${this.cellSize}px;
        `;

        const inner = document.createElement('div');
        inner.className = 'cell-inner';

        // Determine jelly
        const isJelly = cfg.jellyRegion.includes(idx);
        if (isJelly) {
          const jl = document.createElement('div');
          jl.className = 'jelly-layer';
          el.appendChild(jl);
        }

        el.appendChild(inner);
        this.board.appendChild(el);

        // Cell data
        const rnd = Math.random();
        let type = CELL_TYPES.NORMAL;
        let blockerKind = null;
        let blockerStrength = 1;

        if (rnd < cfg.frostingDensity && r > this.H/3) {
          type = CELL_TYPES.BLOCKER;
          blockerKind = BLOCKER_TYPES.FROSTING;
          blockerStrength = Math.random() < 0.4 ? 2 : 1;
        } else if (rnd < cfg.frostingDensity + cfg.chocolateDensity && r === this.H - 1) {
          type = CELL_TYPES.BLOCKER;
          blockerKind = BLOCKER_TYPES.CHOCOLATE;
        } else if (rnd < cfg.frostingDensity + cfg.chocolateDensity + cfg.licoriceDensity) {
          type = CELL_TYPES.BLOCKER;
          blockerKind = BLOCKER_TYPES.LICORICE;
        }

        const color = type === CELL_TYPES.NORMAL
          ? colors[Math.floor(Math.random() * colors.length)] : null;

        // Timer bomb?
        let candyType = CANDY_TYPES.NORMAL;
        let timerVal  = 0;
        if (type === CELL_TYPES.NORMAL && cfg.timerBombCount > 0 && this.cells.filter(c => c.timerVal > 0).length < cfg.timerBombCount && Math.random() < 0.03) {
          candyType = CANDY_TYPES.TIMER;
          timerVal  = 7 + Math.floor(Math.random() * 5);
        }

        const cellData = {
          el, inner, idx, row: r, col: c,
          type, blockerKind, blockerStrength,
          candyColor: color, candyType, timerVal,
          isJelly, jellyCleared: false,
          clearing: false,
        };
        this.cells.push(cellData);
        this._renderCell(cellData);

        // Drag & touch listeners
        el.addEventListener('mousedown',  (e) => this._onPointerDown(e, cellData));
        el.addEventListener('touchstart', (e) => this._onPointerDown(e, cellData), { passive: false });
      }
    }

    // Global pointer move/up
    const move = (e) => this._onPointerMove(e);
    const up   = (e) => this._onPointerUp(e);
    window.addEventListener('mousemove',  move);
    window.addEventListener('mouseup',    up);
    window.addEventListener('touchmove',  move, { passive: false });
    window.addEventListener('touchend',   up);
    this._cleanListeners = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend',  up);
    };

    // Break initial matches by reshuffling
    this._breakInitialMatches();
  }

  _breakInitialMatches() {
    const colors = COLORS.slice(0, this.config.colourCount);
    let safeIterations = 0;
    let changed = true;
    while (changed && safeIterations++ < 50) {
      changed = false;
      const matches = MatchEngine.findAll(this.cells, this.W, this.H);
      for (const m of matches) {
        for (const idx of m.indices) {
          const c = this.cells[idx];
          if (c.type === CELL_TYPES.NORMAL) {
            c.candyColor = colors[Math.floor(Math.random() * colors.length)];
            changed = true;
          }
        }
        break; // break one match per iteration, re-scan
      }
    }
    // Re-render all after shuffling
    this.cells.forEach(c => this._renderCell(c));
  }

  /* ──────────────────────────────────────────────────────────────
     RENDERING
  ────────────────────────────────────────────────────────────── */
  _renderCell(cell) {
    const inner = cell.inner;
    inner.innerHTML = '';

    if (cell.type === CELL_TYPES.BLOCKER) {
      inner.innerHTML = CandyRenderer.renderBlocker(cell.blockerKind, cell.blockerStrength);
      inner.style.filter = 'none';
      return;
    }

    if (!cell.candyColor) return;

    if (cell.candyType === CANDY_TYPES.TIMER) {
      inner.innerHTML = CandyRenderer.renderTimer(cell.candyColor, cell.timerVal);
    } else {
      inner.innerHTML = CandyRenderer.render(cell.candyColor, cell.candyType);
    }

    // Mark as special so CSS gives idle glow
    const isSpecial = cell.candyType !== CANDY_TYPES.NORMAL && cell.candyType !== CANDY_TYPES.TIMER;
    cell.el.classList.toggle('special', isSpecial);
  }

  /* ──────────────────────────────────────────────────────────────
     INPUT HANDLING — unified pointer for mouse + touch
  ────────────────────────────────────────────────────────────── */
  _clientXY(e) {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  }

  _onPointerDown(e, cell) {
    if (this.isLocked) return;
    if (e.cancelable) e.preventDefault();
    if (cell.type !== CELL_TYPES.NORMAL) return;

    const { x, y } = this._clientXY(e);
    this._drag = { active: true, cell, startX: x, startY: y, committed: false };
    cell.el.classList.add('dragging');
  }

  _onPointerMove(e) {
    if (!this._drag.active || this._drag.committed) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = this._clientXY(e);
    const dx = x - this._drag.startX;
    const dy = y - this._drag.startY;

    // Require minimum drag distance before committing
    if (Math.hypot(dx, dy) > this.cellSize * 0.35) {
      this._drag.committed = true;
      const cell  = this._drag.cell;

      // Determine direction
      let targetCell = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        const tc = dx > 0 ? cell.col + 1 : cell.col - 1;
        if (tc >= 0 && tc < this.W) targetCell = this.cells[cell.row * this.W + tc];
      } else {
        const tr = dy > 0 ? cell.row + 1 : cell.row - 1;
        if (tr >= 0 && tr < this.H) targetCell = this.cells[tr * this.W + cell.col];
      }

      cell.el.classList.remove('dragging');

      if (targetCell) this._attemptSwap(cell, targetCell);
      this._drag = { active: false, cell: null };
    }
  }

  _onPointerUp(e) {
    if (this._drag.active) {
      this._drag.cell?.el.classList.remove('dragging');
      this._drag = { active: false, cell: null };
    }
  }

  /* ──────────────────────────────────────────────────────────────
     SWAP SYSTEM — with FLIP animation
  ────────────────────────────────────────────────────────────── */
  _attemptSwap(c1, c2) {
    if (this.isLocked) return;
    this.isLocked = true;

    // Check special combo first
    const combo = SpecialEngine.resolveCombo(
      c1, c2, this.cells, this.W, this.H,
      (cell, reason) => this._clearCell(cell, reason),
      () => this._runCascade()
    );

    if (combo) {
      this.moves--;
      this._updateMovesDisplay();
      this._decrementTimerBombs();
      setTimeout(() => this._runCascade(), ANIM.SPECIAL + 50);
      return;
    }

    // Animate swap visually
    this._swapCellData(c1, c2);
    this._animSwap(c1, c2);

    setTimeout(() => {
      const matches = MatchEngine.findAll(this.cells, this.W, this.H);
      if (matches.length > 0) {
        this.moves--;
        this._updateMovesDisplay();
        this._decrementTimerBombs();
        this._processMatches(matches, c1);
      } else {
        // Revert: no valid match
        this._swapCellData(c1, c2);
        this._animSwap(c1, c2);
        setTimeout(() => { this.isLocked = false; }, ANIM.REVERT);
      }
    }, ANIM.SWAP + 20);
  }

  _swapCellData(c1, c2) {
    // Swap content data only — positions stay
    const tmp = {
      type: c1.type, blockerKind: c1.blockerKind, blockerStrength: c1.blockerStrength,
      candyColor: c1.candyColor, candyType: c1.candyType, timerVal: c1.timerVal,
      isJelly: c1.isJelly, jellyCleared: c1.jellyCleared,
    };
    c1.type = c2.type; c1.blockerKind = c2.blockerKind; c1.blockerStrength = c2.blockerStrength;
    c1.candyColor = c2.candyColor; c1.candyType = c2.candyType; c1.timerVal = c2.timerVal;
    c1.isJelly = c2.isJelly; c1.jellyCleared = c2.jellyCleared;

    c2.type = tmp.type; c2.blockerKind = tmp.blockerKind; c2.blockerStrength = tmp.blockerStrength;
    c2.candyColor = tmp.candyColor; c2.candyType = tmp.candyType; c2.timerVal = tmp.timerVal;
    c2.isJelly = tmp.isJelly; c2.jellyCleared = tmp.jellyCleared;

    this._renderCell(c1); this._renderCell(c2);
  }

  /** Smooth spring-like swap using Web Animations API */
  _animSwap(c1, c2) {
    const dx = (c2.col - c1.col) * this.cellSize;
    const dy = (c2.row - c1.row) * this.cellSize;

    const ease = 'cubic-bezier(0.34,1.56,0.64,1)';
    const dur  = ANIM.SWAP;

    c1.inner.animate([
      { transform: `translate(${dx}px,${dy}px)` },
      { transform: 'translate(0,0)' }
    ], { duration: dur, easing: ease, fill: 'none' });

    c2.inner.animate([
      { transform: `translate(${-dx}px,${-dy}px)` },
      { transform: 'translate(0,0)' }
    ], { duration: dur, easing: ease, fill: 'none' });
  }

  /* ──────────────────────────────────────────────────────────────
     MATCH PROCESSING & CASCADE
  ────────────────────────────────────────────────────────────── */
  _processMatches(matches, draggedCell) {
    // Classify special spawns
    const spawns = MatchEngine.classifySpecialSpawn(matches, draggedCell ? draggedCell.idx : -1);
    const spawnIdxSet = new Set(spawns.map(s => s.index));

    // Score
    let points = 0;
    const toClear = new Set();
    matches.forEach(m => {
      points += m.length === 3 ? 300 : m.length === 4 ? 500 : m.length >= 5 ? 900 : 300;
      m.indices.forEach(i => toClear.add(i));
    });

    // Cascade bonus
    if (this.cascadeDepth > 0) {
      points = Math.round(points * (1 + this.cascadeDepth * 0.25));
    }

    this.score += points;
    this._updateScoreDisplay();

    // Clear matched cells, except those that will become special spawns
    toClear.forEach(idx => {
      const cell = this.cells[idx];
      if (!spawnIdxSet.has(idx)) {
        this._clearCell(cell, 'match');
      }
    });

    // Spawn specials
    spawns.forEach(s => {
      const cell = this.cells[s.index];
      cell.clearing = false;
      cell.el.classList.remove('clearing', 'special');
      cell.type = CELL_TYPES.NORMAL;
      cell.candyType = s.candyType;
      cell.candyColor = s.color;
      this._renderCell(cell);
      this._spawnSpecialAnimation(cell);

      // Score bonus for special spawn
      const bonus = s.candyType === CANDY_TYPES.BOMB ? 1000 : s.candyType === CANDY_TYPES.WRAPPED ? 600 : 400;
      this.score += bonus;
      this._updateScoreDisplay();
    });

    // Burst particles for every cleared cell
    toClear.forEach(idx => {
      const cell = this.cells[idx];
      const rect = cell.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      this.particles.burst(cx, cy, cell.candyColor, 14);
    // Run cascade after clearing animation
    setTimeout(() => {
      this._applyGravity();
      setTimeout(() => this._runCascade(), ANIM.FALL + 60);
    }, ANIM.CLEAR + 30);
  }

  _runCascade() {
    const matches = MatchEngine.findAll(this.cells, this.W, this.H);
    if (matches.length > 0) {
      this.cascadeDepth++;
      this._processMatches(matches, null);
    } else {
      this.cascadeDepth = 0;
      this.isLocked = false;
      this._checkObjective();
    }
  }

  /* ──────────────────────────────────────────────────────────────
     CLEAR CELL
  ────────────────────────────────────────────────────────────── */
  _clearCell(cell, reason = 'match') {
    if (!cell || cell.clearing) return;
    if (cell.type === CELL_TYPES.BLOCKER) {
      this._damageBlocker(cell);
      return;
    }
    if (cell.type !== CELL_TYPES.NORMAL) return;

    // Trigger specials before clearing
    const type = cell.candyType;
    cell.candyType = CANDY_TYPES.NORMAL; // reset before recursion
    cell.clearing  = true;

    // Visual clearing animation
    cell.el.classList.add('clearing');
    setTimeout(() => cell.el.classList.remove('clearing'), ANIM.CLEAR);

    // Clear jelly
    if (cell.isJelly && !cell.jellyCleared) {
      cell.jellyCleared = true;
      const jl = cell.el.querySelector('.jelly-layer');
      if (jl) {
        jl.style.animation = 'none';
        jl.style.opacity = '0';
        jl.style.transform = 'scale(2)';
        jl.style.transition = 'all 0.3s ease-out';
        setTimeout(() => jl.remove(), 300);
      }
      this.score += 300;
      this._updateScoreDisplay();
    }

    // Score
    this.score += 100;
    this._updateScoreDisplay();

    // Trigger the special candy effect NOW
    if (type === CANDY_TYPES.STRIPE_H) {
      setTimeout(() => SpecialEngine.clearRow(cell.row, this.cells, this.W, (c, r) => this._clearCell(c, r)), 60);
    } else if (type === CANDY_TYPES.STRIPE_V) {
      setTimeout(() => SpecialEngine.clearCol(cell.col, this.cells, this.W, this.H, (c, r) => this._clearCell(c, r)), 60);
    } else if (type === CANDY_TYPES.WRAPPED) {
      setTimeout(() => {
        SpecialEngine.explodeArea(cell.row, cell.col, 1, this.cells, this.W, this.H, (c, r) => this._clearCell(c, r));
        setTimeout(() => SpecialEngine.explodeArea(cell.row, cell.col, 1, this.cells, this.W, this.H, (c, r) => this._clearCell(c, r)), 200);
      }, 60);
    } else if (type === CANDY_TYPES.BOMB) {
      // Color bomb triggered by match — remove all of same color (shouldn't really happen without swap)
      setTimeout(() => {
        const targetColor = cell.candyColor;
        this.cells.forEach(c => {
          if (c.type === CELL_TYPES.NORMAL && c.candyColor === targetColor) this._clearCell(c, 'bomb');
        });
      }, 60);
    } else if (type === CANDY_TYPES.FISH) {
      setTimeout(() => this._triggerFish(cell), 60);
    }

    // Mark cell empty visually
    cell.type = CELL_TYPES.EMPTY;
    cell.candyColor = null;
    cell.inner.innerHTML = '';
    cell.el.classList.remove('special');

    // Damage adjacent blockers
    this._damageAdjacentBlockers(cell.row, cell.col);
  }

  _damageBlocker(cell) {
    if (!cell || cell.type !== CELL_TYPES.BLOCKER) return;
    cell.blockerStrength--;
    cell.inner.animate([
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)'  },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(0)'    },
    ], { duration: 300, easing: 'ease-out' });

    if (cell.blockerStrength <= 0) {
      // Blocker cleared
      cell.type = CELL_TYPES.EMPTY;
      cell.blockerKind = null;
      cell.candyColor = null;
      cell.inner.innerHTML = '';
      this.score += 200;
      this._updateScoreDisplay();

      const rect = cell.el.getBoundingClientRect();
      this.particles.burst(rect.left + rect.width/2, rect.top + rect.height/2, 'purple', 10);
    } else {
      this._renderCell(cell);
    }
  }

  _damageAdjacentBlockers(row, col) {
    [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].forEach(([r,c]) => {
      if (r >= 0 && r < this.H && c >= 0 && c < this.W) {
        const nb = this.cells[r * this.W + c];
        if (nb && nb.type === CELL_TYPES.BLOCKER) this._damageBlocker(nb);
      }
    });
  }

  _triggerFish(originCell) {
    // Find best target: jelly → blockers → random
    const targets = [
      ...this.cells.filter(c => c.isJelly && !c.jellyCleared && c.type === CELL_TYPES.NORMAL),
      ...this.cells.filter(c => c.type === CELL_TYPES.BLOCKER),
      ...this.cells.filter(c => c.type === CELL_TYPES.NORMAL && c.candyColor),
    ];
    if (targets.length > 0) {
      const t = targets[Math.floor(Math.random() * Math.min(targets.length, 3))];
      // Particle trail
      const rectO = originCell.el.getBoundingClientRect();
      const rectT = t.el.getBoundingClientRect();
      const fishX = rectO.left + rectO.width/2, fishY = rectO.top + rectO.height/2;
      this.particles.burst(fishX, fishY, 'blue', 8);
      this.particles.burst(rectT.left + rectT.width/2, rectT.top + rectT.height/2, t.candyColor || 'blue', 16);
      this._clearCell(t, 'fish');
    }
  }

  /* ──────────────────────────────────────────────────────────────
     GRAVITY — smooth fall via CSS transitions
  ────────────────────────────────────────────────────────────── */
  _applyGravity() {
    const colors = COLORS.slice(0, this.config.colourCount);

    for (let c = 0; c < this.W; c++) {
      // Collect non-empty cells from bottom to top
      let filled = [];
      for (let r = this.H - 1; r >= 0; r--) {
        const cell = this.cells[r * this.W + c];
        if (cell.type === CELL_TYPES.BLOCKER) {
          // Blockers break gravity chains — flush filled above them
          this._applyColumn(filled, r + 1, c, colors);
          filled = [];
        } else if (cell.type === CELL_TYPES.NORMAL && cell.candyColor) {
          filled.push({
            type: cell.type, candyColor: cell.candyColor, candyType: cell.candyType,
            timerVal: cell.timerVal, isJelly: false, jellyCleared: false,
          });
          cell.type = CELL_TYPES.EMPTY; cell.candyColor = null;
        }
        // EMPTY cells just leave gaps for filled to drop into
      }
      // Apply remaining filled above any blockers
      this._applyColumn(filled, 0, c, colors);
    }
  }

  _applyColumn(filled, startRow, col, colors) {
    // filled is ordered bottom-to-top of the original positions
    // We need to place them from bottom upward
    // startRow = the top row boundary for this segment

    // Count empty slots in this segment
    const segH = filled.length;
    if (segH === 0) return;

    // Find available empty rows in this segment (from startRow downward to end of segment)
    const empties = [];
    for (let r = this.H - 1; r >= 0; r--) {
      const cell = this.cells[r * this.W + col];
      if (r < startRow) break; // above a blocker boundary
      if (cell.type === CELL_TYPES.EMPTY) empties.push(r);
      if (empties.length >= segH) break;
    }

    // Place each filled candy into an empty slot with animated transition
    for (let i = 0; i < Math.min(filled.length, empties.length); i++) {
      const data = filled[i];
      const targetRow = empties[i];
      const targetCell = this.cells[targetRow * this.W + col];

      const fallDistance = 1; // visual only; position is absolute via CSS
      targetCell.type       = data.type;
      targetCell.candyColor = data.candyColor;
      targetCell.candyType  = data.candyType;
      targetCell.timerVal   = data.timerVal;
      targetCell.clearing   = false;
      targetCell.el.classList.remove('clearing');

      this._renderCell(targetCell);

      // Animate fall using Web Animations — translateY from -cellSize*fall to 0
      const dy = -this.cellSize * (targetRow - (this.H - 1 - empties.length + i));
      targetCell.inner.animate(
        [{ transform: `translateY(${dy}px)`, opacity: 0.7 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: ANIM.FALL, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'none' }
      );
    }

    // Spawn new candies at top for remaining empty slots
    const emptyAtTop = empties.slice(filled.length);
    let spawnRow = 0;
    emptyAtTop.forEach(r => {
      const cell = this.cells[r * this.W + col];
      cell.type       = CELL_TYPES.NORMAL;
      cell.candyColor = colors[Math.floor(Math.random() * colors.length)];
      cell.candyType  = CANDY_TYPES.NORMAL;
      cell.timerVal   = 0;
      cell.clearing   = false;
      cell.el.classList.remove('clearing', 'special');

      this._renderCell(cell);

      // Drop from above
      const dropDistance = this.cellSize * (r - spawnRow + 1);
      cell.inner.animate(
        [{ transform: `translateY(${-dropDistance}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: ANIM.SPAWN, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'none' }
      );
      spawnRow++;
    });
  }

  /* ──────────────────────────────────────────────────────────────
     SPECIAL SPAWN VISUAL
  ────────────────────────────────────────────────────────────── */
  _spawnSpecialAnimation(cell) {
    const rect = cell.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    const ring = document.createElement('div');
    ring.className = 'special-spawn-ring';
    ring.style.cssText = `
      left:${cx - 24}px; top:${cy - 24}px;
      width:48px; height:48px;
      border-color:${COLOR_PALETTE[cell.candyColor]?.primary || '#fff'};
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 600);

    // Extra burst
    this.particles.burst(cx, cy, cell.candyColor, 22);
  }

  /* ──────────────────────────────────────────────────────────────
     TIMER BOMBS
  ────────────────────────────────────────────────────────────── */
  _decrementTimerBombs() {
    let exploded = false;
    this.cells.forEach(c => {
      if (c.type === CELL_TYPES.NORMAL && c.candyType === CANDY_TYPES.TIMER) {
        c.timerVal--;
        if (c.timerVal <= 0) {
          exploded = true;
          this._triggerGameOver('A candy bomb exploded! 💣');
        } else {
          this._renderCell(c);
          // Shake animation
          c.inner.animate([
            { transform: 'rotate(-5deg) scale(1.1)' },
            { transform: 'rotate(5deg) scale(1.1)'  },
            { transform: 'rotate(0) scale(1)'        },
          ], { duration: 350, easing: 'ease-out' });
        }
      }
    });
    return exploded;
  }

  /* ──────────────────────────────────────────────────────────────
     GAME STATUS CHECKS
  ────────────────────────────────────────────────────────────── */
  _checkObjective() {
    const cfg = this.config;

    let objectiveMet = false;
    if (cfg.objective === 'score') {
      objectiveMet = this.score >= cfg.target;
    } else if (cfg.objective === 'jelly') {
      objectiveMet = !this.cells.some(c => c.isJelly && !c.jellyCleared);
    } else if (cfg.objective === 'blocker') {
      objectiveMet = !this.cells.some(c => c.type === CELL_TYPES.BLOCKER);
    }

    if (objectiveMet) {
      this._triggerWin();
    } else if (this.moves <= 0) {
      this._triggerGameOver("No moves left! Better luck next level.");
    }
  }

  _triggerWin() {
    this.isLocked = true;

    // Record to AI engine
    this.aiEngine.recordResult({
      level: this.levelNum,
      score: this.score,
      moves_used: this.config.moves - this.moves,
      moves_total: this.config.moves,
      cascades: this.cascadeDepth,
      time_ms: Date.now() - this.levelStartTime,
    });

    // Stars
    const stars = this.config.stars;
    const starCount = this.score >= stars[2] ? 3 : this.score >= stars[1] ? 2 : 1;
    const starStr   = '⭐'.repeat(starCount) + '✩'.repeat(3 - starCount);

    this.particles.confetti(100);

    setTimeout(() => {
      this.modalEl.classList.remove('modal-hidden');
      this.modalTitle.textContent  = 'LEVEL COMPLETE!';
      this.modalStars.textContent  = starStr;
      this.modalBody.textContent   = `Level ${this.levelNum} cleared! ${starCount === 3 ? '🎉 Perfect!' : 'Keep going!'}`;
      this.modalScore.textContent  = this.score.toLocaleString();
      this.modalBtn.textContent    = 'NEXT LEVEL ▶';
      this.modalBtn.dataset.action = 'next';
    }, 600);
  }

  _triggerGameOver(reason) {
    this.isLocked = true;
    setTimeout(() => {
      this.modalEl.classList.remove('modal-hidden');
      this.modalTitle.textContent  = 'GAME OVER';
      this.modalStars.textContent  = '💔';
      this.modalBody.textContent   = reason;
      this.modalScore.textContent  = this.score.toLocaleString();
      this.modalBtn.textContent    = '↺ RETRY';
      this.modalBtn.dataset.action = 'retry';
    }, 400);
  }

  _onModalBtn() {
    this.modalEl.classList.add('modal-hidden');
    if (this.modalBtn.dataset.action === 'next') {
      this._startLevel(this.levelNum + 1);
    } else {
      this._startLevel(this.levelNum);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     HUD HELPERS
  ────────────────────────────────────────────────────────────── */
  _updateScoreDisplay() {
    this.scoreEl.textContent = this.score.toLocaleString();
    this._bumpAnim(this.scoreEl);
    // Update progress
    const pct = Math.min(100, Math.round((this.score / this.config.target) * 100));
    this.progressEl.style.width = pct + '%';
  }

  _updateMovesDisplay() {
    this.movesEl.textContent = this.moves;
    this._bumpAnim(this.movesEl);
  }

  _bumpAnim(el) {
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 400);
  }
}

/* ═══════════════════════════════════════════════════════════════
   §9  BOOTSTRAP — preload all SVGs then start the game
═══════════════════════════════════════════════════════════════ */
CandyRenderer.preload().then(() => {
  window._game = new GameController();
}).catch(() => {
  // If preload fails for any reason, still boot the game (uses fallback renderer)
  window._game = new GameController();
});

}); // DOMContentLoaded
