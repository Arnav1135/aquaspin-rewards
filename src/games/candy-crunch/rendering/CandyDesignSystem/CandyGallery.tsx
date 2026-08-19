import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CandyAssetRegistry } from './CandyAssetRegistry';
import { CandyColor, CandyShape, SpecialType } from '../../types';
import { CandyIdentityRegistry } from './CandyIdentityRegistry';

const COLORS: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const SPECIALS: SpecialType[] = ['none', 'striped-h', 'striped-v', 'wrapped', 'color-bomb'];

const CandyPreview: React.FC<{ color: CandyColor, special: SpecialType, position: [number, number, number], animate: boolean }> = ({ color, special, position, animate }) => {
  const ref = useRef<THREE.Group>(null);
  const identity = CandyIdentityRegistry.getIdentityForColor(color);
  
  useFrame((state, delta) => {
    if (ref.current && animate) {
      const elapsedTime = state.clock.getElapsedTime();
      const profile = identity.animationProfile;
      const phaseOffset = position[0];
      
      if (profile.idleMotion === 'wobble') {
        ref.current.rotation.z = Math.sin(elapsedTime * 2.5 + phaseOffset) * 0.08;
        ref.current.rotation.x = Math.cos(elapsedTime * 2.0 + phaseOffset) * 0.04;
      } else if (profile.idleMotion === 'spin') {
        ref.current.rotation.y += delta * 0.5;
        ref.current.rotation.z = Math.sin(elapsedTime + phaseOffset) * 0.02;
      } else if (profile.idleMotion === 'breathe') {
        const scale = 1.0 + Math.sin(elapsedTime * 1.5 + phaseOffset) * 0.03;
        ref.current.scale.set(scale, 1.0 / scale, scale);
      } else if (profile.idleMotion === 'sparkle') {
        ref.current.rotation.y = Math.sin(elapsedTime * 4 + phaseOffset) * 0.05;
        ref.current.rotation.x = Math.cos(elapsedTime * 3 + phaseOffset) * 0.05;
      } else if (profile.idleMotion === 'light_sweep') {
        ref.current.rotation.y = Math.sin(elapsedTime * 1.0 + phaseOffset) * 0.15;
      }
    } else if (ref.current && !animate) {
      ref.current.rotation.set(0, 0, 0);
      ref.current.scale.set(1, 1, 1);
    }
  });

  const group = React.useMemo(() => {
    // Pass a dummy shape ('square') as shapeOverride is ignored in favor of identity
    return CandyAssetRegistry.createCandyGroup(color, 'square', special, false);
  }, [color, special]);

  return (
    <group position={position}>
      <primitive object={group} ref={ref} />
    </group>
  );
};

export const CandyGallery: React.FC = () => {
  const [colorA, setColorA] = useState<CandyColor>('red');
  const [colorB, setColorB] = useState<CandyColor>('blue');
  const [special, setSpecial] = useState<SpecialType>('none');
  const [animate, setAnimate] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', color: 'white' }}>
      <div style={{ padding: '20px', display: 'flex', gap: '20px', background: '#0f172a', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '18px', marginRight: '20px' }}>CandyGallery 2.0 (Comparison Mode)</h1>
        
        <label>Identity A:</label>
        <select value={colorA} onChange={e => setColorA(e.target.value as CandyColor)}>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <label>Identity B:</label>
        <select value={colorB} onChange={e => setColorB(e.target.value as CandyColor)}>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label>Special Type:</label>
        <select value={special} onChange={e => setSpecial(e.target.value as SpecialType)}>
          {SPECIALS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>
          <input type="checkbox" checked={animate} onChange={e => setAnimate(e.target.checked)} />
          Animate Identity Profiles
        </label>
      </div>
      
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 8]} intensity={1.5} castShadow />
          <pointLight position={[-4, -4, 5]} intensity={1.0} color={0xffd700} />
          
          <CandyPreview color={colorA} special={special} position={[-1, 0, 0]} animate={animate} />
          <CandyPreview color={colorB} special={special} position={[1, 0, 0]} animate={animate} />
        </Canvas>
      </div>
      
      <div style={{ display: 'flex', background: '#0f172a', padding: '10px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <strong>{colorA.toUpperCase()}</strong> - {CandyIdentityRegistry.getIdentityForColor(colorA)?.materialProfile} - {CandyIdentityRegistry.getIdentityForColor(colorA)?.shapeFamily}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <strong>{colorB.toUpperCase()}</strong> - {CandyIdentityRegistry.getIdentityForColor(colorB)?.materialProfile} - {CandyIdentityRegistry.getIdentityForColor(colorB)?.shapeFamily}
        </div>
      </div>
    </div>
  );
};
