// src/engine/systems/ProgressionTracker.ts

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 - 100
}

export class ProgressionTracker {
  private static instance: ProgressionTracker;
  private achievements: Map<string, Achievement> = new Map();

  private constructor() {}

  public static getInstance(): ProgressionTracker {
    if (!ProgressionTracker.instance) {
      ProgressionTracker.instance = new ProgressionTracker();
    }
    return ProgressionTracker.instance;
  }

  public registerAchievement(achievement: Omit<Achievement, 'unlocked' | 'progress'>) {
    if (!this.achievements.has(achievement.id)) {
      this.achievements.set(achievement.id, {
        ...achievement,
        unlocked: false,
        progress: 0,
      });
    }
  }

  public setProgress(id: string, progress: number): boolean {
    const ach = this.achievements.get(id);
    if (!ach || ach.unlocked) return false;

    ach.progress = Math.min(100, Math.max(0, progress));
    if (ach.progress >= 100) {
      ach.unlocked = true;
      ach.unlockedAt = new Date().toISOString();
      return true; // Newly unlocked
    }
    return false;
  }

  public getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }
}

export const progressionTracker = ProgressionTracker.getInstance();
