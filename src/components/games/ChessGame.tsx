// src/components/games/ChessGame.tsx — Premium Chess with AI
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }
type PieceType = 'K'|'Q'|'R'|'B'|'N'|'P';
type Color = 'w'|'b';
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];
type Phase = 'idle'|'playing'|'over';

const PIECES: Record<PieceType, Record<Color, string>> = {
  K:{w:'♔',b:'♚'},Q:{w:'♕',b:'♛'},R:{w:'♖',b:'♜'},
  B:{w:'♗',b:'♝'},N:{w:'♘',b:'♞'},P:{w:'♙',b:'♟'},
};
const INIT: [PieceType, Color][][] = [
  [['R','b'],['N','b'],['B','b'],['Q','b'],['K','b'],['B','b'],['N','b'],['R','b']],
  Array(8).fill(['P','b']),
  ...Array(4).fill(Array(8).fill(null)),
  Array(8).fill(['P','w']),
  [['R','w'],['N','w'],['B','w'],['Q','w'],['K','w'],['B','w'],['N','w'],['R','w']],
];

function initBoard(): Board {
  return INIT.map(row => row.map(cell => cell ? { type: cell[0] as PieceType, color: cell[1] as Color } : null));
}

function inBounds(r:number,c:number){ return r>=0&&r<8&&c>=0&&c<8; }

function getLegalMoves(board: Board, r: number, c: number): [number,number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number,number][] = [];
  const { type, color } = piece;
  const enemy = (r2:number,c2:number) => inBounds(r2,c2) && board[r2][c2] && board[r2][c2]!.color !== color;
  const empty = (r2:number,c2:number) => inBounds(r2,c2) && !board[r2][c2];
  const slide = (dr:number,dc:number) => {
    let r2=r+dr, c2=c+dc;
    while(inBounds(r2,c2)) {
      if(board[r2][c2]) { if(board[r2][c2]!.color!==color) moves.push([r2,c2]); break; }
      moves.push([r2,c2]); r2+=dr; c2+=dc;
    }
  };

  if(type==='P'){
    const dir=color==='w'?-1:1, startRow=color==='w'?6:1;
    if(empty(r+dir,c)){moves.push([r+dir,c]); if(r===startRow&&empty(r+dir*2,c)) moves.push([r+dir*2,c]);}
    if(enemy(r+dir,c-1)) moves.push([r+dir,c-1]);
    if(enemy(r+dir,c+1)) moves.push([r+dir,c+1]);
  }
  if(type==='N'){[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{if(empty(r+dr,c+dc)||enemy(r+dr,c+dc))moves.push([r+dr,c+dc]);});}
  if(type==='K'){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr===0&&dc===0)continue;if(empty(r+dr,c+dc)||enemy(r+dr,c+dc))moves.push([r+dr,c+dc]);}}
  if(type==='R'||type==='Q'){slide(0,1);slide(0,-1);slide(1,0);slide(-1,0);}
  if(type==='B'||type==='Q'){slide(1,1);slide(1,-1);slide(-1,1);slide(-1,-1);}
  return moves;
}

function applyMove(board: Board, from:[number,number], to:[number,number]): Board {
  const nb = board.map(r=>[...r]);
  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;
  // Pawn promotion
  if(nb[to[0]][to[1]]?.type==='P'&&(to[0]===0||to[0]===7)){
    nb[to[0]][to[1]] = { type:'Q', color:nb[to[0]][to[1]]!.color };
  }
  return nb;
}

function getAllMoves(board: Board, color: Color): {from:[number,number];to:[number,number]}[] {
  const all: {from:[number,number];to:[number,number]}[] = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(board[r][c]?.color===color) getLegalMoves(board,r,c).forEach(to=>all.push({from:[r,c],to}));
  }
  return all;
}

const PIECE_VALUES: Record<PieceType,number>={K:900,Q:90,R:50,B:30,N:28,P:10};
function evalBoard(board: Board): number {
  let score=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(!p)continue;
    score+=(p.color==='b'?1:-1)*PIECE_VALUES[p.type];
  }
  return score;
}

function getAIMove(board: Board): {from:[number,number];to:[number,number]} | null {
  const moves = getAllMoves(board,'b');
  if(moves.length===0) return null;
  let best=-Infinity, bestMove=moves[0];
  moves.forEach(m=>{
    const nb=applyMove(board,m.from,m.to);
    const score=evalBoard(nb);
    if(score>best){best=score;bestMove=m;}
  });
  return bestMove;
}

function isKingCaptured(board: Board, color: Color): boolean {
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    if(board[r][c]?.type==='K'&&board[r][c]!.color===color) return false;
  }
  return true;
}

