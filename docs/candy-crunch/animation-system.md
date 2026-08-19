# Candy Crunch 3D — Animation System & Deformation Engine

## Overview
The Animation System powers frame-rate independent physics animations, dynamic squash and stretch, camera choreography, and cascade sequencing.

## Core Components

### 1. Tween Engine & Profiles (`AnimationEngine.ts`)
Supports physics-driven animation profiles:
- `SWAP`: Directional squash and stretch (horizontal/vertical).
- `FALL`: Vertical stretch during fall with custom acceleration curves.
- `LAND`: Compression bounce settling back to unit scale.
- `MATCH`: Anticipation pop followed by scale contraction.
- `SPECIAL_CREATE`: Elastic pop-in animation.
- `VICTORY`: Elevation and elastic scale-up.

### 2. Cascade Animation Controller (`CascadeAnimationController.ts`)
- Decouples visual cascade timing from backend game logic.
- Orchestrates multi-step cascade reactions, camera punches, and lighting escalations.

### 3. Camera Choreography (`CameraManager.ts`)
- **Auto-Framing**: Dynamic board size compensation (`frameBoard`) for 5x5 up to 12x12 boards.
- **Camera Punch**: Impulse feedback on matches and combos.
- **Screen Shake**: Sinusoidal offset during explosions and special combos.
- **Victory Transition**: Smooth camera dolly for victory scenes.
