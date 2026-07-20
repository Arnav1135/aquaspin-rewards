// src/engine/debug/Logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private static currentLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

  public static setLogLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  public static debug(tag: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG][${tag}]`, ...args);
    }
  }

  public static info(tag: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[INFO][${tag}]`, ...args);
    }
  }

  public static warn(tag: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN][${tag}]`, ...args);
    }
  }

  public static error(tag: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR][${tag}]`, ...args);
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }
}
