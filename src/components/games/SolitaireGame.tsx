import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, RefreshCw, Trophy, Undo, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card as UICard } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SolitaireGameProps {
  onClose: () => void;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type CardData = {
  id: string;
  suit: Suit;
  value: number; // 1 = Ace, 11 = Jack, 12 = Queen, 13 = King
  isFaceUp: boolean;
};

type BoardState = {
  deck: CardData[];
  waste: CardData[];
  tableau: CardData[][]; // 7 piles
  foundation: CardData[][]; // 4 piles
};

type Selection = {
  pileType: 'tableau' | 'waste' | 'foundation';
  pileIdx: number;
  cardIdx: number;
} | null;

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

// --- Helper Functions ---
const getSuitColor = (suit: Suit) => (suit === 'hearts' || suit === 'diamonds' ? 'text-rose-500' : 'text-slate-800');
const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';
const getSuitSymbol = (suit: Suit) => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};
const getCardLabel = (val: number) => {
  if (val === 1) return 'A';
  if (val === 11) return 'J';
  if (val === 12) return 'Q';
  if (val === 13) return 'K';
  return String(val);
};

// --- Main Component ---
export function SolitaireGame({ onClose }: SolitaireGameProps) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [won, setWon] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  // Initialize Game
  const startNewGame = () => {
    const deck: CardData[] = [];
    SUITS.forEach(suit => {
      for (let val = 1; val <= 13; val++) {
        deck.push({ id: `${suit}-${val}`, suit, value: val, isFaceUp: false });
      }
    });

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const tableau: CardData[][] = Array.from({ length: 7 }, () => []);
    let deckIdx = 0;
    
    // Deal to tableau (Klondike rules)
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = { ...deck[deckIdx++] };
        if (j === i) card.isFaceUp = true;
        tableau[j].push(card);
      }
    }

    const remainingDeck = deck.slice(deckIdx);

    setBoard({
      deck: remainingDeck,
      waste: [],
      tableau,
      foundation: [[], [], [], []]
    });
    setScore(0);
    setMoves(0);
    setIsPlaying(true);
    setWon(false);
    setSelection(null);
    playTone(400, 0.1, 'sine', 0.2);
  };

  // Check Win Condition
  useEffect(() => {
    if (!board) return;
    const totalFoundation = board.foundation.reduce((sum, pile) => sum + pile.length, 0);
    if (totalFoundation === 52 && !won) {
      setWon(true);
      setIsPlaying(false);
      setSelection(null);
      playTone(600, 0.3, 'sine', 0.3);
      toast.success('Congratulations! You won the game!');
    }
  }, [board, won]);

  const incrementMoves = () => setMoves(m => m + 1);
  const addScore = (pts: number) => setScore(s => s + pts);

  // --- Actions ---
  const handleDraw = () => {
    if (!board || !isPlaying) return;
    const newBoard = { ...board };
    
    if (newBoard.deck.length === 0) {
      if (newBoard.waste.length === 0) return;
      newBoard.deck = [...newBoard.waste].reverse().map(c => ({ ...c, isFaceUp: false }));
      newBoard.waste = [];
      playTone(300, 0.05, 'triangle', 0.1);
    } else {
      const card = newBoard.deck.pop()!;
      card.isFaceUp = true;
      newBoard.waste.push(card);
      playTone(400, 0.05, 'sine', 0.1);
    }

    setBoard(newBoard);
    incrementMoves();
    setSelection(null);
  };

  const handleCardClick = (pileType: 'tableau' | 'waste' | 'foundation', pileIdx: number, cardIdx: number) => {
    if (!board || !isPlaying) return;

    if (!selection) {
      let pile: CardData[];
      if (pileType === 'tableau') pile = board.tableau[pileIdx];
      else if (pileType === 'waste') pile = board.waste;
      else pile = board.foundation[pileIdx];

      const card = pile[cardIdx];
      if (!card || !card.isFaceUp) return;

      if (pileType === 'foundation' && cardIdx !== pile.length - 1) return;
      if (pileType === 'waste' && cardIdx !== pile.length - 1) return;

      setSelection({ pileType, pileIdx, cardIdx });
      playTone(500, 0.02, 'sine', 0.05);
    } else {
      if (pileType === 'tableau') {
        attemptMoveToTableau(pileIdx);
      } else if (pileType === 'foundation') {
        attemptMoveToFoundation(pileIdx);
      } else {
        setSelection(null);
      }
    }
  };

  const attemptMoveToTableau = (destPileIdx: number) => {
    if (!board || !selection) return;
    const newBoard = { ...board };
    
    let sourcePile: CardData[];
    if (selection.pileType === 'tableau') sourcePile = newBoard.tableau[selection.pileIdx];
    else if (selection.pileType === 'waste') sourcePile = newBoard.waste;
    else sourcePile = newBoard.foundation[selection.pileIdx];

    const cardsToMove = sourcePile.slice(selection.cardIdx);
    const movingCard = cardsToMove[0];
    const destPile = newBoard.tableau[destPileIdx];
    const targetCard = destPile[destPile.length - 1];

    let isValid = false;
    if (destPile.length === 0) {
      if (movingCard.value === 13) isValid = true; // Only Kings on empty spots
    } else {
      if (isRed(movingCard.suit) !== isRed(targetCard.suit) && movingCard.value === targetCard.value - 1) {
        isValid = true;
      }
    }

    if (isValid) {
      if (selection.pileType === 'tableau') {
        newBoard.tableau[selection.pileIdx] = sourcePile.slice(0, selection.cardIdx);
        const parentPile = newBoard.tableau[selection.pileIdx];
        if (parentPile.length > 0 && !parentPile[parentPile.length - 1].isFaceUp) {
          parentPile[parentPile.length - 1].isFaceUp = true;
          addScore(5);
        }
      } else if (selection.pileType === 'waste') {
        newBoard.waste.pop();
        addScore(5);
      } else {
        newBoard.foundation[selection.pileIdx].pop();
        addScore(-15);
      }

      newBoard.tableau[destPileIdx] = [...destPile, ...cardsToMove];
      
      setBoard(newBoard);
      incrementMoves();
      playTone(600, 0.05, 'sine', 0.1);
      vibrate(20);
    } else {
      playTone(200, 0.1, 'sawtooth', 0.1);
      vibrate(40);
    }
    setSelection(null);
  };

  const attemptMoveToFoundation = (destPileIdx: number) => {
    if (!board || !selection) return;
    const newBoard = { ...board };

    let sourcePile: CardData[];
    if (selection.pileType === 'tableau') sourcePile = newBoard.tableau[selection.pileIdx];
    else if (selection.pileType === 'waste') sourcePile = newBoard.waste;
    else return setSelection(null);

    if (selection.cardIdx !== sourcePile.length - 1) {
      setSelection(null);
      return;
    }

    const movingCard = sourcePile[sourcePile.length - 1];
    const destPile = newBoard.foundation[destPileIdx];
    const topCard = destPile[destPile.length - 1];

    let isValid = false;
    if (destPile.length === 0) {
      if (movingCard.value === 1) isValid = true;
    } else {
      if (movingCard.suit === topCard.suit && movingCard.value === topCard.value + 1) {
        isValid = true;
      }
    }

    if (isValid) {
      sourcePile.pop();
      if (selection.pileType === 'tableau') {
        if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].isFaceUp) {
          sourcePile[sourcePile.length - 1].isFaceUp = true;
          addScore(5);
        }
      }
      destPile.push(movingCard);
      
      addScore(10);
      setBoard(newBoard);
      incrementMoves();
      playTone(700, 0.08, 'sine', 0.1);
      vibrate(20);
    } else {
      playTone(200, 0.1, 'sawtooth', 0.1);
      vibrate(40);
    }
    setSelection(null);
  };

  const handleDoubleClick = (pileType: 'tableau' | 'waste', pileIdx: number, cardIdx: number) => {
    if (!board || !isPlaying) return;
    
    let sourcePile: CardData[];
    if (pileType === 'tableau') sourcePile = board.tableau[pileIdx];
    else sourcePile = board.waste;

    if (cardIdx !== sourcePile.length - 1) return;
    
    const card = sourcePile[cardIdx];
    if (!card.isFaceUp) return;

    let validFoundationIdx = -1;
    for (let i = 0; i < 4; i++) {
      const fPile = board.foundation[i];
      if (fPile.length === 0) {
        if (card.value === 1) { validFoundationIdx = i; break; }
      } else {
        const top = fPile[fPile.length - 1];
        if (top.suit === card.suit && top.value + 1 === card.value) {
          validFoundationIdx = i; break;
        }
      }
    }

    if (validFoundationIdx !== -1) {
      setSelection({ pileType, pileIdx, cardIdx });
      setTimeout(() => attemptMoveToFoundation(validFoundationIdx), 0);
    }
  };

  const renderCard = (card: CardData, isSelected: boolean, onClick: () => void, onDoubleClick: () => void, yOffset: number = 0) => {
    return (
      <motion.div
        layoutId={card.id}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: yOffset }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`absolute w-12 sm:w-16 lg:w-20 xl:w-24 aspect-[2.5/3.5] rounded-lg sm:rounded-xl shadow-md border overflow-hidden cursor-pointer select-none transition-shadow
          ${card.isFaceUp ? 'bg-white border-slate-300' : 'bg-gradient-to-br from-indigo-700 to-indigo-900 border-indigo-500'}
          ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-emerald-900 shadow-[0_0_20px_rgba(250,204,21,0.6)] z-50' : 'hover:shadow-lg'}
        `}
        style={{ top: 0, left: 0 }}
      >
        {card.isFaceUp ? (
          <div className={`flex flex-col justify-between w-full h-full p-1 sm:p-2 ${getSuitColor(card.suit)}`}>
            <div className="flex flex-col leading-none items-start">
              <span className="text-xs sm:text-sm lg:text-base font-bold tracking-tighter">{getCardLabel(card.value)}</span>
              <span className="text-xs sm:text-sm lg:text-base leading-none">{getSuitSymbol(card.suit)}</span>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
               <span className="text-3xl sm:text-4xl lg:text-5xl">{getSuitSymbol(card.suit)}</span>
            </div>

            <div className="flex flex-col leading-none items-end rotate-180">
              <span className="text-xs sm:text-sm lg:text-base font-bold tracking-tighter">{getCardLabel(card.value)}</span>
              <span className="text-xs sm:text-sm lg:text-base leading-none">{getSuitSymbol(card.suit)}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-1.5 opacity-80 flex items-center justify-center">
             <div className="w-full h-full border-2 border-indigo-400/30 rounded-sm bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 to-transparent flex items-center justify-center">
                <span className="text-indigo-300/50 text-xl lg:text-2xl">♠</span>
             </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderEmptySlot = (label: string, onClick?: () => void) => (
    <div 
      onClick={onClick}
      className="w-12 sm:w-16 lg:w-20 xl:w-24 aspect-[2.5/3.5] rounded-lg sm:rounded-xl border-2 border-dashed border-emerald-700/50 bg-emerald-900/20 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-800/30 transition-colors"
    >
      <span className="text-emerald-700/60 font-bold text-[10px] sm:text-xs lg:text-sm">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 w-full h-full min-h-[calc(100vh-100px)] items-stretch rounded-2xl shadow-2xl relative overflow-hidden" 
         style={{ background: 'radial-gradient(circle at center, #0f5132 0%, #062b19 100%)' }}>
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500 rounded-full blur-[120px]" />
      </div>

      {/* Settings / Info Panel */}
      <UICard className="w-full lg:w-64 xl:w-72 flex flex-col justify-between p-5 space-y-5 bg-slate-950/80 backdrop-blur-xl border border-emerald-900/50 rounded-2xl shrink-0 z-20 text-white shadow-xl">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-emerald-900/50 pb-4">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 uppercase tracking-widest flex items-center gap-2">
              <span className="text-2xl">♠</span> Solitaire
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/30 flex flex-col items-center justify-center gap-1">
              <Coins size={16} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
              <span className="font-mono text-lg font-bold text-yellow-400">{score}</span>
            </div>
            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/30 flex flex-col items-center justify-center gap-1">
              <Undo size={16} className="text-cyan-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Moves</span>
              <span className="font-mono text-lg font-bold text-cyan-400">{moves}</span>
            </div>
          </div>

          <div className="text-xs text-emerald-300/60 leading-relaxed bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/30">
            <p className="flex items-center gap-2 mb-2"><HelpCircle size={14} className="text-emerald-400"/> <strong>How to Play</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Build foundations from Ace to King by suit.</li>
              <li>Tableau piles must be descending and alternating colors.</li>
              <li>Click to select, click to place.</li>
              <li>Double-click to auto-move to foundation.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-4 text-sm rounded-xl shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)]" onClick={startNewGame}>
              Deal Cards
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-4 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setBoard(null); }}>
              Forfeit Game
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white transition-colors" onClick={onClose}>
            Exit to Library
          </Button>
        </div>
      </UICard>

      {/* Board Area */}
      <div className="flex-1 relative min-h-[500px] z-10 p-2 sm:p-4 overflow-hidden">
        {isPlaying && board ? (
          <div className="w-full max-w-5xl mx-auto h-full flex flex-col gap-6 sm:gap-10">
            
            {/* TOP ROW: Deck, Waste, Foundations */}
            <div className="flex justify-between items-start w-full">
              
              {/* Deck & Waste */}
              <div className="flex gap-2 sm:gap-4">
                <div className="relative w-12 sm:w-16 lg:w-20 xl:w-24 aspect-[2.5/3.5]">
                  {board.deck.length > 0 ? (
                    <div className="absolute inset-0 cursor-pointer hover:-translate-y-1 transition-transform" onClick={handleDraw}>
                      <div className="absolute inset-0 bg-indigo-900 border border-indigo-700 rounded-lg sm:rounded-xl top-1 left-1" />
                      <div className="absolute inset-0 bg-indigo-800 border border-indigo-600 rounded-lg sm:rounded-xl top-0.5 left-0.5" />
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-400 rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center">
                         <RefreshCw size={24} className="text-indigo-300 opacity-50" />
                      </div>
                    </div>
                  ) : renderEmptySlot('↻', handleDraw)}
                </div>

                <div className="relative w-12 sm:w-16 lg:w-20 xl:w-24 aspect-[2.5/3.5]" onClick={() => board.waste.length > 0 && handleCardClick('waste', 0, board.waste.length - 1)}>
                  {board.waste.length === 0 && renderEmptySlot('')}
                  <AnimatePresence>
                    {board.waste.map((card, idx) => {
                      if (idx < board.waste.length - 3) return null;
                      const isSelected = selection?.pileType === 'waste' && selection.cardIdx === idx;
                      const offset = (idx - (board.waste.length - 1)) * 2;
                      return (
                        <div key={card.id} className="absolute inset-0" style={{ transform: `translateX(${Math.max(0, offset * 6)}px)`, zIndex: idx }}>
                          {renderCard(card, isSelected, () => handleCardClick('waste', 0, idx), () => handleDoubleClick('waste', 0, idx))}
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Foundations */}
              <div className="flex gap-2 sm:gap-4">
                {board.foundation.map((pile, pIdx) => (
                  <div key={pIdx} className="relative w-12 sm:w-16 lg:w-20 xl:w-24 aspect-[2.5/3.5]" onClick={() => selection && handleCardClick('foundation', pIdx, pile.length - 1)}>
                    {renderEmptySlot(getSuitSymbol(SUITS[pIdx]))}
                    {pile.map((card, cIdx) => (
                         <div key={card.id} className="absolute inset-0" style={{ zIndex: cIdx }}>
                           {renderCard(card, selection?.pileType === 'foundation' && selection.pileIdx === pIdx && selection.cardIdx === cIdx, () => handleCardClick('foundation', pIdx, cIdx), () => {})}
                         </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM ROW: Tableau */}
            <div className="flex justify-between w-full mt-4">
              {board.tableau.map((pile, pIdx) => (
                <div key={pIdx} className="relative w-[13.5%] max-w-[96px]" onClick={() => pile.length === 0 && selection && handleCardClick('tableau', pIdx, 0)}>
                  <div className="absolute top-0 left-0 w-full aspect-[2.5/3.5]">
                    {renderEmptySlot('K')}
                  </div>
                  {pile.map((card, cIdx) => {
                    let yOffset = 0;
                    for(let i=0; i<cIdx; i++) {
                       yOffset += pile[i].isFaceUp ? 28 : 12;
                    }
                    return (
                      <div key={card.id} className="absolute top-0 left-0 w-full z-10" style={{ zIndex: cIdx + 10 }}>
                        {renderCard(card, selection?.pileType === 'tableau' && selection.pileIdx === pIdx && selection.cardIdx === cIdx, () => handleCardClick('tableau', pIdx, cIdx), () => handleDoubleClick('tableau', pIdx, cIdx), yOffset)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-fade-in">
            {won ? (
              <div className="space-y-8 p-10 bg-emerald-950/60 backdrop-blur-md rounded-3xl border border-emerald-500/30 shadow-2xl">
                <Trophy size={64} className="text-yellow-400 mx-auto animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                <div>
                  <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2">VICTORY</h3>
                  <p className="text-emerald-200">You've cleared the board!</p>
                </div>
                <div className="flex justify-center gap-6 text-lg font-mono bg-emerald-900/50 py-4 px-8 rounded-2xl border border-emerald-700/50">
                  <div className="flex flex-col"><span className="text-xs text-slate-400">SCORE</span><span className="text-yellow-400 font-bold">{score}</span></div>
                  <div className="w-px bg-emerald-800" />
                  <div className="flex flex-col"><span className="text-xs text-slate-400">MOVES</span><span className="text-cyan-400 font-bold">{moves}</span></div>
                </div>
                <Button variant="neon" size="lg" className="w-full text-lg py-6 rounded-2xl" onClick={startNewGame}>
                  Play Again
                </Button>
              </div>
            ) : (
               <div className="opacity-50 flex flex-col items-center gap-4">
                 <div className="w-24 h-32 rounded-xl border-4 border-dashed border-emerald-700/50 flex items-center justify-center">
                    <span className="text-4xl text-emerald-700/50">♠</span>
                 </div>
                 <p className="text-emerald-500/70 font-medium tracking-widest uppercase">Select Deal Cards to begin</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
