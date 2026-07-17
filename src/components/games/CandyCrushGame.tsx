import { GameFrame } from './GameFrame';

interface CandyCrushGameProps {
  onBack: () => void;
  balance: number;
}

export default function CandyCrushGame({ onBack }: CandyCrushGameProps) {
  return (
    <GameFrame
      title="Candy Crush Saga Clone"
      onClose={onBack}
    >
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#2b1a38] rounded-2xl">
        <iframe 
          src="/candy-crunch/index.html" 
          className="w-full h-full border-none outline-none"
          title="Candy Crunch Game"
          style={{ width: '100%', height: '100%', minHeight: '600px' }}
        />
      </div>
    </GameFrame>
  );
}
