import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, AlertTriangle, ArrowUp } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

interface TowerGameProps {
  onClose: () => void;
}

const ROWS = 8;
const COLS = 3;

type GameState = 'IDLE' | 'PLAYING' | 'CASHOUT' | 'CRASHED';

// Multipliers for Normal difficulty (1 mine per row)
const MULTIPLIERS = [1.42, 2.13, 3.20, 4.80, 7.20, 10.80, 16.20, 24.30];

export default function TowerGame({ onClose }: TowerGameProps) {
  const { profile } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [betAmount, setBetAmount] = useState(10);
  
  const [currentRow, setCurrentRow] = useState(0); // 0 is bottom, ROWS - 1 is top
  
  // Track which columns the user clicked per row
  const [clicks, setClicks] = useState<number[]>([]);
  // Store the mine locations per row
  const [mineCols, setMineCols] = useState<number[]>([]);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const startGame = async () => {
    const pr = profileRef.current;
    if (!pr || pr.id.startsWith('guest')) {
      toast.error('Sign in to play Tower!');
      return;
    }
    if (betAmount < 1) {
      toast.error('Minimum bet is 1');
      return;
    }
    if (pr.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      const { error } = await secureUpdateTokens(pr.id, -betAmount);
      if (error) throw error;
      
      // Generate mines for this round
      const newMines = Array.from({ length: ROWS }).map(() => Math.floor(Math.random() * COLS));
      setMineCols(newMines);
      setClicks([]);
      setCurrentRow(0);
      setGameState('PLAYING');
      audio.play('spin', 'start');
      toast.success('Tower climb started!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start game');
    }
  };

  const handleCellClick = async (rowIdx: number, colIdx: number) => {
    if (gameState !== 'PLAYING' || rowIdx !== currentRow) return;

    audio.playClick();
    const newClicks = [...clicks];
    newClicks[rowIdx] = colIdx;
    setClicks(newClicks);

    const isMine = mineCols[rowIdx] === colIdx;

    if (isMine) {
      // BOOM
      setGameState('CRASHED');
      audio.play('lose', 'fall');
      
      const pr = profileRef.current;
      if (pr && !pr.id.startsWith('guest')) {
        await secureRecordGameResult({
          userId: pr.id,
          betAmount: betAmount,
          earnedAmount: 0, // Lost
          xpEarned: Math.floor(betAmount * 0.1)
        });
      }
    } else {
      // SAFE
      audio.play('win', 'coin');
      if (currentRow === ROWS - 1) {
        // Beat the tower!
        handleCashout(newClicks);
      } else {
        setCurrentRow(currentRow + 1);
      }
    }
  };

  const handleCashout = async (currentClicks = clicks) => {
    if (gameState !== 'PLAYING' || currentClicks.length === 0) return;
    const currentMult = MULTIPLIERS[currentClicks.length - 1];
    const winnings = Math.floor(betAmount * currentMult);

    setGameState('CASHOUT');
    audio.play('win', 'jackpot');
    
    const pr = profileRef.current;
    if (pr && !pr.id.startsWith('guest')) {
      await secureRecordGameResult({
        userId: pr.id,
        betAmount: betAmount,
        earnedAmount: winnings,
        xpEarned: Math.floor(betAmount * 0.1)
      });
      toast.success(`Cashed out ${winnings} tokens!`);
    }
  };

  const currentMultiplier = clicks.length > 0 ? MULTIPLIERS[clicks.length - 1] : 1;
  const potentialWinnings = Math.floor(betAmount * currentMultiplier);
  const nextMultiplier = MULTIPLIERS[currentRow] || currentMultiplier;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 lg:p-8 text-white relative w-full">
      
      {/* Header */}
      <div className="absolute top-4 left-4 flex gap-4">
        <Button variant="ghost" onClick={onClose}>Back to Games</Button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 mt-12">
        {/* Controls */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUp className="text-emerald-400" size={24} />
            <h2 className="text-2xl font-black">TOWER</h2>
          </div>
          
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            minBet={1}
            maxBet={profile?.tokens || 1000}
            disabled={gameState === 'PLAYING'}
          />

          <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Current Multiplier</span>
              <span className="font-bold text-emerald-400">{currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Potential Payout</span>
              <span className="font-bold text-yellow-400">{potentialWinnings}</span>
            </div>
            {gameState === 'PLAYING' && (
              <div className="flex justify-between text-sm pt-2 border-t border-white/10 mt-2">
                <span className="text-white/50">Next Multiplier</span>
                <span className="font-bold text-emerald-400">{nextMultiplier.toFixed(2)}x</span>
              </div>
            )}
          </div>

          {gameState === 'PLAYING' ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full text-lg h-14 bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              onClick={() => handleCashout()}
            >
              CASHOUT {potentialWinnings}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full text-lg h-14"
              onClick={startGame}
              disabled={!profile || betAmount > (profile.tokens || 0)}
            >
              {gameState === 'CRASHED' || gameState === 'CASHOUT' ? 'PLAY AGAIN' : 'START CLIMB'}
            </Button>
          )}

          {gameState === 'CRASHED' && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center text-red-400 font-bold animate-pulse">
              TOWER CRASHED!
            </div>
          )}
          {gameState === 'CASHOUT' && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-center text-emerald-400 font-bold animate-pulse">
              YOU WON {potentialWinnings}!
            </div>
          )}
        </div>

        {/* Tower Grid */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
          <div className="flex flex-col-reverse gap-2 w-full max-w-sm mx-auto">
            {Array.from({ length: ROWS }).map((_, rIdx) => {
              const isCurrentRow = gameState === 'PLAYING' && rIdx === currentRow;
              const isPastRow = rIdx < clicks.length;
              const rowClickedCol = isPastRow ? clicks[rIdx] : null;
              
              const mult = MULTIPLIERS[rIdx];

              return (
                <div key={rIdx} className="flex items-center gap-4">
                  {/* Multiplier Label */}
                  <div className={`w-14 text-right text-sm font-black transition-colors ${
                    isPastRow ? 'text-emerald-400' : isCurrentRow ? 'text-white' : 'text-white/30'
                  }`}>
                    {mult.toFixed(2)}x
                  </div>

                  {/* Row Cells */}
                  <div className={`flex-1 flex gap-2 p-2 rounded-xl border transition-all ${
                    isCurrentRow ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-white/5 bg-black/20'
                  }`}>
                    {Array.from({ length: COLS }).map((_, cIdx) => {
                      // Determine cell state
                      const isClicked = rowClickedCol === cIdx;
                      let cellContent = null;
                      let bgClass = "bg-white/5 hover:bg-white/10";
                      
                      if (gameState !== 'IDLE' && (isPastRow || gameState === 'CRASHED' || gameState === 'CASHOUT')) {
                        // Reveal logic
                        const isMineCell = mineCols[rIdx] === cIdx;
                        if (isMineCell) {
                          cellContent = <AlertTriangle className="text-black" size={24} />;
                          bgClass = isClicked ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" : "bg-red-500/30";
                        } else {
                          cellContent = <Sparkles className={isClicked ? "text-emerald-400" : "text-white/20"} size={24} />;
                          bgClass = isClicked ? "bg-emerald-500/20 border-emerald-500/50 border" : "bg-white/5";
                        }
                      }

                      return (
                        <motion.button
                          key={cIdx}
                          whileHover={{ scale: isCurrentRow ? 1.05 : 1 }}
                          whileTap={{ scale: isCurrentRow ? 0.95 : 1 }}
                          className={`flex-1 aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer ${bgClass} ${!isCurrentRow && 'pointer-events-none'}`}
                          onClick={() => handleCellClick(rIdx, cIdx)}
                          disabled={!isCurrentRow}
                        >
                          <AnimatePresence>
                            {cellContent && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="drop-shadow-lg"
                              >
                                {cellContent}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
