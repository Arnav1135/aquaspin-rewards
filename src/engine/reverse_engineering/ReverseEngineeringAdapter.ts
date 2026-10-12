// src/engine/reverse_engineering/ReverseEngineeringAdapter.ts
/**
 * Reverse-Engineering Adapter & Integration Engine
 * Standardized bridge for ingesting, adapting, and hardening external games into Aqua Blue.
 */

import { useRef, useEffect, useCallback } from 'react';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

// ==========================================
// 1. GAME LOOP CONTROLLER
// ==========================================

export interface GameLoopOptions {
  targetFps?: number;
  maxDeltaMs?: number;
  onUpdate: (deltaSeconds: number, totalTime: number) => void;
  onRender?: () => void;
}

export class ReverseEngineGameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private totalTime = 0;
  private isRunning = false;
  private targetDeltaMs: number;
  private maxDeltaMs: number;
  private onUpdate: (delta: number, total: number) => void;
  private onRender?: () => void;

  constructor(options: GameLoopOptions) {
    this.targetDeltaMs = options.targetFps ? 1000 / options.targetFps : 0;
    this.maxDeltaMs = options.maxDeltaMs || 100; // Clamp delta to avoid huge jumps
    this.onUpdate = options.onUpdate;
    this.onRender = options.onRender;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (currentTime: number) => {
    if (!this.isRunning) return;

    let deltaMs = currentTime - this.lastTime;
    if (deltaMs > this.maxDeltaMs) {
      deltaMs = this.maxDeltaMs; // prevent spiral of death on tab unfocus
    }

    if (!this.targetDeltaMs || deltaMs >= this.targetDeltaMs) {
      this.lastTime = currentTime;
      const deltaSec = deltaMs / 1000;
      this.totalTime += deltaSec;

      this.onUpdate(deltaSec, this.totalTime);
      if (this.onRender) {
        this.onRender();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

// ==========================================
// 2. ECONOMY & PAYOUT BRIDGE
// ==========================================

export interface PayoutResult {
  success: boolean;
  won: boolean;
  earnedAmount: number;
  xpEarned: number;
}

export class ReverseEngineEconomyBridge {
  /**
   * Deducts user's wager upfront before starting active gameplay.
   * Throws an error or returns false if balance is insufficient.
   */
  public static async deductBet(
    userId: string | undefined,
    isGuest: boolean,
    userBalance: number,
    betAmount: number
  ): Promise<boolean> {
    if (betAmount <= 0) return true;

    if (userBalance < betAmount) {
      toast.error('Insufficient tokens to place bet');
      return false;
    }

    if (userId && !isGuest) {
      try {
        await secureUpdateTokens(userId, -betAmount);
      } catch (err: any) {
        toast.error(err?.message || 'Transaction failed');
        return false;
      }
    }

    audio.play('ui', 'chip');
    return true;
  }

  /**
   * Settles the round: awards winnings and XP.
   * Note: betAmount is passed as 0 to secureRecordGameResult because it was already debited upfront.
   */
  public static async settleGame(
    userId: string | undefined,
    isGuest: boolean,
    totalBet: number,
    winMultiplier: number,
    customWinAmount?: number
  ): Promise<PayoutResult> {
    const earnedAmount = customWinAmount !== undefined ? customWinAmount : Math.floor(totalBet * winMultiplier);
    const won = earnedAmount > totalBet;
    const xpRate = won ? 0.15 : 0.05;
    const xpEarned = Math.max(1, Math.floor(totalBet * xpRate));

    if (earnedAmount > 0) {
      audio.play('ui', 'win');
      toast.success(`You won ${earnedAmount.toLocaleString()} tokens!`);
    } else {
      audio.play('ui', 'lose');
    }

    if (userId && !isGuest) {
      try {
        await secureRecordGameResult({
          userId,
          betAmount: 0, // Zero to prevent double deduction
          earnedAmount,
          xpEarned
        });
      } catch (err) {
        console.error('[ReverseEngineEconomyBridge] Error recording game result:', err);
      }
    }

    return {
      success: true,
      won,
      earnedAmount,
      xpEarned
    };
  }
}

// ==========================================
// 3. CANVAS & INPUT NORMALIZER
// ==========================================

export interface NormalizedPoint {
  x: number;
  y: number;
}

export class ReverseEngineInputNormalizer {
  /**
   * Converts mouse or touch event coordinates to canvas space with DPR correction.
   */
  public static getCanvasCoordinates(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ): NormalizedPoint {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /**
   * Configures canvas for sharp Retina / HiDPI display.
   */
  public static setupHiDPI(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): CanvasRenderingContext2D | null {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    return ctx;
  }
}

// ==========================================
// 4. REACT COMPONENT LIFECYCLE HOOK
// ==========================================

export function useReverseEngineLifecycle() {
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  const safeTimeout = useCallback((callback: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  return {
    isMounted: () => isMountedRef.current,
    safeTimeout
  };
}
