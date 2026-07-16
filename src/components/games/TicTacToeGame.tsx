// src/components/games/TicTacToeGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, RefreshCw, Trophy, User, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TicTacToeGameProps {
  onClose: () => void;
}

type BoardState = ('X' | 'O' | null)[];
type GameMode = 'single' | 'multi';
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'impossible';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function TicTacToeGame({ onClose }: TicTacToeGameProps) {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState<GameMode>('single');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [winner, setWinner] = useState<'X' | 'O' | 'Draw' | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });

  const checkWinner = (currentBoard: BoardState) => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], combo };
      }
    }
    if (currentBoard.every(cell => cell !== null)) {
      return { winner: 'Draw' as const, combo: null };
    }
    return { winner: null, combo: null };
  };

  const minimax = useCallback((tempBoard: BoardState, depth: number, isMaximizing: boolean): number => {
    const { winner: currentWinner } = checkWinner(tempBoard);
    if (currentWinner === 'O') return 10 - depth;
    if (currentWinner === 'X') return depth - 10;
    if (currentWinner === 'Draw') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'O';
          const score = minimax(tempBoard, depth + 1, false);
          tempBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'X';
          const score = minimax(tempBoard, depth + 1, true);
          tempBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }, []);

  const getAIMove = useCallback((currentBoard: BoardState): number => {
    // Easy difficulty: Pure random move
    if (difficulty === 'easy') {
      const available = currentBoard.map((c, i) => c === null ? i : null).filter(c => c !== null) as number[];
      return available[Math.floor(Math.random() * available.length)];
    }

    // Medium difficulty: 50% minimax, 50% random
    if (difficulty === 'medium' && Math.random() < 0.5) {
      const available = currentBoard.map((c, i) => c === null ? i : null).filter(c => c !== null) as number[];
      return available[Math.floor(Math.random() * available.length)];
    }

    // Hard difficulty: Block wins or take winning moves, otherwise minimax
    if (difficulty === 'hard' && Math.random() < 0.2) {
      const available = currentBoard.map((c, i) => c === null ? i : null).filter(c => c !== null) as number[];
      return available[Math.floor(Math.random() * available.length)];
    }

    // Impossible: Full Minimax
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }, [difficulty, minimax]);

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return;

    // Player move (always 'X' in single player, or next turn in multi)
    const newBoard = [...board];
    const currentPlayer = isXNext ? 'X' : 'O';
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    playTone(isXNext ? 350 : 450, 0.05, 'sine', 0.1);
    vibrate(20);

    const { winner: checkW, combo } = checkWinner(newBoard);
    if (checkW) {
      setWinner(checkW);
      setWinningCombo(combo);
      resolveGameEnd(checkW);
      return;
    }

    if (mode === 'single') {
      setIsXNext(false);
    } else {
      setIsXNext(!isXNext);
    }
  };

  useEffect(() => {
    if (mode === 'single' && !isXNext && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board);
        if (aiMove !== -1) {
          const newBoard = [...board];
          newBoard[aiMove] = 'O';
          setBoard(newBoard);
          playTone(450, 0.05, 'sine', 0.1);
          const { winner: checkW, combo } = checkWinner(newBoard);
          if (checkW) {
            setWinner(checkW);
            setWinningCombo(combo);
            resolveGameEnd(checkW);
          } else {
            setIsXNext(true);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXNext, mode, board, winner, getAIMove]);

  const resolveGameEnd = (w: 'X' | 'O' | 'Draw') => {
    if (w === 'X') {
      setStreak(prev => prev + 1);
      setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
      toast.success('🎉 You Won!');
      playTone(523.25, 0.15, 'sine', 0.2);
      setTimeout(() => playTone(659.25, 0.15, 'sine', 0.2), 100);
      vibrate([50, 50, 100]);
    } else if (w === 'O') {
      setStreak(0);
      setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
      if (mode === 'single') {
        toast.error('💀 AI Won!');
        playTone(220, 0.3, 'sawtooth', 0.2);
      } else {
        toast.success('🎉 Player O Won!');
        playTone(523.25, 0.15, 'sine', 0.2);
      }
      vibrate(150);
    } else {
      setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
      toast('🤝 Draw Match!', { icon: '⚖️' });
      playTone(300, 0.2, 'triangle', 0.15);
      vibrate(50);
    }
  };

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningCombo(null);
    playTone(600, 0.05, 'sine', 0.15);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0a0a1c 100%)' }}>
      
      {/* Left Settings & Stats */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-widest">
              Glow Grid
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          {/* Mode switch */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Opponent Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button onClick={() => { setMode('single'); handleRestart(); }} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'single' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 border border-transparent'}`}>
                🤖 vs AI
              </button>
              <button onClick={() => { setMode('multi'); handleRestart(); }} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'multi' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 border border-transparent'}`}>
                👥 Pass & Play
              </button>
            </div>
          </div>

          {/* Difficulty Switch */}
          {mode === 'single' && (
            <div className="space-y-2">
              <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">AI Difficulty</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['easy', 'medium', 'hard', 'impossible'] as const).map(diff => (
                  <button key={diff} onClick={() => setDifficulty(diff)} className={`py-1.5 rounded-lg text-3xs font-mono font-bold border capitalize transition-all ${difficulty === diff ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-slate-800 text-slate-500'}`}>
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard stats */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Streak:</span>
              <span className="font-mono font-bold text-cyan-400">{streak} wins</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-2xs pt-1 border-t border-slate-900">
              <div>
                <p className="text-emerald-400 font-bold">{stats.wins}</p>
                <p className="text-slate-500 uppercase tracking-wider">Wins</p>
              </div>
              <div>
                <p className="text-rose-400 font-bold">{stats.losses}</p>
                <p className="text-slate-500 uppercase tracking-wider">Losses</p>
              </div>
              <div>
                <p className="text-slate-300 font-bold">{stats.draws}</p>
                <p className="text-slate-500 uppercase tracking-wider">Draws</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={handleRestart}>
            <RefreshCw size={14} className="mr-1.5 animate-spin-slow" /> Reset Grid
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Board
          </Button>
        </div>
      </Card>

      {/* Main Grid Card */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>NEON STREAKS ENABLED</span>
        </div>

        <div className="flex items-center gap-3.5 mb-6 bg-slate-900/60 px-4 py-2 rounded-full border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
            {mode === 'single' ? (
              <>
                <User size={13} className="text-cyan-400" />
                <span className="text-cyan-400">Player (X)</span>
                <span className="text-slate-500">vs</span>
                <Cpu size={13} className="text-indigo-400" />
                <span className="text-indigo-400">AI (O)</span>
              </>
            ) : (
              <>
                <span className={isXNext ? 'text-cyan-400' : 'text-slate-500'}>Player X</span>
                <span className="text-slate-500">|</span>
                <span className={!isXNext ? 'text-indigo-400' : 'text-slate-500'}>Player O</span>
              </>
            )}
          </div>
        </div>

        {/* 3x3 Responsive Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] aspect-square">
          {board.map((cell, index) => {
            const isWinningCell = winningCombo?.includes(index);
            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCellClick(index)}
                className={`aspect-square rounded-2xl flex items-center justify-center text-4xl font-black transition-all border outline-none ${
                  isWinningCell 
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_24px_rgba(234,179,8,0.4)]' 
                    : cell === 'X'
                      ? 'border-cyan-500 bg-cyan-500/5 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : cell === 'O'
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                }`}
              >
                <AnimatePresence mode="popLayout">
                  {cell && (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ duration: 0.2, type: 'spring', stiffness: 200 }}
                    >
                      {cell}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {winner && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            <p className="text-sm text-slate-400 uppercase font-mono font-bold tracking-widest mb-2">Round Result</p>
            <h3 className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
              {winner === 'Draw' ? '🤝 DRAW MATCH' : `🎉 WINNER: PLAYER ${winner}`}
            </h3>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
