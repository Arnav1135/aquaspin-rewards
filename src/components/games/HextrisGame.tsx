import { GameFrame } from './GameFrame';

interface Props { onClose: () => void }

export function HextrisGame({ onClose }: Props) {
  return (
    <GameFrame 
      title="Hextris" 
      onClose={onClose}
    >
      <div className="flex-1 w-full h-full bg-black rounded-xl overflow-hidden relative">
        <iframe 
          src="/mini-games/hextris/index.html" 
          className="w-full h-full border-none"
          title="Hextris"
        />
      </div>
    </GameFrame>
  );
}
