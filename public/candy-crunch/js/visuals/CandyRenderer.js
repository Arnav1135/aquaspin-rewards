import * as PIXI from 'pixi.js';
import { CANDY_TYPES, CELL_TYPES, BLOCKER_TYPES, LAYER_TYPES, COLOR_PALETTE } from '../core/Constants.js';

export class CandyRenderer {
  static _cache = {};
  static _textures = {};
  static _loaded = false;

  /** Call once at startup — fetches all 42 SVGs in parallel */
  static async preload() {
    const files = [
      'basic_red', 'basic_orange', 'basic_yellow', 'basic_green', 'basic_blue', 'basic_purple',
      'striped_red', 'striped_orange', 'striped_yellow', 'striped_green', 'striped_blue', 'striped_purple',
      'wrapped_red', 'wrapped_orange', 'wrapped_yellow', 'wrapped_green', 'wrapped_blue', 'wrapped_purple',
      'special_bomb_red', 'special_bomb_orange', 'special_bomb_yellow', 'special_bomb_green', 'special_bomb_blue', 'special_bomb_purple',
      'special_fish_red', 'special_fish_orange', 'special_fish_yellow', 'special_fish_green', 'special_fish_blue', 'special_fish_purple',
      'special_swirl_red', 'special_swirl_orange', 'special_swirl_yellow', 'special_swirl_green', 'special_swirl_blue', 'special_swirl_purple',
      'special_mystery_red', 'special_mystery_orange', 'special_mystery_yellow', 'special_mystery_green', 'special_mystery_blue', 'special_mystery_purple',
    ];

    await Promise.all(files.map(async key => {
      try {
        const resp = await fetch(`/candy-crunch/${key}.svg`);
        if (resp.ok) {
          let text = await resp.text();
          text = text.replace('<svg ', '<svg style="width:100%;height:100%;display:block;overflow:visible;" ');
          CandyRenderer._cache[key] = text;
          
          // Generate a base texture directly from SVG Data URI
          const dataUri = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(text);
          CandyRenderer._textures[key] = PIXI.Texture.from(dataUri, {
            resourceOptions: { scale: 2 } // Increase scale for higher res rendering in WebGL
          });
        }
      } catch (e) {
        console.warn(`Failed to pre-fetch SVG: ${key}`, e);
      }
    }));
    CandyRenderer._loaded = true;
  }

  static _key(color, type) {
    switch (type) {
      case CANDY_TYPES.STRIPE_H:
      case CANDY_TYPES.STRIPE_V:  return `striped_${color}`;
      case CANDY_TYPES.WRAPPED:   return `wrapped_${color}`;
      case CANDY_TYPES.BOMB:      return `special_bomb_${color}`;
      case CANDY_TYPES.FISH:      return `special_fish_${color}`;
      case CANDY_TYPES.TIMER:     return `basic_${color}`;
      default:                    return `basic_${color}`;
    }
  }

  static getTexture(color, type = CANDY_TYPES.NORMAL) {
    const key = CandyRenderer._key(color, type);
    if (CandyRenderer._textures[key]) {
      return CandyRenderer._textures[key];
    }
    // Fallback: create a temporary texture if missing
    return PIXI.Texture.WHITE;
  }

  // Legacy DOM render method (keep for blockers/layers temporarily)
  static render(color, type = CANDY_TYPES.NORMAL) {
    const key = CandyRenderer._key(color, type);
    if (CandyRenderer._cache[key]) {
      return CandyRenderer._addGlow(CandyRenderer._cache[key], color);
    }
    return CandyRenderer._inlineFallback(color, type);
  }

  static _addGlow(svgText, color) {
    const p = COLOR_PALETTE[color] || {};
    const glow = p.glow || 'rgba(255,255,255,0.5)';
    return svgText.replace(
      /style="([^"]*width:100%[^"]*)"/,
      `style="$1;filter:drop-shadow(0 4px 10px ${glow})"`
    );
  }

