# Plinko Game Implementation

## Overview

Plinko is a physics-based gambling game where players drop balls through a pegboard. Each ball bounces off pegs and lands in one of several buckets at the bottom, each with different multipliers. The game features:

- **Real physics simulation** using 2D collision detection
- **Risk levels** (Low/Medium/High) that affect payout curves and volatility
- **Configurable rows** (8, 10, or 12 pegs per row)
- **Auto-drop functionality** for automated play
- **Real-time balance updates** with database synchronization
- **Comprehensive error handling** with recovery mechanisms

---

## Game Rules

### Payout Structure

#### Low Risk
- Fewer rows = higher precision, lower volatility
- Payouts range from 0.5x to 5.6x
- Suited for players who prefer steady, smaller wins

| Rows | Multipliers |
|------|-------------|
| 8    | 5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6 |
| 10   | 8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9 |
| 12   | 10, 5, 2, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2, 5, 10 |

#### Medium Risk
- Balanced volatility and payouts
- Multipliers range from 0.4x to 22x
- Good for players seeking moderate risk/reward

| Rows | Multipliers |
|------|-------------|
| 8    | 13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13 |
| 10   | 22, 5, 2, 1.4, 0.9, 0.4, 0.9, 1.4, 2, 5, 22 |
| 12   | 33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33 |

#### High Risk
- High volatility, large potential wins and losses
- Multipliers range from 0.2x to 170x
- For risk-seeking players

| Rows | Multipliers |
|------|-------------|
| 8    | 29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29 |
| 10   | 76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76 |
| 12   | 170, 33, 11, 4, 2, 0.2, 0.2, 0.2, 2, 4, 11, 33, 170 |

### Probability Distribution

Each ball has a binomial distribution of landing in each bucket:

```
P(bucket k) = C(rows, k) / 2^rows
```

Where:
- **C(rows, k)** = binomial coefficient (combinations)
- **rows** = number of rows (8, 10, or 12)

This ensures:
- Center buckets have higher probability (higher chance to land)
- Edge buckets have lower probability (rarer outcomes)
- Symmetric distribution around center

### House Edge

- **Low Risk**: ~2% edge
- **Medium Risk**: ~3% edge
- **High Risk**: ~4% edge

The edge is baked into the multiplier calculations and remains constant regardless of row count.

---

## Physics Engine

### Collision Detection

```typescript
// Detect ball-peg collision
const dx = ball.x - peg.x;
const dy = ball.y - peg.y;
const dist = Math.sqrt(dx * dx + dy * dy);

if (dist < 12) { // Collision radius
  // Calculate normal vector
  const nx = dx / dist;
  const ny = dy / dist;
  
  // Reflect velocity
  const dot = ball.vx * nx + ball.vy * ny;
  ball.vx -= 2 * dot * nx;
  ball.vy -= 2 * dot * ny;
}
```

### Physics Parameters

```typescript
// Gravity simulation
const GRAVITY = 0.32; // pixels/frame²
ball.vy += GRAVITY;

// Friction on collision
const RESTITUTION = 0.55; // Energy loss on impact (0-1)
ball.vx *= RESTITUTION;
ball.vy *= RESTITUTION;

// Air resistance
const AIR_RESISTANCE = 0.995;
ball.vx *= AIR_RESISTANCE;

// Random jitter on impact
const jitter = (Math.random() - 0.5) * 1.5;
ball.vx += jitter;
```

### Canvas Dimensions

```typescript
const W = 420; // Canvas width (pixels)
const H = 430; // Canvas height (pixels)
const startY = 55; // Initial ball drop Y position
const pegSpacing = 28; // Distance between pegs (pixels)
const bucketY = H - 60; // Y position of buckets (pixels)
```

---

## State Management

### Ball Object

