import { GameFrame } from './GameFrame';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  return (
    <GameFrame 
      title="Water Sort" 
      onClose={onClose}
    >
      <div className="flex-1 w-full h-full bg-[#1a1a2e] rounded-xl overflow-hidden relative flex items-center justify-center">
        {/* We use the github pages URL as a fallback since the cocos project isn't built locally */}
        <iframe 
          src="https://oanhere33-maker.github.io/water-sort-game-editor/" 
          className="w-full h-full border-none"
          title="Water Sort"
        />
      </div>
    </GameFrame>
  );
}
