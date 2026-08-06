import { GameFrame } from './GameFrame';

interface Props { onClose: () => void }

export function Game2048({ onClose }: Props) {
  return (
    <GameFrame 
      title="2048" 
      onClose={onClose}
    >
      <div className="flex-1 w-full h-full bg-[#faf8ef] rounded-xl overflow-hidden relative">
        <iframe 
          src="/mini%20games/2048/index.html" 
          className="w-full h-full border-none"
          title="2048"
        />
      </div>
    </GameFrame>
  );
}