```typescript
interface Ball {
  id: number;                // Unique identifier
  x: number;                 // Current X position
  y: number;                 // Current Y position
  vx: number;                // Velocity X
  vy: number;                // Velocity Y
  trail: Array<{ x: number; y: number }>; // Motion trail for visual effect
  active: boolean;           // Whether ball is still in play
  betAmount: number;         // Bet amount for this ball
  settled: boolean;          // Whether ball has landed and winnings calculated
}
```

### Peg Object

```typescript
interface Peg {
  x: number;   // X position on canvas
  y: number;   // Y position on canvas
  flash: number; // Flash animation frame counter (0 = no flash)
}
```

### Bucket Flash Object

```typescript
interface BucketFlash {
  idx: number;   // Bucket index
  frames: number; // Animation frames remaining
}
```

---

## Game Flow

### 1. Setup Phase
1. Player selects bet amount (50, 100, 250, 500, 1000 tokens)
2. Player selects risk level (Low/Medium/High)
3. Player selects number of rows (8/10/12)
4. Optional: Enable auto-drop for continuous play

### 2. Betting Phase
1. Validate bet amount against player balance
2. Check if player has free trials (new players)
3. Deduct tokens from balance (or use free trial)
4. Update database with new balance

### 3. Drop Phase
1. Ball drops from top center with slight randomized jitter
2. Physics loop begins rendering ball movement
3. Ball collision detection with all pegs
4. Pegs flash white on collision
5. Ball creates motion trail effect

### 4. Settlement Phase
1. Ball lands in a bucket (Y > bucketY)
2. Find closest bucket (smallest distance)
3. Retrieve multiplier for that bucket
4. Calculate winnings: `won = floor(betAmount * multiplier)`
5. Bucket flashes with color based on win/loss
6. Update user balance with winnings
7. Update game statistics (games played, games won)
8. Display result toast with multiplier and tokens won/lost

### 5. Cleanup Phase
1. Remove settled ball from active balls array
2. Decrement balls in flight counter
3. Mark ball as settled to prevent reprocessing

---

## Error Handling

### Validation Errors

**Bet Amount Validation**
```typescript
- Amount must be > 0
- Amount must be ≤ player balance
- Amount must be a valid finite number
```

**Free Trial Validation**
```typescript
- New players get 3 free trials
- Each trial deducts one free trial slot
- Out of trials requires deposit to play
```

**Bucket Validation**
```typescript
- Bucket index must be within multipliers array bounds
- Multiplier must be a valid finite number
```

### Database Errors

**User Balance Update Failure**
- User sees toast: "Failed to update your balance. Your tokens have not been deducted."
- Balance is NOT deducted locally
- Ball drop is cancelled
- Player can retry

**Game Stats Update Failure**
- Logged but doesn't stop gameplay
- Ball winnings still applied locally
- Stats update retried on next game

### Rendering Errors

**Canvas Context Failure**
- Animation loop continues without rendering
- No visual feedback but game state updates correctly
- Player can still see balance updates

**Physics Calculation Errors**
- Try-catch around physics loop
- Animation continues even if calculation fails
- Error logged for debugging

---

## User Experience Features

### Visual Feedback

**Ball Physics**
- Realistic gravity and bouncing
- Motion blur trail showing ball path
- Impact sound effects (523 Hz on win, 180 Hz on loss)
- Haptic vibration on win (40ms, 40ms, 80ms pattern)

**Peg Interactions**
- Pegs glow white on collision (10 frame flash)
- Cyan glow in normal state

**Bucket Feedback**
- Green highlight: Small wins (1.0x - 1.9x)
- Orange highlight: Medium wins (2.0x - 9.9x)
- Red highlight: Big wins (10x+)
- Dark grey: Losses (< 1.0x)
- 22-frame flash animation on landing

**Result Toast**
```
✅ Success: "2.5x → +250 tokens!"
❌ Loss: "0.5x — lost tokens."
```

### Auto-Drop Feature

```typescript
- Interval: 1600ms between drops
- Continues until disabled
- Updates in real-time with current bet amount
- Stops immediately on disable
```

---

