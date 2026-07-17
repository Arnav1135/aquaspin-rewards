// src/components/games/SolitaireGame.tsx
import { useState } from 'react';
import { HelpCircle, RefreshCw, Trophy, Undo, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SolitaireGameProps {
  onClose: () => void;
}

type CardType = {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: number; // 1 = Ace, 11 = Jack, 12 = Queen, 13 = King
  isFaceUp: boolean;
};

type BoardState = {
  deck: CardType[];
  waste: CardType[];
  tableau: CardType[][]; // 7 piles
  foundation: CardType[][]; // 4 piles (Hearts, Diamonds, Clubs, Spades)
};

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

export function SolitaireGame({ onClose }: SolitaireGameProps) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [won, setWon] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ pileType: 'tableau' | 'waste'; pileIdx: number; cardIdx: number } | null>(null);

  // Generate standard shuffled deck
  const buildShuffledDeck = (): CardType[] => {
    const deck: CardType[] = [];
    SUITS.forEach(suit => {
      for (let val = 1; val <= 13; val++) {
        deck.push({
          id: `${suit}-${val}`,
          suit,
          value: val,
          isFaceUp: false
        });
      }
    });

    // Shuffle Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };

  const startNewGame = () => {
    const deck = buildShuffledDeck();
    const tableau: CardType[][] = Array.from({ length: 7 }, () => []);
    
    // Deal to tableau
    let deckIdx = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[deckIdx++];
        if (j === i) card.isFaceUp = true;
        tableau[j].push(card);
      }
    }

    const restOfDeck = deck.slice(deckIdx);

    setBoard({
      deck: restOfDeck,
      waste: [],
      tableau,
      foundation: [[], [], [], []]
    });
    setScore(0);
    setMoves(0);
    setIsPlaying(true);
    setWon(false);
    setSelectedCard(null);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const handleDrawCard = () => {
    if (!board || !isPlaying) return;
    const newBoard = { ...board };
    
    if (newBoard.deck.length === 0) {
      // Recycle waste back to deck
      if (newBoard.waste.length === 0) return;
      newBoard.deck = [...newBoard.waste].reverse().map(c => ({ ...c, isFaceUp: false }));
      newBoard.waste = [];
      playTone(350, 0.05, 'sine', 0.1);
    } else {
      const card = newBoard.deck.pop()!;
      card.isFaceUp = true;
      newBoard.waste.push(card);
      playTone(450, 0.04, 'sine', 0.1);
    }

    setBoard(newBoard);
    setMoves(m => m + 1);
    setSelectedCard(null);
  };

  const handleCardClick = (pileType: 'tableau' | 'waste', pileIdx: number, cardIdx: number) => {
    if (!board || !isPlaying) return;
    
    if (selectedCard === null) {
      // Select source card
      const pile = pileType === 'tableau' ? board.tableau[pileIdx] : board.waste;
      const card = pile[cardIdx];
      if (!card.isFaceUp) return;

      setSelectedCard({ pileType, pileIdx, cardIdx });
      playTone(550, 0.02, 'sine', 0.05);
    } else {
      // Try to move to tableau pile
      if (pileType === 'tableau') {
        attemptMoveToTableau(pileIdx);
      } else {
        setSelectedCard(null); // Cancel selection
      }
    }
  };

  const attemptMoveToTableau = (destPileIdx: number) => {
    if (!board || !selectedCard) return;
    const newBoard = { ...board };

    const sourcePile = selectedCard.pileType === 'tableau' 
      ? newBoard.tableau[selectedCard.pileIdx] 
      : newBoard.waste;

    const cardsToMove = sourcePile.slice(selectedCard.cardIdx);
    const movingCard = cardsToMove[0];

    const destPile = newBoard.tableau[destPileIdx];
    const targetCard = destPile[destPile.length - 1];

    let isValid = false;
    if (destPile.length === 0) {
      // Only Kings can be placed on empty tableau columns
      if (movingCard.value === 13) isValid = true;
    } else {
      // Must be alternating suit colors and 1 value less
      const movingIsRed = movingCard.suit === 'hearts' || movingCard.suit === 'diamonds';
      const targetIsRed = targetCard.suit === 'hearts' || targetCard.suit === 'diamonds';
      if (movingIsRed !== targetIsRed && targetCard.value === movingCard.value + 1) {
        isValid = true;
      }
    }

    if (isValid) {
      // Move card stack
      if (selectedCard.pileType === 'tableau') {
        newBoard.tableau[selectedCard.pileIdx] = sourcePile.slice(0, selectedCard.cardIdx);
        // Reveal the card below it if face down
        const parentPile = newBoard.tableau[selectedCard.pileIdx];
        if (parentPile.length > 0 && !parentPile[parentPile.length - 1].isFaceUp) {
          parentPile[parentPile.length - 1].isFaceUp = true;
          setScore(s => s + 5);
        }
      } else {
        newBoard.waste.pop();
      }

      newBoard.tableau[destPileIdx] = [...destPile, ...cardsToMove];
      
      setBoard(newBoard);
      setScore(s => s + 10);
      setMoves(m => m + 1);
      playTone(600, 0.05, 'sine', 0.1);
      vibrate(20);
    } else {
      playTone(220, 0.15, 'sawtooth', 0.1);
      vibrate(50);
      toast.error('Invalid Solitaire Move!');
    }

    setSelectedCard(null);
  };

  const handleMoveToFoundation = (foundIdx: number) => {
    if (!board || !selectedCard) return;
    const newBoard = { ...board };

    const sourcePile = selectedCard.pileType === 'tableau' 
      ? newBoard.tableau[selectedCard.pileIdx] 
      : newBoard.waste;

    const movingCard = sourcePile[sourcePile.length - 1];
    const foundationPile = newBoard.foundation[foundIdx];

    let isValid = false;
    if (foundationPile.length === 0) {
      // Must be Ace to start foundation
      if (movingCard.value === 1) isValid = true;
    } else {
      // Must be same suit and 1 value greater
      const topCard = foundationPile[foundationPile.length - 1];
      if (topCard.suit === movingCard.suit && movingCard.value === topCard.value + 1) {
        isValid = true;
      }
    }

    if (isValid) {
      // Remove from source
      if (selectedCard.pileType === 'tableau') {
        newBoard.tableau[selectedCard.pileIdx].pop();
        const parentPile = newBoard.tableau[selectedCard.pileIdx];
        if (parentPile.length > 0 && !parentPile[parentPile.length - 1].isFaceUp) {
          parentPile[parentPile.length - 1].isFaceUp = true;
          setScore(s => s + 5);
        }
      } else {
        newBoard.waste.pop();
      }

      // Add to foundation
      newBoard.foundation[foundIdx].push(movingCard);

      setBoard(newBoard);
      setScore(s => s + 15);
      setMoves(m => m + 1);
      playTone(650, 0.06, 'sine', 0.12);
      vibrate(20);

      // Check win condition
      const totalFoundation = newBoard.foundation.reduce((acc, p) => acc + p.length, 0);
      if (totalFoundation === 52) {
        setWon(true);
        setIsPlaying(false);
        playTone(523, 0.15, 'sine', 0.2);
        toast.success('🥇 Solitaire Completed! Beautiful play.');
      }
    } else {
      playTone(220, 0.15, 'sawtooth', 0.15);
      vibrate(50);
      toast.error('Cannot place on this foundation!');
    }

    setSelectedCard(null);
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      default: return '♠';
    }
  };

  const getCardValueLabel = (val: number) => {
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return String(val);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #022c1b 0%, #064e3b 50%, #042f2c 100%)' }}>
      
      {/* Settings Panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 uppercase tracking-widest">
              Solitaire
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Coins size={14} className="text-yellow-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-400">{score}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Undo size={14} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Moves</span>
            </div>
            <span className="font-mono text-sm font-bold text-slate-400">{moves}</span>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startNewGame}>
              Start Match
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setBoard(null); }}>
              Surrender Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-slate-400" onClick={onClose}>
            Exit Panel
          </Button>
        </div>
      </Card>

      {/* Solitaire Green Felt Board Area */}
      <Card className="flex-1 flex flex-col items-center justify-start relative min-h-[500px] border border-emerald-800/80 rounded-2xl p-6 overflow-hidden bg-emerald-950/20 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-emerald-400/80 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-emerald-400" />
          <span>DRAG/CLICK CARDS TO SORT</span>
        </div>

        {isPlaying && board ? (
          <div className="flex flex-col gap-6 w-full h-full">
            
            {/* Top Deck & Foundations Pile bar */}
            <div className="flex justify-between items-center w-full max-w-3xl border-b border-emerald-800/30 pb-4">
              
              {/* Deck draw pile */}
              <div className="flex gap-4">
                <button
                  onClick={handleDrawCard}
                  className="w-12 h-18 rounded-lg border-2 border-emerald-500 bg-emerald-700/40 hover:bg-emerald-700/60 shadow-md flex items-center justify-center text-sm font-bold text-emerald-300"
                >
                  {board.deck.length > 0 ? '🂠' : '↻'}
                </button>

                {/* Waste pile */}
                {board.waste.length > 0 ? (
                  <button
                    onClick={() => handleCardClick('waste', 0, board.waste.length - 1)}
                    className={`w-12 h-18 rounded-lg bg-white border-2 text-center flex flex-col justify-between p-1 select-none ${
                      selectedCard?.pileType === 'waste' ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-slate-300'
                    } ${
                      board.waste[board.waste.length - 1].suit === 'hearts' || board.waste[board.waste.length - 1].suit === 'diamonds'
                        ? 'text-red-500' : 'text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold leading-none">{getCardValueLabel(board.waste[board.waste.length - 1].value)}</div>
                    <div className="text-lg leading-none">{getSuitSymbol(board.waste[board.waste.length - 1].suit)}</div>
                  </button>
                ) : (
                  <div className="w-12 h-18 rounded-lg border-2 border-dashed border-emerald-800/60 flex items-center justify-center text-xs text-emerald-800/50">
                    Empty
                  </div>
                )}
              </div>

              {/* Foundation targets */}
              <div className="flex gap-2">
                {board.foundation.map((pile, idx) => {
                  const isTopSelected = selectedCard !== null;
                  return (
                    <button
                      key={idx}
                      onClick={() => isTopSelected && handleMoveToFoundation(idx)}
                      className={`w-12 h-18 rounded-lg border-2 flex flex-col justify-between p-1 bg-emerald-950/20 text-center ${
                        pile.length > 0 
                          ? pile[pile.length - 1].suit === 'hearts' || pile[pile.length - 1].suit === 'diamonds'
                            ? 'bg-white border-slate-300 text-red-500' : 'bg-white border-slate-300 text-slate-800'
                          : 'border-dashed border-emerald-800/60 text-emerald-800/40'
                      }`}
                    >
                      {pile.length > 0 ? (
                        <>
                          <div className="text-xs font-bold leading-none">{getCardValueLabel(pile[pile.length - 1].value)}</div>
                          <div className="text-lg leading-none">{getSuitSymbol(pile[pile.length - 1].suit)}</div>
                        </>
                      ) : (
                        <span className="m-auto text-xl">{idx === 0 ? '♥' : idx === 1 ? '♦' : idx === 2 ? '♣' : '♠'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Tableau Columns display */}
            <div className="grid grid-cols-7 gap-2.5 w-full max-w-3xl">
              {board.tableau.map((pile, pIdx) => (
                <div key={pIdx} className="flex flex-col gap-1 min-h-[220px] rounded-lg bg-emerald-950/5 p-1 border border-emerald-800/10">
                  {pile.length === 0 ? (
                    <button
                      onClick={() => selectedCard && attemptMoveToTableau(pIdx)}
                      className="w-full h-18 rounded-lg border-2 border-dashed border-emerald-800/60 flex items-center justify-center text-2xs text-emerald-800/40"
                    >
                      King
                    </button>
                  ) : (
                    pile.map((card, cIdx) => {
                      const isSelected = selectedCard?.pileType === 'tableau' && selectedCard.pileIdx === pIdx && selectedCard.cardIdx === cIdx;
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick('tableau', pIdx, cIdx)}
                          className={`w-full h-18 rounded-lg text-center flex flex-col justify-between p-1 select-none border-2 shadow-sm cursor-pointer ${
                            card.isFaceUp
                              ? card.suit === 'hearts' || card.suit === 'diamonds'
                                ? 'bg-white border-slate-300 text-red-500' 
                                : 'bg-white border-slate-300 text-slate-800'
                              : 'bg-emerald-700 border-emerald-800/80 text-emerald-500'
                          } ${
                            isSelected ? 'border-yellow-400 ring-2 ring-yellow-400/30' : ''
                          }`}
                        >
                          {card.isFaceUp ? (
                            <>
                              <div className="text-xs font-bold leading-none">{getCardValueLabel(card.value)}</div>
                              <div className="text-base leading-none">{getSuitSymbol(card.suit)}</div>
                            </>
                          ) : (
                            <span className="m-auto text-sm opacity-20">★</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm m-auto">
            {won ? (
              <>
                <RefreshCw size={36} className="text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-yellow-300">SOLITAIRE WON</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Total Score: <span className="text-cyan-400 font-bold">{score}</span></p>
                  <p className="text-slate-400">Total Moves: <span className="text-indigo-400 font-bold">{moves}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" onClick={startNewGame}>
                  Play Again
                </Button>
              </>
            ) : (
              <>
                <RefreshCw size={36} className="text-emerald-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Classic Solitaire</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Arrange cards in descending order with alternating red and black colors to sort columns, and build foundations from Ace to King.
                </p>
                <Button variant="neon" size="lg" className="w-full w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" onClick={startNewGame}>
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
