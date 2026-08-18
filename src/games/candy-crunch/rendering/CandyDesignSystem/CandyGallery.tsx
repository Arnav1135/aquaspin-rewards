import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CandyAssetRegistry } from './CandyAssetRegistry';
import { CandyColor, CandyShape, SpecialType } from '../../types';

const COLORS: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const SHAPES: CandyShape[] = ['fish', 'jelly-bean', 'lozenge', 'teardrop', 'square', 'circle', 'cluster'];
const SPECIALS: SpecialType[] = ['none', 'striped-h', 'striped-v', 'wrapped', 'color-bomb'];

const CandyPreview: React.FC<{ color: CandyColor, shape: CandyShape, special: SpecialType }> = ({ color, shape, special }) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta;
    }
  });

  const group = React.useMemo(() => {
    return CandyAssetRegistry.createCandyGroup(color, shape, special, false);
  }, [color, shape, special]);

  return <primitive object={group} ref={ref} />;
};

export const CandyGallery: React.FC = () => {
  const [color, setColor] = useState<CandyColor>('red');
  const [shape, setShape] = useState<CandyShape>('square');
  const [special, setSpecial] = useState<SpecialType>('none');

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', color: 'white' }}>
      <div style={{ padding: '20px', display: 'flex', gap: '20px', background: '#0f172a' }}>
        <select value={color} onChange={e => setColor(e.target.value as CandyColor)}>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={shape} onChange={e => setShape(e.target.value as CandyShape)}>
          {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={special} onChange={e => setSpecial(e.target.value as SpecialType)}>
          {SPECIALS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[5, 10, 8]} intensity={1.5} castShadow />
          <pointLight position={[-4, -4, 5]} intensity={1.0} color={0xffd700} />
          <CandyPreview color={color} shape={shape} special={special} />
        </Canvas>
      </div>
    </div>
  );
};
