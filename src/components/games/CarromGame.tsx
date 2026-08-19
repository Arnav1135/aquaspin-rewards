import React from 'react';
import { CarromGame3D } from '../../games/carrom/components/CarromGame3D';

interface Props { onClose: () => void }

export function CarromGame({ onClose }: Props) {
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-lg"
        >
          Exit Game
        </button>
      </div>
      
      <div className="flex-1 w-full h-full">
        <CarromGame3D />
      </div>
    </div>
  );
}