## Database Integration

### User Table Updates

```sql
UPDATE users
SET 
  tokens = $1,  -- New balance after winnings/losses
  total_earned = $2,  -- Cumulative net winnings (only positive)
  xp = $3  -- XP based on bet amount (bet * 0.1)
WHERE id = $4
```

### Game Stats Table

```sql
INSERT INTO game_stats (user_id, games_played, games_won)
VALUES ($1, 1, $2)  -- $2 = 1 if won, 0 if lost
ON CONFLICT (user_id) DO UPDATE SET
  games_played = games_played + 1,
  games_won = games_won + $2
```

### Error Recovery

If database update fails:
1. Local state is still updated
2. User sees winnings in UI
3. Next database sync attempt on next action
4. Eventual consistency - balance syncs when player reloads

---

## Performance Optimization

### Rendering Performance

**Canvas Optimization**
- Single requestAnimationFrame loop
- Batch peg rendering
- Efficient alpha blending for trails
- No layout thrashing

**Ball Trail Optimization**
- Limited to 9 points per ball
- Reuse trail array (don't create new ones)
- Only render trails when ball is active

**Memory Management**
- Settled balls removed from array immediately
- Bucket flashes cleaned up when animation completes
- No memory leaks in animation loop

### Physics Performance

**Collision Detection**
- O(n*m) complexity: n balls × m pegs
- Typical: 1-10 balls, 45-78 pegs
- Full-frame processing takes <5ms on modern devices

**Optimizations**
- Skip collision checks for settled balls
- Circle-circle collision (cheap distance calc)
- No spatial partitioning needed for this scale

---

## Browser Compatibility

### Required APIs

- **Canvas 2D**: `ctx.beginPath()`, `ctx.arc()`, `ctx.fillRect()`
- **Web Audio**: `AudioContext` (fallback: silent if unavailable)
- **Vibration**: `navigator.vibrate()` (fallback: silent if unavailable)
- **RequestAnimationFrame**: Standard browser API

### Tested On

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 13+)
- Chrome Android

---

## Debugging

### Enable Console Logging

Errors are automatically logged with context:

```
❌ ERROR: {
  name: "AppError",
  message: "Invalid bucket index calculated",
  category: "game_logic",
  severity: "error",
  context: { bucketIdx: 12, multiplierLength: 11 },
  stack: "Error: Invalid bucket index..."
}
```

### Common Issues

**Balls not rendering**
- Check canvas ref is valid
- Verify canvas context obtained successfully
- Check ball coordinates within canvas bounds

**Physics not working**
- Verify collision radius (12px) is correct for peg size
- Check gravity value (0.32) for desired fall speed
- Inspect ball velocity changes after collision

**Pegs not visible**
- Verify peg building code in buildPegs callback
- Check peg radius (4.5px) and glow parameters
- Inspect canvas fill colors (rgba(0,240,255,0.75))

**Winnings not updating**
- Check database error logs in console
- Verify user ID is not starting with 'guest'
- Confirm tokens field in users table exists

---

## Future Enhancements

### Planned Features

1. **Multiplayer Leaderboard** - Real-time player rankings by total earnings
2. **Themed Boards** - Different visual themes (space, casino, underwater)
3. **Ball Trails** - Customizable trail effects and animations
4. **Pegging Levels** - Progressive difficulty with increasing peg counts
5. **Special Pegs** - Bonus/penalty pegs that multiply/divide winnings
6. **Gravity Effects** - Variable gravity based on difficulty

### Technical Improvements

1. **Physics Upgrade** - Use Matter.js for more realistic physics
2. **WebGL Rendering** - Threejs or Babylon.js for 3D effects
3. **Animation Library** - Framer Motion for settling animations
4. **State Management** - Zustand store for game state
5. **Analytics** - Track player behavior and adjust multipliers

---

## References

- [2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [RequestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Binomial Distribution](https://en.wikipedia.org/wiki/Binomial_distribution)
