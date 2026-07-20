// src/engine/analytics/TelemetryTracker.ts

export interface TelemetryEvent {
  name: string;
  data?: Record<string, any>;
  timestamp: string;
}

export class TelemetryTracker {
  private static instance: TelemetryTracker;
  private queue: TelemetryEvent[] = [];
  private endpointUrl?: string;

  private constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.flush(), 5000);
    }
  }

  public static getInstance(): TelemetryTracker {
    if (!TelemetryTracker.instance) {
      TelemetryTracker.instance = new TelemetryTracker();
    }
    return TelemetryTracker.instance;
  }

  public setEndpoint(url: string) {
    this.endpointUrl = url;
  }

  public trackEvent(name: string, data?: Record<string, any>) {
    const event: TelemetryEvent = {
      name,
      data,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(event);
    if (this.queue.length >= 20) {
      this.flush();
    }
  }

  private flush() {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    if (this.endpointUrl) {
      fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      }).catch(() => {
        // Silently handle fire-and-forget failure
      });
    }
  }
}

export const telemetryTracker = TelemetryTracker.getInstance();
