import React, { useEffect, useState } from 'react';

export interface GameLifecycle {
  onClose: () => void;
}

interface GameShellProps extends GameLifecycle {
  children: React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({ children, onClose }) => {
  const [viewportHeight, setViewportHeight] = useState('100dvh');

  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    
    updateHeight();
    
    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    
    observer.observe(document.body);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div 
      className="game-shell-root"
      style={{ 
        width: '100%', 
        height: viewportHeight, 
        overflow: 'hidden', 
        position: 'relative',
        zIndex: 1 // Stacking context root
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 999999, // Extremely high z-index to stay above everything
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(4px)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
        className="game-shell-exit-btn hover:bg-red-500 transition-colors"
      >
        Exit Game
      </button>

      <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
};
