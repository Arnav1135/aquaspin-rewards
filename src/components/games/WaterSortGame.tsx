import { useState } from 'react';
import { GameFrame } from './GameFrame';
import WaterSort3D from './water-sort/WaterSort3D';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

  const handleWin = () => {
    setScore(s => s + 100);
    setLevel(l => l + 1);
  };

  const handleRestart = () => {
    // A trick to force re-render the same level
    setLevel(l => l); 
  };

  return (
    <GameFrame 
      title="Water Sort 3D" 
      onClose={onClose}
      level={level}
      score={score}
      onRestart={handleRestart}
      canvasClassName="bg-[#050510]"
    >
      <div className="w-full h-full relative">
        <WaterSort3D level={level} onWin={handleWin} />
      </div>
    </GameFrame>
  );
}
