// src/lib/reliability/reliabilityCore.ts

export type DiagnosticCategory = 
  | "audio_latency" 
  | "render_lag" 
  | "input_lag" 
  | "animation_desync" 
  | "error" 
  | "rendering_bug" 
  | "quality_downgrade";

export interface DiagnosticEvent {
  timestamp: number;
  gameId: string;
  deviceInfo: {
    browser: string;
    os: string;
    platform: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };
  category: DiagnosticCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  autoCorrected: boolean;
  correctionApplied?: string;
  stackTrace?: string;
}

type EventListener = (event: DiagnosticEvent) => void;

class ReliabilityCore {
  private buffer: DiagnosticEvent[] = [];
  private listeners: Set<EventListener> = new Set();
  private maxBufferSize = 50;
  private flushIntervalMs = 5000;
  private cachedDeviceInfo: DiagnosticEvent['deviceInfo'] | null = null;

  constructor() {
    this.startFlushTimer();
  }

  private getDeviceInfo() {
    if (this.cachedDeviceInfo) return this.cachedDeviceInfo;
    
    // Basic browser/OS inference for lightweight telemetry
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const hwConcurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
    const deviceMemory = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined;
    
    this.cachedDeviceInfo = {
      browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other',
      os: ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'MacOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Other',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      hardwareConcurrency: hwConcurrency,
      deviceMemory: deviceMemory
    };
    return this.cachedDeviceInfo;
  }

  public logEvent(event: Omit<DiagnosticEvent, 'timestamp' | 'deviceInfo'>) {
    const fullEvent: DiagnosticEvent = {
      ...event,
      timestamp: Date.now(),
      deviceInfo: this.getDeviceInfo()
    };

    this.buffer.push(fullEvent);
    this.notifyListeners(fullEvent);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  public subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: DiagnosticEvent) {
    this.listeners.forEach(l => l(event));
  }

  private startFlushTimer() {
    if (typeof window === 'undefined') return;
    window.setInterval(() => this.flush(), this.flushIntervalMs);
  }

  private flush() {
    if (this.buffer.length === 0) return;
    
    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ReliabilityCore] Flushed ${eventsToFlush.length} events.`);
    }
    
    if (typeof window !== 'undefined') {
      const history = (window as any).__RELIABILITY_HISTORY || [];
      (window as any).__RELIABILITY_HISTORY = [...history, ...eventsToFlush].slice(-1000); // Keep last 1000
    }
  }
  
  public getHistory(): DiagnosticEvent[] {
    if (typeof window !== 'undefined') {
      return (window as any).__RELIABILITY_HISTORY || [];
    }
    return [];
  }
}

export const reliabilityCore = new ReliabilityCore();
