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
      <div className="absolute top-[44px] bottom-0 left-0 right-0 overflow-hidden bg-[#2b1a38] rounded-b-2xl">
        <iframe 
          src="/candy-crunch/index.html" 
          className="w-full h-full border-none outline-none block"
          title="Candy Crunch Game"
        />
      </div>
    </GameFrame>
  );
}
