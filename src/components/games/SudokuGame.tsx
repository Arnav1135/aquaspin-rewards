// src/components/games/SudokuGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SudokuGameProps {
  onClose: () => void;
}

type Cell = {
  value: number;
  original: boolean;
  notes: number[];
};

type SudokuBoard = Cell[];

// A pre-generated basic grid template which we will shuffle to create varied game seeds
const BASE_SUDOKU_GRID = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 8, 4,
  2, 8, 7, 4, 1, 9, 6, 3, 5,
  3, 4, 5, 2, 8, 6, 1, 7, 9
];

export function SudokuGame({ onClose }: SudokuGameProps) {
  const [board, setBoard] = useState<SudokuBoard>([]);
  const [solution, setSolution] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const shuffleGrid = (grid: number[]): { initial: number[]; solved: number[] } => {
    const solved = [...grid];
    // Map number pairs to swap values (preserving valid Sudoku constraints)
    const map = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 81; i++) {
      solved[i] = map[solved[i] - 1];
    }

    // Determine numbers to remove based on difficulty
    const cellsToRemove = difficulty === 'expert' ? 52 : difficulty === 'hard' ? 44 : difficulty === 'medium' ? 36 : 28;
    const initial = [...solved];
    const removedIndices = new Set<number>();
    while (removedIndices.size < cellsToRemove) {
      removedIndices.add(Math.floor(Math.random() * 81));
    }
    removedIndices.forEach(idx => {
      initial[idx] = 0;
    });

    return { initial, solved };
  };

  const handleRestart = useCallback(() => {
    const { initial, solved } = shuffleGrid(BASE_SUDOKU_GRID);
    const cells: SudokuBoard = initial.map(val => ({
      value: val,
      original: val !== 0,
      notes: []
    }));
    setBoard(cells);
    setSolution(solved);
    setSelectedCell(null);
    setMistakes(0);
    setGameOver(false);
    setWon(false);
    playTone(400, 0.05, 'sine', 0.1);
  }, [difficulty]);

  useEffect(() => {
    handleRestart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const handleCellSelect = (idx: number) => {
    if (gameOver || won) return;
    setSelectedCell(idx);
    playTone(550, 0.02, 'sine', 0.05);
  };

  const handleInputNumber = (num: number) => {
    if (selectedCell === null || gameOver || won) return;
    const cell = board[selectedCell];
    if (cell.original) return;

    if (noteMode) {
      const newBoard = [...board];
      const currentNotes = newBoard[selectedCell].notes;
      if (currentNotes.includes(num)) {
        newBoard[selectedCell].notes = currentNotes.filter(n => n !== num);
      } else {
        newBoard[selectedCell].notes = [...currentNotes, num].sort();
      }
      setBoard(newBoard);
      playTone(500, 0.03, 'sine', 0.05);
      return;
    }

    const correctValue = solution[selectedCell];
    const newBoard = [...board];

    if (num === correctValue) {
      newBoard[selectedCell].value = num;
      newBoard[selectedCell].notes = [];
      setBoard(newBoard);
      playTone(600, 0.08, 'sine', 0.1);
      vibrate(15);

      // Check win condition
      if (newBoard.every((c, idx) => c.value === solution[idx])) {
        setWon(true);
        playTone(523, 0.15, 'sine', 0.2);
        setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
        toast.success('Congratulations! Sudoku Solved.');
      }
    } else {
      setMistakes(prev => {
        const nextMistakes = prev + 1;
        if (nextMistakes >= 3) {
          setGameOver(true);
          playTone(200, 0.35, 'sawtooth', 0.35);
          toast.error('Game Over! 3 Mistakes reached.');
        }
        return nextMistakes;
      });
      playTone(220, 0.2, 'sawtooth', 0.15);
      vibrate(80);
      toast.error('Incorrect Number!');
    }
  };

  const handleHint = () => {
    if (selectedCell === null || gameOver || won) {
      toast('Select an empty cell first', { icon: '💡' });
      return;
    }
    const cell = board[selectedCell];
    if (cell.original || cell.value !== 0) return;

    const correctValue = solution[selectedCell];
    const newBoard = [...board];
    newBoard[selectedCell].value = correctValue;
    newBoard[selectedCell].notes = [];
    setBoard(newBoard);
    playTone(700, 0.1, 'sine', 0.2);
    toast.success('Hint Filled!');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #090e1a 0%, #1e1b4b 50%, #0d1e3d 100%)' }}>
      
      {/* Settings Card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-widest">
              Sudoku Core
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          {/* Difficulty selector */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Difficulty Setting</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['easy', 'medium', 'hard', 'expert'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`py-1.5 rounded-lg text-3xs font-mono font-bold border capitalize transition-all ${
                    difficulty === diff ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Mistake Counter */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mistakes Count</span>
            <span className={`font-mono text-xs font-bold ${mistakes > 1 ? 'text-red-400' : 'text-cyan-400'}`}>
              {mistakes} / 3
            </span>
          </div>

          {/* Notes Option toggler */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Pencil Notes Mode</span>
            <button
              onClick={() => { setNoteMode(!noteMode); playTone(500, 0.04, 'sine', 0.1); }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                noteMode ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              ✍️ Notes mode: {noteMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={handleHint}>
            💡 Get Hint
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Sudoku
          </Button>
        </div>
      </Card>

      {/* Main Grid display board */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>SUDOKU RULES ACTIVE</span>
        </div>

        {gameOver ? (
          <div className="text-center space-y-6 max-w-sm">
            <RefreshCw size={36} className="text-red-400 mx-auto animate-spin-slow" />
            <h3 className="text-2xl font-black text-slate-200">OUT OF LIVES</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You reached the maximum limit of 3 incorrect answers. Let's restart!
            </p>
            <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={handleRestart}>
              Start Again
            </Button>
          </div>
        ) : won ? (
          <div className="text-center space-y-6 max-w-sm">
            <Sparkles size={36} className="text-yellow-400 mx-auto animate-pulse" />
            <h3 className="text-2xl font-black text-yellow-300 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">SUDOKU SOLVED</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Congratulations on a successful puzzle run!
            </p>
            <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={handleRestart}>
              Play Next Grid
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            
            {/* Sudoku Board Grid */}
            <div className="grid grid-cols-9 gap-0.5 p-1 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden w-full aspect-square max-w-[340px]">
              {board.map((cell, idx) => {
                const isSelected = selectedCell === idx;
                const row = Math.floor(idx / 9);
                const col = idx % 9;
                
                // Add border divisions for 3x3 blocks
                const borderRight = (col === 2 || col === 5) ? 'border-r border-slate-700' : '';
                const borderBottom = (row === 2 || row === 5) ? 'border-b border-slate-700' : '';

                return (
                  <button
                    key={idx}
                    onClick={() => handleCellSelect(idx)}
                    className={`aspect-square relative flex items-center justify-center text-xs font-mono font-bold transition-all ${borderRight} ${borderBottom} ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-200' 
                        : cell.original 
                          ? 'bg-slate-950/60 text-slate-400 cursor-default'
                          : cell.value !== 0 
                            ? 'bg-slate-900/40 text-cyan-300' 
                            : 'bg-slate-900/10 hover:bg-slate-800/30'
                    }`}
                  >
                    {cell.value !== 0 ? (
                      <span className="text-base font-black">{cell.value}</span>
                    ) : (
                      <div className="grid grid-cols-3 gap-0.5 w-full h-full p-0.5 pointer-events-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <span key={n} className="text-[7px] text-slate-500/60 text-center leading-none">
                            {cell.notes.includes(n) ? n : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Input Selection Pads */}
            <div className="flex justify-between items-center gap-1.5 w-full max-w-[340px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <motion.button
                  key={num}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleInputNumber(num)}
                  className="flex-1 aspect-square bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex items-center justify-center font-mono font-bold text-sm outline-none"
                >
                  {num}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