  static renderTimer(color, countdown) {
    const base = CandyRenderer.render(color, CANDY_TYPES.NORMAL);
    const timerOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"
           style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;">
        <circle cx="100" cy="120" r="38" fill="rgba(20,10,30,0.88)" stroke="white" stroke-width="3"/>
        <text x="100" y="132" font-size="38" font-weight="900"
              fill="${countdown <= 3 ? '#ff2244' : '#ffe066'}"
              font-family="Fredoka One,sans-serif" text-anchor="middle">${countdown}</text>
      </svg>`;
    return `<div style="position:relative;width:100%;height:100%;">${base}${timerOverlay}</div>`;
  }

  static renderBlocker(type, strength) {
    switch (type) {
      case BLOCKER_TYPES.FROSTING: {
        const fill = strength === 2 ? '#d1f0f7' : '#ffffff';
        const stroke = strength === 2 ? '#00acc1' : '#ffa726';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <ellipse cx="100" cy="180" rx="55" ry="12" fill="rgba(0,0,0,0.2)"/>
          <rect x="25" y="25" width="150" height="150" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="8"/>
          <path d="M45,100 Q100,30 155,100 Q100,170 45,100 Z" fill="rgba(255,255,255,0.55)"/>
          <circle cx="100" cy="100" r="20" fill="#e91e63"/>
        </svg>`;
      }
      case BLOCKER_TYPES.CHOCOLATE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <rect x="18" y="18" width="164" height="164" rx="18" fill="#4e2f1d" stroke="#27100a" stroke-width="6"/>
          <rect x="30" y="30" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="108" y="30" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="30" y="108" width="62" height="62" rx="8" fill="#5d3a24"/>
          <rect x="108" y="108" width="62" height="62" rx="8" fill="#5d3a24"/>
        </svg>`;
      case BLOCKER_TYPES.LICORICE:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;">
          <circle cx="100" cy="100" r="82" fill="#1a1a1a" stroke="#000" stroke-width="6"/>
          <circle cx="100" cy="100" r="60" fill="none" stroke="#333" stroke-width="8"/>
          <circle cx="100" cy="100" r="38" fill="none" stroke="#4d4d4d" stroke-width="7"/>
        </svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="width:100%;height:100%;display:block;"><rect x="20" y="20" width="160" height="160" rx="20" fill="#666"/></svg>`;
    }
  }

  static renderLayerOverlay(layerType, value) {
    if (value <= 0) return '';

    switch (layerType) {
      case LAYER_TYPES.ICE:
        // Frosted glass overlay
        return `<div class="layer-ice" style="position:absolute;inset:0;background:rgba(224,247,250,0.65);border-radius:12px;backdrop-filter:blur(3px);border:2px solid rgba(255,255,255,0.7);box-shadow:inset 0 0 8px rgba(255,255,255,0.9);pointer-events:none;z-index:3;"></div>`;
      case LAYER_TYPES.CHAIN:
        // Metal chain graphic
        return `
          <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;">
            <path d="M10,10 L90,90 M90,10 L10,90" stroke="#78909c" stroke-width="8" stroke-linecap="round" opacity="0.85"/>
            <path d="M10,10 L90,90 M90,10 L10,90" stroke="#b0bec5" stroke-width="3" stroke-linecap="round" stroke-dasharray="8,6" opacity="0.95"/>
          </svg>`;
      case LAYER_TYPES.LOCK:
        // Lock keyhole graphic
        return `
          <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;">
            <rect x="35" y="45" width="30" height="30" rx="6" fill="#ffd54f" stroke="#ffb300" stroke-width="3"/>
            <circle cx="50" cy="60" r="4" fill="#3e2723"/>
            <path d="M40,45 L40,30 A10,10 0 0,1 60,30 L60,45" fill="none" stroke="#cfd8dc" stroke-width="4"/>
          </svg>`;
      case LAYER_TYPES.JELLY:
        // Translucent jelly floor
        const alpha = value === 2 ? 0.45 : 0.25;
        return `<div class="layer-jelly" style="position:absolute;inset:2px;background:rgba(233,30,99,${alpha});border-radius:16px;border:3px dashed rgba(233,30,99,0.75);box-shadow:0 0 8px rgba(233,30,99,0.5);pointer-events:none;z-index:1;"></div>`;
      default:
        return '';
    }
  }

  static _inlineFallback(color, type) {
    const p = COLOR_PALETTE[color] || COLOR_PALETTE.red;
    const id = `fb_${color}_${Math.random().toString(36).slice(2, 5)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"
       style="width:100%;height:100%;display:block;filter:drop-shadow(0 4px 8px ${p.glow})">
      <defs>
        <radialGradient id="fbg_${id}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${p.light}"/>
          <stop offset="50%" stop-color="${p.primary}"/>
          <stop offset="100%" stop-color="${p.dark}"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="url(#fbg_${id})" stroke="${p.mid}" stroke-width="3"/>
      <circle cx="128" cy="62" r="10" fill="white" opacity="0.8"/>
    </svg>`;
  }
}
