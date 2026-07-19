import React, { ReactNode } from 'react';
import { useProgress, Html } from '@react-three/drei';

/**
 * Phase 2 - Step 4: Asset Loading
 * Global loading screen overlay for assets.
 */
export function AssetLoaderScreen() {
  const { progress, item } = useProgress();

  return (
    <Html center zIndexRange={[100, 100]}>
      <div className="flex flex-col items-center justify-center p-8 bg-navy-900/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 min-w-[300px]">
        <h2 className="font-display font-bold text-xl text-neon-cyan mb-4 drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
          LOADING ENGINE...
        </h2>
        <div className="w-full bg-navy-800 rounded-full h-3 mb-2 overflow-hidden border border-navy-600">
          <div
            className="bg-gradient-to-r from-neon-cyan to-neon-purple h-3 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.8)]"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary font-mono">
          {progress.toFixed(0)}% • {item ? item.split('/').pop() : 'Preparing 3D environment'}
        </p>
      </div>
    </Html>
  );
}

export function AssetManager({ children }: { children: ReactNode }) {
  return (
    <React.Suspense fallback={<AssetLoaderScreen />}>
      {children}
    </React.Suspense>
  );
}
