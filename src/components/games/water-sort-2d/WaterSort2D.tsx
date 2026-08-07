import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCcw } from 'lucide-react';

const COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', 
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55', 
  '#A2845E', '#8E8E93'
];

interface WaterSort2DProps {
  level: number;
  onWin: () => void;
}

export default function WaterSort2D({ level, onWin }: WaterSort2DProps) {
  const [tubes, setTubes] = useState<string[][]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [animatingPour, setAnimatingPour] = useState<{from: number, to: number, color: string, amount: number} | null>(null);

  const TUBE_CAPACITY = 4;

  const generateLevel = useCallback(() => {
    // Number of colors increases with level, max 8
    const numColors = Math.min(level + 2, 8);
    const numEmptyTubes = 2;
    const totalTubes = numColors + numEmptyTubes;
    
    // Get colors for this level
    const levelColors = COLORS.slice(0, numColors);
    
    // Create an array with TUBE_CAPACITY of each color
    let allLiquids: string[] = [];
    levelColors.forEach(color => {
      for (let i = 0; i < TUBE_CAPACITY; i++) {
        allLiquids.push(color);
      }
    });
    
    // Shuffle the liquids
    for (let i = allLiquids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allLiquids[i], allLiquids[j]] = [allLiquids[j], allLiquids[i]];
    }
    
    // Distribute into tubes
    const initialTubes: string[][] = Array(totalTubes).fill([]).map(() => []);
    
    let liquidIndex = 0;
    for (let i = 0; i < numColors; i++) {
      for (let j = 0; j < TUBE_CAPACITY; j++) {
        initialTubes[i].push(allLiquids[liquidIndex++]);
      }
    }
    
    setTubes(initialTubes);
    setIsWon(false);
    setSelectedTube(null);
    setAnimatingPour(null);
  }, [level]);

  useEffect(() => {
    generateLevel();
  }, [generateLevel]);

  const checkWin = (currentTubes: string[][]) => {
    // All tubes must be either empty, or completely full with the same color
    const won = currentTubes.every(tube => 
      tube.length === 0 || 
      (tube.length === TUBE_CAPACITY && tube.every(color => color === tube[0]))
    );
    
    if (won && !isWon) {
      setIsWon(true);
      setTimeout(() => {
        onWin();
      }, 2000);
    }
  };

  const handleTubeClick = (index: number) => {
    if (isWon || animatingPour) return;

    if (selectedTube === null) {
      // Select a tube only if it has liquid
      if (tubes[index].length > 0) {
        setSelectedTube(index);
      }
    } else {
      if (selectedTube === index) {
        // Deselect
        setSelectedTube(null);
      } else {
        // Try to pour from selectedTube to index
        const sourceTube = tubes[selectedTube];
        const targetTube = tubes[index];

        if (sourceTube.length === 0) {
          setSelectedTube(null);
          return;
        }

        const topColor = sourceTube[sourceTube.length - 1];

        // Can we pour?
        // 1. Target is empty OR 
        // 2. Target has space AND top color matches
        if (targetTube.length < TUBE_CAPACITY && 
            (targetTube.length === 0 || targetTube[targetTube.length - 1] === topColor)) {
          
          // Calculate how much we can pour
          // Count contiguous units of the same color at the top of the source tube
          let unitsToPour = 0;
          for (let i = sourceTube.length - 1; i >= 0; i--) {
            if (sourceTube[i] === topColor) unitsToPour++;
            else break;
          }
          
          // Limit by available space in target
          const spaceAvailable = TUBE_CAPACITY - targetTube.length;
          const amount = Math.min(unitsToPour, spaceAvailable);

          // Animate pour
          setAnimatingPour({
            from: selectedTube,
            to: index,
            color: topColor,
            amount
          });

          // Perform logic update immediately but don't show the new liquid until animation ends
          // Actually, for a fluid feel, we should update the state after a slight delay
          setTimeout(() => {
            const newTubes = [...tubes];
            newTubes[selectedTube] = [...sourceTube.slice(0, sourceTube.length - amount)];
            newTubes[index] = [...targetTube, ...Array(amount).fill(topColor)];
            
            setTubes(newTubes);
            setSelectedTube(null);
            setAnimatingPour(null);
            checkWin(newTubes);
          }, 400);

        } else {
          // Invalid move, just select the new tube if it has liquid
          if (tubes[index].length > 0) {
            setSelectedTube(index);
          } else {
            setSelectedTube(null);
          }
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      
      {/* Background aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 to-black pointer-events-none opacity-80" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2 rounded-full font-bold shadow-lg">
          Level {level}
        </div>
        <button 
          onClick={generateLevel}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* Tubes Grid */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 max-w-2xl z-10 mt-12">
        <AnimatePresence>
          {tubes.map((tube, i) => (
            <motion.div 
              key={`tube-${i}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className="relative cursor-pointer group"
              onClick={() => handleTubeClick(i)}
            >
              {/* The Tube Glass */}
              <motion.div 
                animate={{
                  y: selectedTube === i ? -20 : 0,
                  rotate: (animatingPour?.from === i) ? 35 : 0,
                  scale: (animatingPour?.to === i) ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`
                  w-14 sm:w-16 h-48 sm:h-56 rounded-b-[30px] rounded-t-lg relative overflow-hidden
                  border-4 border-t-0 flex flex-col justify-end transition-colors duration-300
                  ${selectedTube === i ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-white/30 group-hover:border-white/50'}
                  bg-gradient-to-b from-white/5 to-white/10 backdrop-blur-sm
                `}
              >
                {/* Tube Lip */}
                <div className="absolute top-0 left-[-4px] right-[-4px] h-2 bg-white/40 rounded-full blur-[1px]" />
                <div className="absolute top-0 left-[-2px] right-[-2px] h-2 bg-white/60 rounded-full" />

                {/* Tube Glass Highlights */}
                <div className="absolute inset-y-2 left-2 w-1.5 bg-gradient-to-b from-white/40 to-transparent rounded-full opacity-50 z-20 pointer-events-none" />
                <div className="absolute inset-y-2 right-2 w-0.5 bg-gradient-to-b from-white/20 to-transparent rounded-full opacity-50 z-20 pointer-events-none" />

                {/* Liquid Layers */}
                <div className="w-full flex flex-col-reverse justify-start absolute bottom-0 left-0 right-0 z-10" style={{ height: '90%' }}>
                  {tube.map((color, j) => {
                    const isTopLayer = j === tube.length - 1;
                    const isBeingPoured = animatingPour?.from === i && j >= tube.length - animatingPour.amount;

                    return (
                      <motion.div
                        key={`liquid-${i}-${j}`}
                        layoutId={`liquid-${i}-${j}`}
                        className="w-full relative origin-bottom transition-all"
                        style={{ 
                          height: `${100 / TUBE_CAPACITY}%`,
                          backgroundColor: color,
                          opacity: isBeingPoured ? 0.3 : 1
                        }}
                      >
                        {/* Liquid surface highlight for top layer */}
                        {isTopLayer && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30 rounded-t-full mix-blend-screen" />
                        )}
                        {/* Sub-surface scattering effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
                      </motion.div>
                    );
                  })}

                  {/* Incoming Liquid Animation */}
                  <AnimatePresence>
                    {animatingPour?.to === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${(animatingPour.amount / TUBE_CAPACITY) * 100}%`, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="w-full relative origin-bottom"
                        style={{ backgroundColor: animatingPour.color }}
                      >
                         <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30 rounded-t-full mix-blend-screen" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Win Overlay */}
      <AnimatePresence>
        {isWon && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          >
            <div className="bg-gradient-to-br from-[#5AB8EA] to-[#7682B9] p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <Sparkles size={48} className="text-white animate-pulse" />
              <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">LEVEL CLEARED</h2>
              <p className="text-white/90 font-bold">Incredible logic!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
