// src/components/games/DotsAndBoxesGame.tsx
import { useState, useEffect, useRef } from 'react';
import { HelpCircle, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DotsAndBoxesGameProps {
  onClose: () => void;
}

type Line = {
  row: number;
  col: number;
  type: 'h' | 'v';
  owner: 'p1' | 'p2' | null;
};

type Box = {
  row: number;
  col: number;
  owner: 'p1' | 'p2' | null;
};

export function DotsAndBoxesGame({ onClose }: DotsAndBoxesGameProps) {
  const [gridSize, setGridSize] = useState<4 | 5 | 6>(4); // number of dots
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePlayer, setActivePlayer] = useState<'p1' | 'p2'>('p1');
  const [opponent, setOpponent] = useState<'ai' | 'player'>('ai');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state references to maintain instant responsiveness in requestAnimationFrame
  const lines = useRef<Line[]>([]);
  const boxes = useRef<Box[]>([]);

  const W = 360;
  const H = 360;
  const margin = 40;

  const initBoard = () => {
    const size = gridSize;
    const horizontalLines: Line[] = [];
    const verticalLines: Line[] = [];
    const boxList: Box[] = [];

    // Build lines
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 1; c++) {
        horizontalLines.push({ row: r, col: c, type: 'h', owner: null });
      }
    }
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size; c++) {
        verticalLines.push({ row: r, col: c, type: 'v', owner: null });
      }
    }
    lines.current = [...horizontalLines, ...verticalLines];

    // Build boxes
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        boxList.push({ row: r, col: c, owner: null });
      }
    }
    boxes.current = boxList;

    setScores({ p1: 0, p2: 0 });
    setActivePlayer('p1');
    setGameOver(false);
    setWinner(null);
    setIsPlaying(true);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const checkCompletedBoxes = (player: 'p1' | 'p2'): boolean => {
    let completedAny = false;

    boxes.current.forEach(box => {
      if (box.owner !== null) return;

      // Find lines forming this box
      const top = lines.current.find(l => l.type === 'h' && l.row === box.row && l.col === box.col);
      const bottom = lines.current.find(l => l.type === 'h' && l.row === box.row + 1 && l.col === box.col);
      const left = lines.current.find(l => l.type === 'v' && l.row === box.row && l.col === box.col);
      const right = lines.current.find(l => l.type === 'v' && l.row === box.row && l.col === box.col + 1);

      if (top?.owner && bottom?.owner && left?.owner && right?.owner) {
        box.owner = player;
        completedAny = true;
        setScores(prev => {
          const nextScores = { ...prev, [player]: prev[player] + 1 };
          return nextScores;
        });
        playTone(660, 0.08, 'sine', 0.2);
        vibrate(25);
      }
    });

    return completedAny;
  };

  const getAIMove = (): Line | null => {
    // Find any move that completes a box immediately
    for (const line of lines.current) {
      if (line.owner !== null) continue;
      // Temporary check
      line.owner = 'p2';
      let completes = false;
      for (const box of boxes.current) {
        if (box.owner !== null) continue;
        const top = lines.current.find(l => l.type === 'h' && l.row === box.row && l.col === box.col);
        const bottom = lines.current.find(l => l.type === 'h' && l.row === box.row + 1 && l.col === box.col);
        const left = lines.current.find(l => l.type === 'v' && l.row === box.row && l.col === box.col);
        const right = lines.current.find(l => l.type === 'v' && l.row === box.row && l.col === box.col + 1);
        if (top?.owner && bottom?.owner && left?.owner && right?.owner) {
          completes = true;
          break;
        }
      }
      line.owner = null; // revert
      if (completes) return line;
    }

    // Otherwise, pick a random available line
    const available = lines.current.filter(l => l.owner === null);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  const handleAIMove = () => {
    const aiLine = getAIMove();
    if (!aiLine) return;

    aiLine.owner = 'p2';
    playTone(400, 0.04, 'sine', 0.1);

    const completed = checkCompletedBoxes('p2');

    // Check game over
    const allFilled = lines.current.every(l => l.owner !== null);
    if (allFilled) {
      resolveGameEnd();
      return;
    }

    if (completed) {
      // AI gets another turn
      setTimeout(() => {
        handleAIMove();
      }, 600);
    } else {
      setActivePlayer('p1');
    }
    drawBoard();
  };

  const resolveGameEnd = () => {
    setGameOver(true);
    let winMsg = '';
    if (scores.p1 > scores.p2) {
      winMsg = 'Player 1 Wins!';
      playTone(523, 0.15, 'sine', 0.25);
    } else if (scores.p2 > scores.p1) {
      winMsg = opponent === 'ai' ? 'AI Wins!' : 'Player 2 Wins!';
      playTone(200, 0.3, 'sawtooth', 0.3);
    } else {
      winMsg = 'Draw Match!';
      playTone(300, 0.2, 'triangle', 0.2);
    }
    setWinner(winMsg);
    toast.success(winMsg, { icon: '🏆' });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || activePlayer === 'p2' && opponent === 'ai') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const size = gridSize;
    const dotSpacing = (W - margin * 2) / (size - 1);

    // Find the closest line
    let closestLine: Line | null = null;
    let minDistance = 15; // Click tolerance radius

    lines.current.forEach(line => {
      if (line.owner !== null) return;

      let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
      if (line.type === 'h') {
        lx1 = margin + line.col * dotSpacing;
        ly1 = margin + line.row * dotSpacing;
        lx2 = lx1 + dotSpacing;
        ly2 = ly1;
      } else {
        lx1 = margin + line.col * dotSpacing;
        ly1 = margin + line.row * dotSpacing;
        lx2 = lx1;
        ly2 = ly1 + dotSpacing;
      }

      // Calculate distance from point to line segment
      const l2 = Math.pow(lx2 - lx1, 2) + Math.pow(ly2 - ly1, 2);
      let t = ((clickX - lx1) * (lx2 - lx1) + (clickY - ly1) * (ly2 - ly1)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = lx1 + t * (lx2 - lx1);
      const projY = ly1 + t * (ly2 - ly1);
      const dist = Math.sqrt(Math.pow(clickX - projX, 2) + Math.pow(clickY - projY, 2));

      if (dist < minDistance) {
        minDistance = dist;
        closestLine = line;
      }
    });

    if (closestLine) {
      const line = closestLine as Line;
      line.owner = activePlayer;
      playTone(450, 0.04, 'sine', 0.1);
      vibrate(20);

      const completed = checkCompletedBoxes(activePlayer);

      // Check game over
      const allFilled = lines.current.every(l => l.owner !== null);
      if (allFilled) {
        resolveGameEnd();
        drawBoard();
        return;
      }

      if (completed) {
        // Current player gets another turn, do nothing else
      } else {
        if (opponent === 'ai') {
          setActivePlayer('p2');
          setTimeout(() => {
            handleAIMove();
          }, 600);
        } else {
          setActivePlayer(activePlayer === 'p1' ? 'p2' : 'p1');
        }
      }
      drawBoard();
    }
  };

  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // Grid backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    const size = gridSize;
    const dotSpacing = (W - margin * 2) / (size - 1);

    // Draw completed box fill overlays
    boxes.current.forEach(box => {
      if (box.owner === null) return;
      ctx.fillStyle = box.owner === 'p1' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)';
      const bx = margin + box.col * dotSpacing + 4;
      const by = margin + box.row * dotSpacing + 4;
      ctx.fillRect(bx, by, dotSpacing - 8, dotSpacing - 8);
    });

    // Draw lines
    lines.current.forEach(line => {
      let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;
      if (line.type === 'h') {
        lx1 = margin + line.col * dotSpacing;
        ly1 = margin + line.row * dotSpacing;
        lx2 = lx1 + dotSpacing;
        ly2 = ly1;
      } else {
        lx1 = margin + line.col * dotSpacing;
        ly1 = margin + line.row * dotSpacing;
        lx2 = lx1;
        ly2 = ly1 + dotSpacing;
      }

      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.lineWidth = line.owner ? 4.5 : 2;
      ctx.strokeStyle = line.owner 
        ? line.owner === 'p1' ? '#06b6d4' : '#6366f1' 
        : '#334155';
      ctx.stroke();
    });

    // Draw dots
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dx = margin + c * dotSpacing;
        const dy = margin + r * dotSpacing;
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      drawBoard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gridSize]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #090910 0%, #0d1a30 50%, #0e1b4b 100%)' }}>
      
      {/* Settings Panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-widest">
              Box Chain
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Opponent Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button disabled={isPlaying} onClick={() => setOpponent('ai')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${opponent === 'ai' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-400'}`}>
                🤖 vs AI
              </button>
              <button disabled={isPlaying} onClick={() => setOpponent('player')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${opponent === 'player' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-400'}`}>
                👥 Pass & Play
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Grid Size</span>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {([4, 5, 6] as const).map(sz => (
                <button key={sz} disabled={isPlaying} onClick={() => setGridSize(sz)} className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${gridSize === sz ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-400'}`}>
                  {sz}x{sz}
                </button>
              ))}
            </div>
          </div>

          {/* Scores indicator */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Completed boxes</p>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div className="border-r border-slate-900">
                <span className="text-cyan-400 font-black">{scores.p1}</span>
                <p className="text-3xs text-slate-500">Player 1</p>
              </div>
              <div>
                <span className="text-indigo-400 font-black">{scores.p2}</span>
                <p className="text-3xs text-slate-500">{opponent === 'ai' ? 'AI Bot' : 'Player 2'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={initBoard}>
              Start Match
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Abort Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Panel
          </Button>
        </div>
      </Card>

      {/* Main Grid View */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>CONNECT DOTS TO FORM BOXES</span>
        </div>

        {isPlaying ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-xs font-bold uppercase tracking-widest font-mono">
              Current turn: <span className={activePlayer === 'p1' ? 'text-cyan-400' : 'text-indigo-400'}>{activePlayer === 'p1' ? 'PLAYER 1 (Cyan)' : opponent === 'ai' ? 'AI BOT (Blue)' : 'PLAYER 2 (Blue)'}</span>
            </div>
            
            <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onClick={handleCanvasClick}
                className="block bg-slate-950"
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {gameOver ? (
              <>
                <RefreshCw size={36} className="text-indigo-400 mx-auto animate-spin-slow" />
                <h3 className="text-2xl font-black text-slate-200">MATCH OVER</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">P1 Score: <span className="text-cyan-400 font-bold">{scores.p1}</span></p>
                  <p className="text-slate-400">P2 Score: <span className="text-indigo-400 font-bold">{scores.p2}</span></p>
                  <p className="text-yellow-400 font-bold uppercase pt-1 border-t border-slate-900">{winner}</p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={initBoard}>
                  Play Again
                </Button>
              </>
            ) : (
              <>
                <Trophy size={36} className="text-cyan-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Dots & Boxes</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Take turns drawing lines between dots. Form completed 1x1 boxes to earn points and secure extra moves!
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={initBoard}>
                  Start Match
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
