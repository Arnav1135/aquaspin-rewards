import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Scene3D } from './pool/Scene3D';
import { TouchControls } from './pool/TouchControls';
import { HUD } from './pool/HUD';
import { usePoolEconomy, TABLE_TIERS } from './pool/PoolEconomy';
import { usePoolRules } from './pool/RulesEngine';
import { audio } from '@/lib/audioEngine';

interface Props { onClose: () => void; }

export function PoolGame({ onClose }: Props) {
  const mode = usePoolEconomy(s => s.mode);
  const setMode = usePoolEconomy(s => s.setMode);
  const selectedTier = usePoolEconomy(s => s.selectedTier);
  const selectTier = usePoolEconomy(s => s.selectTier);
  const startMatch = usePoolRules(s => s.startMatch);
  const [cueAngle, setCueAngle] = useState(0);
  const [power, setPower] = useState(0);

  const handleStrike = (p: number) => {
    usePoolRules.getState().ballsRolling();
    window.dispatchEvent(new CustomEvent('pool-strike', { detail: { power: p, angle: cueAngle } }));
    audio.play('pool', 'hit');
  };

  const handleStart = () => {
    setMode('PLAYING');
    startMatch();
    setCueAngle(0);
    setPower(0);
    audio.play('pool', 'click');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
      <Card className="relative w-full max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-navy-700 bg-navy-900 rounded-3xl">
        {mode === 'MENU' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-lg">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-600 mb-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">PRO 8-BALL</h1>
            <p className="text-slate-400 mb-12 tracking-widest uppercase font-bold text-sm">Hyper-Realistic 3D Simulation</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-8">
              {TABLE_TIERS.slice(0,3).map(tier => (
                <div key={tier.id} onClick={() => { selectTier(tier.id); audio.play('pool', 'click'); }} className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 ${selectedTier === tier.id ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform scale-105' : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'}`}>
                  <h3 className="text-xl font-bold text-white mb-4">{tier.name}</h3>
                  <div className="flex justify-between text-sm mb-2"><span className="text-slate-400">Entry</span><span className="text-cyan-400 font-bold">{tier.entryFee}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Prize</span><span className="text-yellow-400 font-bold">{tier.prize}</span></div>
                </div>
              ))}
            </div>
            <Button variant="neon" size="lg" className="mt-12 px-16 py-6 text-xl" onClick={handleStart}>PLAY MATCH</Button>
          </div>
        )}

        <div className="relative flex-1 bg-[#050505] overflow-hidden select-none">
          {mode === 'PLAYING' && (
            <>
              <Canvas shadows dpr={[1, 2]} frameloop="always" camera={{ position: [0, 8, 8], fov: 45 }}>
                <Scene3D cueAngle={cueAngle} power={power} />
              </Canvas>
              <HUD />
              <TouchControls onAimChange={(d) => setCueAngle(prev => prev + d)} power={power} setPower={setPower} onStrike={handleStrike} />
            </>
          )}
          <Button variant="ghost" className="absolute top-4 right-4 z-50 text-slate-400 bg-black/40 backdrop-blur-md border border-white/10 hover:text-white" onClick={onClose}>Leave Table</Button>
        </div>
      </Card>
    </div>
  );
}
