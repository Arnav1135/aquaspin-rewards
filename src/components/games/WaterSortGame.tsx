import { GameFrame } from './GameFrame';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  return (
    <GameFrame 
      title="Water Sort" 
      onClose={onClose}
    >
      <div className="flex-1 w-full h-full bg-[#1a1a2e] rounded-xl overflow-hidden relative flex items-center justify-center">
        <iframe 
          src="/mini-games/water-sort-game-editor/index.html" 
          className="w-full h-full border-none"
          title="Water Sort"
        />
      </div>
    </GameFrame>
  );
}
