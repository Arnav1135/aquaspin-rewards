import React, { Suspense } from 'react';
import { useProgress, Html } from '@react-three/drei';

interface ProgressiveLoadingManagerProps {
  children: React.ReactNode;
}

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', fontFamily: 'sans-serif', fontSize: '24px' }}>
        {progress.toFixed(0)} % loaded
      </div>
    </Html>
  );
};

export const ProgressiveLoadingManager: React.FC<ProgressiveLoadingManagerProps> = ({ children }) => {
  return (
    <Suspense fallback={<Loader />}>
      {children}
    </Suspense>
  );
};
