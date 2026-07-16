// src/components/games/ChessGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Trophy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChessGameProps {
  onClose: () => void;
}

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

type Piece = {
  type: PieceType;
  color: PieceColor;
};

type ChessBoard = (Piece | null)[];

const INITIAL_BOARD: ChessBoard = [
  { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' },
  { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
  { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
];

export function ChessGame({ onClose }: ChessGameProps) {
  const [board, setBoard] = useState<ChessBoard>(INITIAL_BOARD);
  const [activeTurn, setActiveTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [opponent, setOpponent] = useState<'ai' | 'player'>('ai');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });

  const startNewGame = () => {
    setBoard([...INITIAL_BOARD]);
    setActiveTurn('w');
    setSelectedSquare(null);
    setGameOver(false);
    setWinner(null);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const getAIMove = useCallback((currentBoard: ChessBoard): { from: number; to: number } | null => {
    const aiColor = 'b';
    const moves: { from: number; to: number }[] = [];

    // Find all valid moves for AI pieces
    for (let fromIdx = 0; fromIdx < 81; fromIdx++) {
      const piece = currentBoard[fromIdx];
      if (piece && piece.color === aiColor) {
        for (let toIdx = 0; toIdx < 64; toIdx++) {
          if (validateMove(fromIdx, toIdx, currentBoard)) {
            moves.push({ from: fromIdx, to: toIdx });
          }
        }
      }
    }

    if (moves.length === 0) return null;

    // Hard difficulty: Prefer captures
    if (difficulty === 'hard') {
      const captures = moves.filter(m => currentBoard[m.to] !== null);
      if (captures.length > 0) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
    }

    // Default: Return random move
    return moves[Math.floor(Math.random() * moves.length)];
  }, [difficulty]);

  const executeAIMove = useCallback(() => {
    const move = getAIMove(board);
    if (move) {
      const newBoard = [...board];
      const movingPiece = newBoard[move.from]!;
      newBoard[move.to] = movingPiece;
      newBoard[move.from] = null;
      setBoard(newBoard);
      playTone(450, 0.05, 'sine', 0.1);

      // Simple King capture check
      const opponentKingExists = newBoard.some(p => p && p.type === 'k' && p.color === 'w');
      if (!opponentKingExists) {
        setWinner('AI Opponent wins!');
        setGameOver(true);
        setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
        toast.error('AI Captured your King!');
      } else {
        setActiveTurn('w');
      }
    }
  }, [board, getAIMove]);

  useEffect(() => {
    if (opponent === 'ai' && activeTurn === 'b' && !gameOver) {
      const timer = setTimeout(() => {
        executeAIMove();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [activeTurn, opponent, gameOver, executeAIMove]);

  // Simplified basic chess rule checks
  const validateMove = (from: number, to: number, currentBoard: ChessBoard): boolean => {
    const piece = currentBoard[from];
    if (!piece) return false;

    // Destination cannot contain own piece
    const destPiece = currentBoard[to];
    if (destPiece && destPiece.color === piece.color) return false;

    const fromRow = Math.floor(from / 8);
    const fromCol = from % 8;
    const toRow = Math.floor(to / 8);
    const toCol = to % 8;

    const dx = Math.abs(toCol - fromCol);
    const dy = Math.abs(toRow - fromRow);

    if (piece.type === 'p') {
      const dir = piece.color === 'w' ? -1 : 1;
      // Single square forward
      if (toCol === fromCol && toRow === fromRow + dir && !destPiece) {
        return true;
      }
      // Diagonal capture
      if (dx === 1 && toRow === fromRow + dir && destPiece) {
        return true;
      }
      return false;
    }

    if (piece.type === 'r') {
      return (fromCol === toCol || fromRow === toRow);
    }

    if (piece.type === 'n') {
      return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
    }

    if (piece.type === 'b') {
      return (dx === dy);
    }

    if (piece.type === 'q') {
      return (fromCol === toCol || fromRow === toRow) || (dx === dy);
    }

    if (piece.type === 'k') {
      return (dx <= 1 && dy <= 1);
    }

    return false;
  };

  const handleSquareClick = (idx: number) => {
    if (gameOver) return;
    if (opponent === 'ai' && activeTurn === 'b') return;

    if (selectedSquare === null) {
      const piece = board[idx];
      if (piece && piece.color === activeTurn) {
        setSelectedSquare(idx);
        playTone(550, 0.02, 'sine', 0.05);
      }
    } else {
      if (validateMove(selectedSquare, idx, board)) {
        const newBoard = [...board];
        const movingPiece = newBoard[selectedSquare]!;
        newBoard[idx] = movingPiece;
        newBoard[selectedSquare] = null;
        setBoard(newBoard);
        playTone(600, 0.06, 'sine', 0.12);
        vibrate(20);

        // Simple check win
        const opponentKingExists = newBoard.some(p => p && p.type === 'k' && p.color === (activeTurn === 'w' ? 'b' : 'w'));
        if (!opponentKingExists) {
          const winMsg = `${activeTurn === 'w' ? 'Player 1' : 'Player 2'} Wins!`;
          setWinner(winMsg);
          setGameOver(true);
          setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
          toast.success(winMsg, { icon: '🏆' });
        } else {
          setActiveTurn(activeTurn === 'w' ? 'b' : 'w');
        }
      } else {
        playTone(220, 0.15, 'sawtooth', 0.1);
        vibrate(40);
        toast.error('Illegal Move!');
      }
      setSelectedSquare(null);
    }
  };

  const getPieceSymbol = (piece: Piece) => {
    const symbols: Record<PieceType, { w: string; b: string }> = {
      p: { w: '♙', b: '♟' },
      r: { w: '♖', b: '♜' },
      n: { w: '♘', b: '♞' },
      b: { w: '♗', b: '♝' },
      q: { w: '♕', b: '♛' },
      k: { w: '♔', b: '♚' }
    };
    return symbols[piece.type][piece.color];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #090c12 0%, #1e1b4b 50%, #0d1e3d 100%)' }}>
      
      {/* Settings panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-widest">
              Chess Board
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Opponent Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button disabled={opponent === 'ai' && activeTurn === 'b'} onClick={() => setOpponent('ai')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${opponent === 'ai' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-400'}`}>
                🤖 vs AI
              </button>
              <button disabled={opponent === 'ai' && activeTurn === 'b'} onClick={() => setOpponent('player')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${opponent === 'player' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-400'}`}>
                👥 Pass & Play
              </button>
            </div>
          </div>

          {opponent === 'ai' && (
            <div className="space-y-2">
              <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Engine Intelligence</span>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button onClick={() => setDifficulty('easy')} className={`py-1 rounded text-3xs font-bold uppercase ${difficulty === 'easy' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}>
                  Standard
                </button>
                <button onClick={() => setDifficulty('hard')} className={`py-1 rounded text-3xs font-bold uppercase ${difficulty === 'hard' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}>
                  Tactical
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Wins count:</span>
            <span className="font-mono text-cyan-400 font-bold">{stats.wins} victories</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startNewGame}>
            Restart Match
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Board
          </Button>
        </div>
      </Card>

      {/* Main Board view */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>CHESSBOARD RULES ACTIVE</span>
        </div>

        {gameOver ? (
          <div className="text-center space-y-6 max-w-sm">
            <AlertTriangle size={36} className="text-yellow-400 mx-auto animate-pulse" />
            <h3 className="text-2xl font-black text-yellow-300">{winner}</h3>
            <Button variant="neon" size="lg" className="w-full" onClick={startNewGame}>
              Play Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-md animate-fade-in">
            <div className="text-xs font-bold uppercase tracking-widest font-mono">
              Turn: <span className={activeTurn === 'w' ? 'text-cyan-400' : 'text-indigo-400'}>{activeTurn === 'w' ? 'White (Cyan)' : 'Black (Blue)'}</span>
            </div>

            {/* 8x8 Chessboard */}
            <div className="grid grid-cols-8 gap-0.5 p-1 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden w-full aspect-square max-w-[340px]">
              {board.map((piece, idx) => {
                const row = Math.floor(idx / 8);
                const col = idx % 8;
                const isEven = (row + col) % 2 === 0;
                const isSelected = selectedSquare === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSquareClick(idx)}
                    className={`aspect-square relative flex items-center justify-center text-2xl font-semibold transition-all outline-none ${
                      isSelected 
                        ? 'bg-yellow-400/20 text-yellow-300 ring-2 ring-yellow-400/40' 
                        : isEven 
                          ? 'bg-slate-950/60 text-slate-300 hover:bg-slate-800/40' 
                          : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/20'
                    }`}
                  >
                    {piece && (
                      <span className={`text-3xl filter drop-shadow ${piece.color === 'w' ? 'text-cyan-400' : 'text-indigo-400'}`}>
                        {getPieceSymbol(piece)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </Card>
    </div>
  );
}
