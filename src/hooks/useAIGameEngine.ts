// src/hooks/useAIGameEngine.ts
import { useEffect, useState, useCallback } from 'react';
import { AGEA, AIGameEngineInstance, GameGenre, VisualStyle } from '../engine/AIGameEngineArchitect';
import toast from 'react-hot-toast';

export function useAIGameEngine(
  gameId: string,
  title: string,
  genre: GameGenre,
  style: VisualStyle
) {
  const [engine, setEngine] = useState<AIGameEngineInstance | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // 1. Trigger AAGEI Onboarding Pipeline
    const instance = AGEA.onboardGame(gameId, title, genre, style);
    setEngine(instance);

    // 2. Subscribe to autonomous 24/7 AI updates
    const unsubscribe = AGEA.subscribe(() => {
      setTick(t => t + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [gameId, title, genre, style]);

  // Self-Healing Error Boundary Injection simulation
  const triggerSimulatedError = useCallback((message: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    if (!engine) return;

    AGEA.logEvent('RUNTIME_EXCEPTION', `[${title}] Caught exception: ${message}`);
    
    // Inject grace recovery log
    engine.errorLog.unshift({
      timestamp: new Date().toLocaleTimeString(),
      message,
      severity,
      solved: false
    });

    toast.error(`⚠️ Error: ${message}. AI Boundary recovering...`, {
      style: { background: '#1c1010', color: '#ff7373', border: '1px solid rgba(255,115,115,0.3)' }
    });

    // Auto-heal after a small delay
    setTimeout(() => {
      const idx = engine.errorLog.findIndex(e => e.message === message);
      if (idx >= 0) {
        engine.errorLog[idx].solved = true;
        AGEA.logEvent('SELF_HEALING', `[${title}] Context restored to last stable state checkpoint.`);
        toast.success(`✅ AI recovered stable state!`, {
          style: { background: '#0a140d', color: '#66f27b', border: '1px solid rgba(102,242,123,0.3)' }
        });
        setTick(t => t + 1);
      }
    }, 2000);

    setTick(t => t + 1);
  }, [engine, title]);

  return {
    engine,
    triggerSimulatedError,
    activeUpgrades: engine ? Object.values(engine.modules).filter(m => m.version !== '1.0.0').length : 0,
    lodScale: engine ? engine.lodScale : 1.0,
    upscalingActive: engine ? engine.upscalingEnabled : false,
    rolloutProgress: engine ? engine.rolloutProgress : 0.05,
    tick
  };
}
