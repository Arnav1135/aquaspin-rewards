import React, { useEffect, useState } from 'react';
import { useCarromStore } from '../state/CarromState';
import { triggerVFX } from './CarromVFXSystem';

export function VictoryCinematic() {
  const turnState = useCarromStore(state => state.turnState);
  const setCameraProfile = useCarromStore(state => state.setCameraProfile);
  const setColorGradingProfile = useCarromStore(state => state.setColorGradingProfile);
  const [showUI, setShowUI] = useState(false);

  useEffect(() => {
    if (turnState === 'GAME_OVER') {
      setCameraProfile('VICTORY');
      setColorGradingProfile('WARM_WOOD');
      
      // Trigger victory VFX (gold particle shower)
      const vfxInterval = setInterval(() => {
        triggerVFX({
          type: 'victory',
          position: [0, 0, 0],
          intensity: 10
        });
      }, 500);

      const uiTimeout = setTimeout(() => {
        setShowUI(true);
      }, 1000);

      return () => {
        clearInterval(vfxInterval);
        clearTimeout(uiTimeout);
      };
    } else {
      setShowUI(false);
    }
  }, [turnState, setCameraProfile, setColorGradingProfile]);

  if (turnState !== 'GAME_OVER' || !showUI) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.7) 100%)'
    }}>
      <h1 style={{
        color: '#FFD700',
        fontFamily: 'sans-serif',
        fontSize: '4rem',
        textShadow: '0 0 20px #FFD700',
        animation: 'victory-anim 2s ease-out forwards',
        opacity: 0,
        transform: 'scale(0.5)'
      }}>
        VICTORY
      </h1>
      <style>
        {`
          @keyframes victory-anim {
            0% { opacity: 0; transform: scale(0.5) translateY(50px); }
            50% { opacity: 1; transform: scale(1.2) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