export function ChessGame({ onClose }: Props) {
  const [board, setBoard] = useState<Board>(initBoard());
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [legalMoves, setLegalMoves] = useState<[number,number][]>([]);
  const [currentTurn, setCurrentTurn] = useState<Color>('w');
  const [result, setResult] = useState('');
  const [captured, setCaptured] = useState<{w:string[];b:string[]}>({w:[],b:[]});
  const [lastMove, setLastMove] = useState<{from:[number,number];to:[number,number]}|null>(null);

  const reset = useCallback(() => {
    setBoard(initBoard()); setSelected(null); setLegalMoves([]);
    setCurrentTurn('w'); setResult(''); setPhase('playing');
    setCaptured({w:[],b:[]}); setLastMove(null);
    toast.success('♟ New game — you play White!');
  }, []);

  const handleSquare = useCallback((r: number, c: number) => {
    if (phase !== 'playing' || currentTurn !== 'w') return;
    if (selected) {
      const isLegal = legalMoves.some(([mr,mc])=>mr===r&&mc===c);
      if (isLegal) {
        // Make player move
        const nb = applyMove(board, selected, [r,c]);
        const capturedPiece = board[r][c];
        if(capturedPiece) setCaptured(prev=>({...prev,b:[...prev.b,PIECES[capturedPiece.type].b]}));
        setBoard(nb); setLastMove({from:selected,to:[r,c]});
        setSelected(null); setLegalMoves([]);
        playTone(capturedPiece?700:500, 0.05, 'sine', 0.1); vibrate(capturedPiece?40:10);
        if(isKingCaptured(nb,'b')) { setPhase('over'); setResult('♔ You win!'); toast.success('🏆 You win!'); return; }
        setCurrentTurn('b');
        // AI move
        setTimeout(() => {
          const aiMove = getAIMove(nb);
          if(!aiMove) { setPhase('over'); setResult('♙ You win! AI has no moves.'); return; }
          const nb2 = applyMove(nb, aiMove.from, aiMove.to);
          const cap2 = nb[aiMove.to[0]][aiMove.to[1]];
          if(cap2) setCaptured(prev=>({...prev,w:[...prev.w,PIECES[cap2.type].w]}));
          setBoard(nb2); setLastMove(aiMove);
          playTone(cap2?400:350, 0.04, 'sine', 0.08);
          if(isKingCaptured(nb2,'w')) { setPhase('over'); setResult('♚ AI wins!'); toast.error('AI wins!'); return; }
          setCurrentTurn('w');
        }, 500);
      } else {
        // Select new piece
        setSelected(null); setLegalMoves([]);
        if(board[r][c]?.color==='w') { setSelected([r,c]); setLegalMoves(getLegalMoves(board,r,c)); playTone(400,0.02,'sine',0.05); }
      }
    } else {
      if(board[r][c]?.color==='w') { setSelected([r,c]); setLegalMoves(getLegalMoves(board,r,c)); playTone(400,0.02,'sine',0.05); }
    }
  }, [board, selected, legalMoves, phase, currentTurn]);

  const LIGHT='#F0D9B5', DARK='#B58863';
  const isLastMove = (r:number,c:number) => lastMove && (lastMove.from[0]===r&&lastMove.from[1]===c||lastMove.to[0]===r&&lastMove.to[1]===c);

  return (
    <div className="flex flex-col items-center gap-3 p-4 min-h-screen" style={{background:'linear-gradient(135deg,#0a1628 0%,#7b8bc1 100%)'}}>
      {/* Captured pieces */}
      {phase==='playing'&&(
        <div className="flex justify-between w-full max-w-sm text-sm">
          <div className="text-white/70">AI captured: <span className="text-red-400">{captured.b.join('')||'—'}</span></div>
          <div className="text-white/70">You captured: <span className="text-green-400">{captured.w.join('')||'—'}</span></div>
        </div>
      )}

      {/* Board */}
      {phase!=='idle'&&(
        <div className="rounded-xl overflow-hidden" style={{border:'3px solid #5d4037'}}>
          {board.map((row,r)=>(
            <div key={r} className="flex">
              {row.map((piece,c)=>{
                const isLight=(r+c)%2===0;
                const isSel=selected?.[0]===r&&selected?.[1]===c;
                const isLegal=legalMoves.some(([mr,mc])=>mr===r&&mc===c);
                const isLast=isLastMove(r,c);
                let bg=isLight?LIGHT:DARK;
                if(isSel) bg='#f6f669';
                else if(isLast) bg=isLight?'#cdd16b':'#aaa23a';
                return (
                  <motion.div key={c} onClick={()=>handleSquare(r,c)}
                    className="flex items-center justify-center relative"
                    style={{width:38,height:38,background:bg,cursor:piece?.color==='w'||isLegal?'pointer':'default'}}
                    whileHover={piece||isLegal?{ filter: 'brightness(1.15)' }:{}}
                  >
                    {isLegal&&(
                      <div className="absolute rounded-full" style={{
                        width:piece?'100%':'40%',height:piece?'100%':'40%',
                        background:piece?'rgba(20,85,30,0.35)':'rgba(20,85,30,0.4)',
                        border:piece?'4px solid rgba(20,85,30,0.4)':'none',
                        borderRadius:piece?'0':'50%',
                      }}/>
                    )}
                    {piece&&(
                      <span style={{fontSize:'26px',lineHeight:1,userSelect:'none',zIndex:1,filter:piece.color==='w'?'drop-shadow(0 1px 1px rgba(0,0,0,0.5))':'none'}}>
                        {PIECES[piece.type][piece.color]}
                      </span>
                    )}
                    {c===0&&<span className="absolute left-0.5 top-0.5 text-xs opacity-50" style={{color:isLight?DARK:LIGHT,fontSize:'9px'}}>{8-r}</span>}
                    {r===7&&<span className="absolute right-0.5 bottom-0 text-xs opacity-50" style={{color:isLight?DARK:LIGHT,fontSize:'9px'}}>{'abcdefgh'[c]}</span>}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {phase==='playing'&&<div className="text-white text-sm">{currentTurn==='w'?'Your turn (White)':'🤖 AI thinking...'}</div>}
      {result&&<div className="text-yellow-400 font-bold text-lg">{result}</div>}

      {phase==='idle'&&(
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="text-5xl">♟️</div>
          <h2 className="text-white font-bold text-3xl">Chess</h2>
          <p className="text-white/60 text-sm text-center max-w-xs">Play White against the AI. Click a piece to see legal moves, then click a highlighted square to move.</p>
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        {phase==='idle'&&<Button variant="neon" onClick={reset} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">🎮 Start</Button>}
        {phase!=='idle'&&<Button variant="neon" onClick={reset} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">🔄 New Game</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
