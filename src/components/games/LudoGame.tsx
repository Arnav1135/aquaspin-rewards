// src/components/games/LudoGame.tsx
// Ludo — 4-player classic board game with AI opponents and animated token movement

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LudoGameProps { onClose: () => void; }

type Color = 'red' | 'blue' | 'green' | 'yellow';
type Token = { id: string; color: Color; pos: number; home: boolean; finished: boolean };

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_HEX: Record<Color, string> = {
  red: '#F76C6C', blue: '#4A90D9', green: '#3DDC97', yellow: '#FFD700'
};
const COLOR_DARK: Record<Color, string> = {
  red: '#c04040', blue: '#1a5fa3', green: '#1a8a5c', yellow: '#b8960a'
};

// Board positions for each color's path (simplified 52-step circular path)
const PATH_CELLS = 52;
const START_POS: Record<Color, number> = { red: 0, blue: 13, green: 26, yellow: 39 };
const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

export function LudoGame({ onClose }: LudoGameProps) {
  const [tokens, setTokens] = useState<Token[]>(() =>
    COLORS.flatMap(color =>
      [0, 1, 2, 3].map(i => ({
        id: `${color}-${i}`,
        color,
        pos: -1, // -1 = in home base
        home: true,
        finished: false,
      }))
    )
  );

  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Color>('red');
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<Color | null>(null);
  const [movableTokenIds, setMovableTokenIds] = useState<string[]>([]);

  const humanColor: Color = 'red';

  const rollDice = useCallback(() => {
    if (rolling || winner) return;
    setRolling(true);


    // Animate dice roll
    let frames = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.ceil(Math.random() * 6));
      frames++;
      if (frames >= 8) {
        clearInterval(interval);
        const finalVal = Math.ceil(Math.random() * 6);
        setDiceValue(finalVal);
        setRolling(false);
        playTone(500, 0.06, 'sine', 0.1);
        vibrate(30);

        // Determine movable tokens for current player
        const myTokens = tokens.filter(t => t.color === currentTurn && !t.finished);
        const movable = myTokens.filter(t => {
          if (t.home) return finalVal === 6; // need 6 to leave home
          return true; // any value can move on-board tokens
        });
        setMovableTokenIds(movable.map(t => t.id));

        if (movable.length === 0) {
          toast(`No moves for ${currentTurn}! Passing...`, { id: 'no-move' });
          setTimeout(() => nextTurn(currentTurn), 1000);
        } else if (currentTurn !== humanColor) {
          // AI auto-move
          setTimeout(() => {
            const pick = movable[0];
            moveToken(pick, finalVal, tokens, currentTurn);
          }, 800);
        }
      }
    }, 80);
  }, [rolling, winner, tokens, currentTurn]);

  const nextTurn = (current: Color) => {
    const idx = COLORS.indexOf(current);
    setCurrentTurn(COLORS[(idx + 1) % 4]);
    setDiceValue(null);
    setMovableTokenIds([]);
  };

  const moveToken = useCallback((token: Token, steps: number, allTokens: Token[], turnColor: Color) => {
    const newTokens = allTokens.map(t => {
      if (t.id !== token.id) return t;

      let newPos: number;
      if (t.home) {
        // Exit home base
        newPos = START_POS[t.color];
      } else {
        newPos = (t.pos + steps) % PATH_CELLS;
      }

      // Check if token reaches home stretch (simplified: pos >= 50 = finished)
      const finished = !t.home && (t.pos + steps) >= PATH_CELLS + 2;

      return { ...t, pos: newPos, home: false, finished };
    });

    // Check captures (another color token at same non-safe pos)
    const movedToken = newTokens.find(t => t.id === token.id)!;
    if (!movedToken.finished && !SAFE_CELLS.includes(movedToken.pos)) {
      newTokens.forEach((t, i) => {
        if (t.color !== turnColor && !t.home && !t.finished && t.pos === movedToken.pos) {
          newTokens[i] = { ...t, pos: -1, home: true };
          playTone(800, 0.1, 'sine', 0.15);
          toast.success(`${turnColor} captured ${t.color}'s token!`);
        }
      });
    }

    setTokens(newTokens);
    playTone(550, 0.05, 'sine', 0.1);
    vibrate(25);

    // Check win
    const myFinished = newTokens.filter(t => t.color === turnColor && t.finished).length;
    if (myFinished === 4) {
      setWinner(turnColor);
      playTone(700, 0.15, 'sine', 0.3);
      toast.success(`🏆 ${turnColor.toUpperCase()} WINS LUDO!`);
      return;
    }

    setMovableTokenIds([]);
    if (steps !== 6) {
      nextTurn(turnColor);
    } else {
      // Roll again on 6
      toast(`${turnColor} rolled 6 — roll again!`, { id: 'roll-again' });
      setDiceValue(null);
    }
  }, []);

  const handleTokenClick = (tokenId: string) => {
    if (currentTurn !== humanColor || !diceValue || rolling) return;
    if (!movableTokenIds.includes(tokenId)) return;
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;
    moveToken(token, diceValue, tokens, currentTurn);
  };

  const resetGame = () => {
    setTokens(
      COLORS.flatMap(color =>
        [0, 1, 2, 3].map(i => ({ id: `${color}-${i}`, color, pos: -1, home: true, finished: false }))
      )
    );
    setDiceValue(null);
    setCurrentTurn('red');
    setRolling(false);
    setWinner(null);
    setMovableTokenIds([]);
    playTone(500, 0.05, 'sine', 0.1);
  };



  // Simplified board render using CSS grid representation
  const boardZones: { color: Color; gridCol: number; gridRow: number }[] = [
    { color: 'red',    gridCol: 1, gridRow: 1 },
    { color: 'blue',   gridCol: 3, gridRow: 1 },
    { color: 'green',  gridCol: 3, gridRow: 3 },
    { color: 'yellow', gridCol: 1, gridRow: 3 },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-5 p-4 max-w-4xl mx-auto items-start">
      {/* Board */}
      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: '#f8f9fa',
          boxShadow: '0 8px 32px rgba(22,33,62,0.15)',
          minWidth: 340,
          maxWidth: 420,
        }}
      >
        {/* Simplified Ludo board using CSS Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '6fr 3fr 6fr',
            gridTemplateRows: '6fr 3fr 6fr',
            width: '100%',
            aspectRatio: '1',
            background: 'white',
          }}
        >
          {/* Corner Home Areas */}
          {boardZones.map(({ color, gridCol, gridRow }) => (
            <div
              key={color}
              style={{
                gridColumn: gridCol,
                gridRow: gridRow,
                background: `${COLOR_HEX[color]}22`,
                border: `3px solid ${COLOR_HEX[color]}`,
                borderRadius: 8,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 8,
              }}
            >
              {tokens
                .filter(t => t.color === color && t.home)
                .map(t => (
                  <motion.button
                    key={t.id}
                    onClick={() => handleTokenClick(t.id)}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: COLOR_HEX[color],
                      border: movableTokenIds.includes(t.id)
                        ? '3px solid white'
                        : `2px solid ${COLOR_DARK[color]}`,
                      cursor: movableTokenIds.includes(t.id) ? 'pointer' : 'default',
                      boxShadow: movableTokenIds.includes(t.id)
                        ? `0 0 12px ${COLOR_HEX[color]}`
                        : 'none',
                    }}
                  />
                ))}
            </div>
          ))}

          {/* Center path area */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 1,
              background: `linear-gradient(135deg, ${COLOR_HEX.red}33, ${COLOR_HEX.blue}33)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>PATH</span>
          </div>
          <div
            style={{ gridColumn: 2, gridRow: 3, background: `linear-gradient(135deg, ${COLOR_HEX.yellow}33, ${COLOR_HEX.green}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>PATH</span>
          </div>
          <div
            style={{ gridColumn: 1, gridRow: 2, background: `linear-gradient(135deg, ${COLOR_HEX.red}33, ${COLOR_HEX.yellow}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>PATH</span>
          </div>
          <div
            style={{ gridColumn: 3, gridRow: 2, background: `linear-gradient(135deg, ${COLOR_HEX.blue}33, ${COLOR_HEX.green}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 10, color: '#666', fontWeight: 700 }}>PATH</span>
          </div>

          {/* Center winning area */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 2,
              background: 'linear-gradient(135deg, #FFD700, #FF9900)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              borderRadius: 4,
            }}
          >
            🏠
          </div>
        </div>

        {/* On-board tokens position display */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(22,33,62,0.08)' }}>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map(color => {
              const onBoard = tokens.filter(t => t.color === color && !t.home && !t.finished);
              const finished = tokens.filter(t => t.color === color && t.finished).length;
              return (
                <div key={color} className="text-center">
                  <div
                    className="text-2xs font-bold uppercase"
                    style={{ color: COLOR_HEX[color] }}
                  >
                    {color}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {onBoard.map(t => (
                      <motion.button
                        key={t.id}
                        onClick={() => handleTokenClick(t.id)}
                        whileTap={{ scale: 0.85 }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: COLOR_HEX[color],
                          border: movableTokenIds.includes(t.id) ? '2px solid white' : `1.5px solid ${COLOR_DARK[color]}`,
                          cursor: movableTokenIds.includes(t.id) ? 'pointer' : 'default',
                          fontSize: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          boxShadow: movableTokenIds.includes(t.id) ? `0 0 8px ${COLOR_HEX[color]}` : 'none',
                        }}
                      >
                        {t.pos}
                      </motion.button>
                    ))}
                  </div>
                  <div className="text-2xs mt-0.5" style={{ color: '#3DDC97' }}>
                    {finished > 0 && `✓×${finished}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-56 space-y-4">
        <div
          className="card-navy on-navy p-4 rounded-2xl"
        >
          <div className="text-center mb-3">
            <div
              className="text-sm font-bold mb-0.5"
              style={{ color: COLOR_HEX[currentTurn] }}
            >
              {currentTurn.toUpperCase()}'S TURN
            </div>
            <div className="text-2xs" style={{ color: 'rgba(245,248,252,0.50)' }}>
              {currentTurn === humanColor ? 'Your turn!' : 'AI is thinking...'}
            </div>
          </div>

          {/* Dice */}
          <motion.button
            onClick={rollDice}
            disabled={rolling || !!winner || (currentTurn !== humanColor) || !!diceValue}
            className="w-full aspect-square rounded-2xl flex items-center justify-center text-5xl mb-3"
            style={{
              background: 'rgba(245,248,252,0.08)',
              border: '2px solid rgba(245,248,252,0.15)',
              cursor: rolling || !!winner || currentTurn !== humanColor || !!diceValue
                ? 'not-allowed'
                : 'pointer',
              opacity: rolling || (currentTurn !== humanColor && !winner) ? 0.6 : 1,
            }}
            animate={rolling ? { rotate: [0, 45, -45, 90, -90, 0] } : {}}
            transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
          >
            {diceValue
              ? ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue]
              : '🎲'
            }
          </motion.button>

          {!winner && currentTurn === humanColor && !diceValue && (
            <Button variant="sky" fullWidth size="sm" onClick={rollDice} disabled={rolling}>
              {rolling ? 'Rolling...' : 'Roll Dice'}
            </Button>
          )}
        </div>

        <Button variant="ghost" fullWidth size="sm" onClick={resetGame}>
          New Game
        </Button>
        <Button variant="ghost" fullWidth size="sm" onClick={onClose}>
          Exit
        </Button>

        {winner && (
          <motion.div
            className="text-center p-4 rounded-2xl"
            style={{ background: `${COLOR_HEX[winner]}20`, border: `2px solid ${COLOR_HEX[winner]}` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            <p className="text-2xl mb-1">🏆</p>
            <p className="font-bold" style={{ color: COLOR_HEX[winner] }}>
              {winner.toUpperCase()} WINS!
            </p>
            <Button variant="primary" size="sm" className="mt-2 w-full" onClick={resetGame}>
              Play Again
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
