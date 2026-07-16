// src/components/games/TicTacToeGame.tsx — Premium Tic Tac Toe with Minimax AI
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Cell = 'X' | 'O' | null;
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWin(b: Cell[]): { winner: Cell; line: number[] } | null {
  for (const [a,c,d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: [a,c,d] };
  }
  return null;
}

function minimax(board: Cell[], depth: number, isMax: boolean, alpha: number, beta: number): number {
  const res = checkWin(board);
  if (res?.winner === 'O') return 10 - depth;
  if (res?.winner === 'X') return depth - 10;
  if (board.every(c => c !== null)) return 0;
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, depth+1, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, depth+1, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getAIMove(board: Cell[]): number {
  let best = -Infinity, move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax([...board], 0, false, -Infinity, Infinity);
      board[i] = null;
      if (score > best) { best = score; move = i; }
    }
  }
  return move;
}

export function TicTacToeGame({ onClose }: Props) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [result, setResult] = useState<{ winner: Cell; line: number[] } | 'draw' | null>(null);
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [aiThinking, setAiThinking] = useState(false);
  const [animCell, setAnimCell] = useState<number | null>(null);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setResult(null);
    setAiThinking(false);
  }, []);

  const place = useCallback((idx: number, b: Cell[], isX: boolean): Cell[] => {
    const nb = [...b];
    nb[idx] = isX ? 'X' : 'O';
    return nb;
  }, []);

  const handleResult = useCallback((nb: Cell[], placer: 'X' | 'O') => {
    const win = checkWin(nb);
    if (win) {
      setResult(win);
      setScores(s => ({ ...s, [placer]: s[placer] + 1 }));
      playTone(placer === 'X' ? 700 : 400, 0.1, 'sine', 0.3); vibrate(80);
      toast.success(placer === 'X' ? '🎉 You win!' : mode === 'ai' ? '🤖 AI wins!' : '⭕ O wins!');
      return true;
    }
    if (nb.every(c => c !== null)) {
      setResult('draw');
      setScores(s => ({ ...s, D: s.D + 1 }));
      playTone(300, 0.08, 'sine', 0.2);
      toast('🤝 Draw!');
      return true;
    }
    return false;
  }, [mode]);

  const handleClick = useCallback((idx: number) => {
    if (board[idx] || result || aiThinking || (!xTurn && mode === 'ai')) return;
    const nb = place(idx, board, xTurn);
    setBoard(nb); setAnimCell(idx);
    playTone(xTurn ? 600 : 400, 0.04, 'sine', 0.08); vibrate(20);
    const done = handleResult(nb, xTurn ? 'X' : 'O');
    if (!done) {
      setXTurn(!xTurn);
      if (mode === 'ai' && xTurn) {
        setAiThinking(true);
        setTimeout(() => {
          const aiIdx = getAIMove([...nb]);
          if (aiIdx >= 0) {
            const nb2 = place(aiIdx, nb, false);
            setBoard(nb2); setAnimCell(aiIdx);
            playTone(400, 0.04, 'sine', 0.08); vibrate(15);
            handleResult(nb2, 'O');
            setXTurn(true);
          }
          setAiThinking(false);
        }, 350);
      }
    }
  }, [board, result, aiThinking, xTurn, mode, place, handleResult]);

  // Symbol styles
  const XColor = '#66bdf2', OColor = '#7b8bc1';
  const getSymbol = (cell: Cell, idx: number, line: number[]) => {
    const isWin = line.includes(idx);
    if (cell === 'X') return (
      <motion.svg width="54" height="54" viewBox="0 0 54 54" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
        <motion.line x1="10" y1="10" x2="44" y2="44" stroke={isWin ? '#FFD700' : XColor} strokeWidth="6" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
        <motion.line x1="44" y1="10" x2="10" y2="44" stroke={isWin ? '#FFD700' : XColor} strokeWidth="6" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.1 }} />
      </motion.svg>
    );
    if (cell === 'O') return (
      <motion.svg width="54" height="54" viewBox="0 0 54 54" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.circle cx="27" cy="27" r="18" stroke={isWin ? '#FFD700' : OColor} strokeWidth="6" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
      </motion.svg>
    );
    return null;
  };

  const winLine = typeof result === 'object' && result !== null ? result.line : [];
  const statusText = result === 'draw' ? "It's a Draw!" : result ? (result.winner === 'X' ? (mode === 'ai' ? '🎉 You Win!' : '❌ X Wins!') : (mode === 'ai' ? '🤖 AI Wins!' : '⭕ O Wins!')) : aiThinking ? '🤖 AI thinking...' : xTurn ? (mode === 'ai' ? 'Your turn (X)' : "❌ X's turn") : (mode === 'ai' ? '🤖 AI turn' : "⭕ O's turn");

  return (
    <div className="flex flex-col items-center gap-5 p-4 min-h-screen" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#7b8bc1 60%,#1a3a6b 100%)' }}>
      {/* Mode toggle */}
      <div className="flex gap-2 mt-2">
        {(['ai','pvp'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); reset(); }}
            className="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
            style={{ background: mode === m ? '#66bdf2' : 'rgba(255,255,255,0.08)', color: '#fff', border: mode === m ? 'none' : '1px solid rgba(255,255,255,0.15)' }}>
            {m === 'ai' ? '🤖 vs AI' : '👥 2 Player'}
          </button>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="flex gap-4">
        {[{ label: mode === 'ai' ? 'You' : 'X', key: 'X', color: XColor }, { label: 'Draw', key: 'D', color: '#aaa' }, { label: mode === 'ai' ? 'AI' : 'O', key: 'O', color: OColor }].map(s => (
          <div key={s.key} className="flex flex-col items-center px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', minWidth: 64 }}>
            <span className="text-2xl font-bold" style={{ color: s.color }}>{scores[s.key as 'X'|'O'|'D']}</span>
            <span className="text-xs opacity-60 text-white">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Status */}
      <motion.div key={statusText} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="text-white font-semibold text-base opacity-90">{statusText}</motion.div>

      {/* Board */}
      <div className="relative" style={{ width: 290, height: 290 }}>
        {/* Grid lines */}
        <svg className="absolute inset-0" width="290" height="290">
          {[96,193].map(x => <line key={`v${x}`} x1={x} y1={8} x2={x} y2={282} stroke="rgba(74,144,217,0.35)" strokeWidth="2" strokeLinecap="round"/>)}
          {[96,193].map(y => <line key={`h${y}`} x1={8} y1={y} x2={282} y2={y} stroke="rgba(74,144,217,0.35)" strokeWidth="2" strokeLinecap="round"/>)}
        </svg>

        {/* Cells */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {board.map((cell, i) => {
            const isWinCell = winLine.includes(i);
            return (
              <motion.button key={i} onClick={() => handleClick(i)}
                className="flex items-center justify-center rounded-xl transition-colors"
                whileHover={!cell && !result ? { scale: 1.05, backgroundColor: 'rgba(74,144,217,0.12)' } : {}}
                whileTap={!cell && !result ? { scale: 0.95 } : {}}
                style={{ background: isWinCell ? 'rgba(255,215,0,0.12)' : 'transparent', cursor: cell || result ? 'default' : 'pointer' }}
                animate={animCell === i ? { scale: [1, 1.15, 1] } : {}}
              >
                {getSymbol(cell, i, winLine)}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>🔄 New Game</Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
