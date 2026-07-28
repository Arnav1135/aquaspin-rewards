import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';

export type QualityTier = 'Ultra' | 'High' | 'Medium' | 'Low' | 'Potato';

interface StabilityContextState {
  tier: QualityTier;
  fps: number;
  recoveries: number;
  dpr: number;
  shadows: boolean;
  postProcess: boolean;
}

const defaultState: StabilityContextState = {
  tier: 'High',
  fps: 60,
  recoveries: 0,
  dpr: window.devicePixelRatio || 1,
  shadows: true,
  postProcess: true,
};

const StabilityContext = createContext<StabilityContextState>(defaultState);

export const useStability = () => useContext(StabilityContext);

// ----------------------------------------------------------------------------
// 1. Error Boundary
// ----------------------------------------------------------------------------
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRecover?: () => void;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

export class RenderErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Stability Engine caught render loop exception:', error, errorInfo);
    // In a real app, send to Sentry/Datadog here.
  }

  recover = () => {
    this.setState({ hasError: false });
    if (this.props.onRecover) this.props.onRecover();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d', color: '#ff6b6b', zIndex: 9999 }}>
          <h3>Graphics Engine Fault Detected</h3>
          <p>The AI Stability Engine intercepted a crash.</p>
          <button onClick={this.recover} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Force Recover & Reboot Loop
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ----------------------------------------------------------------------------
// 1.5 Watchdog Hook
// ----------------------------------------------------------------------------
export function useWatchdog(thresholdMs = 1500) {
  const lastFrameTime = useRef(performance.now());
  const [stalled, setStalled] = useState(false);

  useFrame(() => {
    lastFrameTime.current = performance.now();
    if (stalled) setStalled(false);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.now() - lastFrameTime.current > thresholdMs) {
        console.error('Stability Engine Watchdog: Frame stall detected!');
        setStalled(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [thresholdMs]);

  return stalled;
}

// ----------------------------------------------------------------------------
// 2. Adaptive Quality Context Provider (Wraps outside Canvas)
// ----------------------------------------------------------------------------
interface StabilityProviderProps {
  children: React.ReactNode;
}

export const StabilityProvider: React.FC<StabilityProviderProps> = ({ children }) => {
  const [tier, setTier] = useState<QualityTier>('High');
  const [fps, setFps] = useState(60);
  const [recoveries, setRecoveries] = useState(0);
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);
  const [isContextLost, setIsContextLost] = useState(false);

  // Handle global unhandled promise rejections
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.warn('Stability Engine: Unhandled Rejection:', event.reason);
      setRecoveries(r => r + 1);
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  // WebGL Context Loss Recovery
  useEffect(() => {
    // Note: React Three Fiber handles webglcontextlost automatically to some extent,
    // but we add a custom listener to the document to show the recovery UI
    const onContextLost = (e: Event) => {
      console.error('Stability Engine: WebGL Context Lost!');
      setIsContextLost(true);
      setRecoveries(r => r + 1);
      setTier('Low');
      setDpr(1);
    };

    const onContextRestored = () => {
      console.log('Stability Engine: WebGL Context Restored!');
      setIsContextLost(false);
    };

    window.addEventListener('webglcontextlost', onContextLost, true);
    window.addEventListener('webglcontextrestored', onContextRestored, true);

    return () => {
      window.removeEventListener('webglcontextlost', onContextLost, true);
      window.removeEventListener('webglcontextrestored', onContextRestored, true);
    };
  }, []);

  const shadows = tier !== 'Potato' && tier !== 'Low';
  const postProcess = tier === 'Ultra' || tier === 'High';

  const value = { tier, fps, recoveries, dpr, shadows, postProcess };

  if (isContextLost) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', zIndex: 9999 }}>
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mb-4" />
        <p>Reconnecting Graphics Engine...</p>
      </div>
    );
  }

  // We expose setTier, setFps, setDpr etc. to the children via a hidden ref or custom events in a real complex app,
  // but for simplicity here we will pass them down to a special component inside the Canvas.
  return (
    <StabilityContext.Provider value={value}>
      {children}
      {/* We render a hidden event listener bridge here */}
      <StabilityBridge setTier={setTier} setFps={setFps} setDpr={setDpr} setRecoveries={setRecoveries} />
    </StabilityContext.Provider>
  );
};

// Bridge to allow the inner R3F component to update the outer React Context
const StabilityBridge = ({ setTier, setFps, setDpr, setRecoveries }: any) => {
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.type === 'incline') {
        setTier((prev: QualityTier) => {
          if (prev === 'Potato') { setDpr(1); return 'Low'; }
          if (prev === 'Low') { setDpr(1.5); return 'Medium'; }
          if (prev === 'Medium') { setDpr(window.devicePixelRatio || 2); return 'High'; }
          if (prev === 'High') { return 'Ultra'; }
          return prev;
        });
      } else if (e.detail.type === 'decline') {
        setTier((prev: QualityTier) => {
          if (prev === 'Ultra') return 'High';
          if (prev === 'High') { setDpr(1.5); return 'Medium'; }
          if (prev === 'Medium') { setDpr(1); return 'Low'; }
          if (prev === 'Low') { setDpr(0.75); return 'Potato'; }
          return prev;
        });
        setRecoveries((r: number) => r + 1);
      } else if (e.detail.type === 'fps') {
        setFps(Math.round(e.detail.fps));
      }
    };
    window.addEventListener('stability-update' as any, handler);
    return () => window.removeEventListener('stability-update' as any, handler);
  }, [setTier, setFps, setDpr, setRecoveries]);
  return null;
};

// ----------------------------------------------------------------------------
// 2.5 R3F Monitor (Must be placed inside <Canvas>)
// ----------------------------------------------------------------------------
export const StabilityMonitorR3F: React.FC = () => {
  const handleIncline = useCallback(() => {
    window.dispatchEvent(new CustomEvent('stability-update', { detail: { type: 'incline' } }));
  }, []);

  const handleDecline = useCallback(() => {
    window.dispatchEvent(new CustomEvent('stability-update', { detail: { type: 'decline' } }));
  }, []);

  return (
    <PerformanceMonitor onIncline={handleIncline} onDecline={handleDecline} onChange={({ fps }) => {
      window.dispatchEvent(new CustomEvent('stability-update', { detail: { type: 'fps', fps } }));
    }}>
      {null}
    </PerformanceMonitor>
  );
};

// ----------------------------------------------------------------------------
// 3. Debug HUD
// ----------------------------------------------------------------------------
export const StabilityDebugHUD: React.FC = () => {
  const { tier, fps, recoveries, dpr } = useStability();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', color: '#0f0',
      padding: '10px', borderRadius: '8px', fontFamily: 'monospace',
      fontSize: '11px', border: '1px solid #0f0', pointerEvents: 'none'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#fff' }}>AI Stability Engine</div>
      <div>FPS: {fps}</div>
      <div>Quality Tier: {tier}</div>
      <div>DPR Cap: {dpr.toFixed(2)}</div>
      <div>Recoveries: {recoveries}</div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 4. Object Pool (Helper for heavy instancing/particles)
// ----------------------------------------------------------------------------
export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  
  constructor(private factory: () => T, initialSize: number) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    let item = this.pool.pop();
    if (!item) {
      console.warn('Stability Engine: Object pool exhausted, creating new instance.');
      item = this.factory();
    }
    this.active.add(item);
    return item;
  }

  release(item: T) {
    if (this.active.has(item)) {
      this.active.delete(item);
      this.pool.push(item);
    }
  }
}
