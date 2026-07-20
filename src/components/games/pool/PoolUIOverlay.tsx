import React, { useState, useRef, useEffect } from 'react';
import { usePoolStore } from './store';

import { Button } from '@/components/ui/Button';
import { audioManager } from './AudioManager';

export function PoolUIOverlay({ onShoot }: { onShoot: (power: number) => void }) {
  const state = usePoolStore();
  const player = state.players[state.currentPlayer];
  const isSolid = player.group === 'solids';
  
  let groupText = 'Open Table';
  if (player.group) {
      groupText = isSolid ? 'Solids (1-7)' : 'Stripes (9-15)';
  }

  const [spinPos, setSpinPos] = useState({ x: 0, y: 0 });
  const [power, setPower] = useState(0);
  const spinRef = useRef<HTMLDivElement>(null);

  // Handle Drag to Aim
  useEffect(() => {
    if (state.gameState !== 'aiming') return;

    let isDragging = false;
    let lastX = 0;

    const handlePointerDown = (e: PointerEvent) => {
      audioManager.init(); // Initialize audio context on first interaction
      // Don't aim if clicking on UI elements
      if ((e.target as HTMLElement).closest('.pool-ui-element')) return;
      isDragging = true;
      lastX = e.clientX;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastX;
      lastX = e.clientX;
      // Adjust sensitivity as needed
      usePoolStore.getState().setAimAngle(usePoolStore.getState().aimAngle - deltaX * 0.01);
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [state.gameState]);

  // Handle Spin Drag
  const handleSpinPointer = (e: React.PointerEvent) => {
    if (e.buttons !== 1 || !spinRef.current) return;
    const rect = spinRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    // Normalize to -1 to 1
    let normX = x / centerX;
    let normY = y / centerY; // Y goes down in DOM, we might need to invert it based on physics needs
    
    // Clamp to circle
    const dist = Math.sqrt(normX * normX + normY * normY);
    if (dist > 1) {
      normX /= dist;
      normY /= dist;
    }
    
    setSpinPos({ x: normX, y: -normY }); // Invert Y so up is positive
    state.setSpin(normX, -normY);
  };


  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Main Menu Overlay */}
      {state.gameState === 'menu' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-50">
          <div className="text-center space-y-8 p-12 bg-slate-900/50 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tighter">
              AQUA POOL
            </h1>
            <p className="text-slate-400 max-w-sm mx-auto text-lg">
              Challenge a friend in a realistic 3D 8-ball pool experience.
            </p>
            <div className="pt-8">
              <Button 
                size="lg" 
                className="w-64 h-16 text-xl font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-[0_0_30px_rgba(5,150,105,0.3)] transition-all hover:scale-105"
                onClick={() => {
                  audioManager.init();
                  state.startGame();
                }}
              >
                PLAY 1v1 LOCAL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {state.gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-50">
          <div className="text-center space-y-8 p-12 bg-slate-900/50 rounded-3xl border border-white/10 shadow-2xl">
            <h1 className="text-6xl font-black text-white tracking-tighter">
              PLAYER {state.winner} WINS!
            </h1>
            <div className="pt-8 flex gap-4 justify-center">
              <Button 
                size="lg" 
                variant="ghost"
                className="w-48 h-14 text-lg font-bold border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  state.startGame();
                }}
              >
                PLAY AGAIN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Match Status Banner (Hide in Menu) */}
      {state.gameState !== 'menu' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
         <div className="bg-slate-900/80 backdrop-blur px-6 py-2 rounded-full border border-slate-700/50 shadow-2xl flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${state.currentPlayer === 1 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className={`font-bold ${state.currentPlayer === 1 ? 'text-white' : 'text-slate-400'}`}>Player 1</span>
            <span className="text-slate-500 mx-2">VS</span>
            <span className={`font-bold ${state.currentPlayer === 2 ? 'text-white' : 'text-slate-400'}`}>Player 2</span>
            <span className={`w-3 h-3 rounded-full ${state.currentPlayer === 2 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
         </div>
         {state.gameState !== 'gameOver' && (
           <div className="bg-slate-900/80 backdrop-blur px-4 py-1 rounded-full border border-slate-700/50 shadow-lg text-sm text-amber-400 font-medium">
             Target: {groupText}
           </div>
         )}
         </div>
      )}

      {/* Game State Feedback */}
      {state.gameState === 'ballInHand' && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-2xl font-black text-red-500 bg-black/50 px-6 py-3 rounded-xl pointer-events-none uppercase tracking-widest animate-pulse">
          Foul - Ball In Hand
        </div>
      )}

      <div className="flex justify-between items-end mb-4">
        
        {/* Spin Selector */}
        <div className={`pool-ui-element transition-opacity ${state.gameState === 'aiming' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} flex flex-col items-center gap-2`}>
           <span className="text-white text-xs font-bold uppercase tracking-wider">Spin (English)</span>
           <div 
             ref={spinRef}
             className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-700 relative cursor-crosshair overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"
             onPointerDown={handleSpinPointer}
             onPointerMove={handleSpinPointer}
           >
             {/* Center crosshair */}
             <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-1/2" />
             <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2" />
             
             {/* Spin dot */}
             <div 
               className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.8)]"
               style={{
                 left: `calc(50% + ${spinPos.x * 50}% - 8px)`,
                 top: `calc(50% - ${spinPos.y * 50}% - 8px)`
               }}
             />
           </div>
           <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={() => { setSpinPos({x:0, y:0}); state.setSpin(0,0); }}>Reset</Button>
        </div>

        {/* Power Meter & Shoot */}
        <div className={`pool-ui-element transition-opacity ${state.gameState === 'aiming' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} flex gap-6 items-end bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-xl`}>
           <div className="h-48 w-12 flex flex-col-reverse relative bg-slate-950 rounded-full border border-slate-800 p-1">
              <div 
                className="w-full rounded-full bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 transition-all duration-75"
                style={{ height: `${power * 100}%` }}
              />
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={power}
                onChange={(e) => {
                  const p = parseFloat(e.target.value);
                  setPower(p);
                  state.setShotPower(p);
                }}
                className="absolute inset-0 opacity-0 cursor-ns-resize"
                style={{ writingMode: 'vertical-lr' } as any}
              />
           </div>
           
           <Button 
             size="lg" 
             disabled={power === 0}
             className="w-24 h-16 text-lg font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.4)] disabled:opacity-50"
             onClick={() => {
                onShoot(power);
                setPower(0);
                state.setShotPower(0);
             }}
           >
             STRIKE
           </Button>
        </div>

      </div>
    </div>
  );
}
