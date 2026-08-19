import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpring, a } from '@react-spring/three';
import { Sparkles } from '@react-three/drei';
import { TUBE_CAPACITY, TUBE_RADIUS, TUBE_HEIGHT, LIQUID_HEIGHT, COLORS } from './constants';
import { liquidVisualEngine } from '../../../engine/rendering/shaders/LiquidVisualEngine';
import { WaterSortLiquidProfile } from './WaterSortLiquidProfile';
import type { TubeData, TubeMetadata } from './WaterSortRulesEngine';

function useCondensationTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Background: High roughness / base bump level
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);
    
    // Helper to draw a droplet with a radial gradient for a spherical bump
    const drawDroplet = (x: number, y: number, r: number, alpha: number) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); // Center peak
      grad.addColorStop(1, `rgba(10, 10, 10, ${alpha * 0.1})`); // Edge blend
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // Micro droplets
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.5 + 0.2;
      drawDroplet(x, y, r, alpha);
    }
    
    // Large droplets & condensation streaks (gravity drips)
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = Math.random() * 80 + 30;
      const width = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.8 + 0.4;
      
      // The streak path
      const grad = ctx.createLinearGradient(x, y, x, y + length);
      grad.addColorStop(0, `rgba(30, 30, 30, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(200, 200, 200, ${alpha})`);
      ctx.fillStyle = grad;
      
      // Slight wobble to streak
      ctx.beginPath();
      ctx.moveTo(x - width/2, y);
      ctx.bezierCurveTo(x - width, y + length/2, x + width, y + length/2, x - width/2, y + length);
      ctx.lineTo(x + width/2, y + length);
      ctx.bezierCurveTo(x + width*2, y + length/2, x, y + length/2, x + width/2, y);
      ctx.fill();

      // Pooling droplet at the bottom of the streak
      drawDroplet(x, y + length, width * 1.8, alpha);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4); // Stretch slightly vertically to map to tube
    tex.anisotropy = 16;
    return tex;
  }, []);
}

import { LiquidSurfaceSolver } from '../../../engine/physics/LiquidSurfaceSolver';

function LiquidSegment({ color, position, height, isTopLayer, tubeRotZSpring, isFrozenSegment }: { color: string, position: [number, number, number], height: number, isTopLayer?: boolean, tubeRotZSpring?: any, isFrozenSegment?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const solver = useRef(new LiquidSurfaceSolver());
  const lastRotZ = useRef<number>(0);

  const profile = useMemo(() => WaterSortLiquidProfile.getProfileForColor(color), [color]);
  const material = useMemo(() => {
    return liquidVisualEngine.getLiquidMaterial(profile).clone();
  }, [profile]);
  
  const { scaleY, posY } = useSpring({
    scaleY: height,
    posY: position[1],
    config: { mass: 1, tension: 200, friction: 20 }
  });

  useFrame((state, delta) => {
    if (meshRef.current && (material as any).userData?.shader) {
      const uniforms = (material as any).userData.shader.uniforms;
      
      const currentRotZ = tubeRotZSpring ? tubeRotZSpring.get() : 0;
      const angularVelocity = delta > 0 ? (currentRotZ - lastRotZ.current) / delta : 0;
      lastRotZ.current = currentRotZ;

      // Step the solver
      const solverOutput = solver.current.step({
        rotationZ: currentRotZ,
        angularVelocity: angularVelocity,
        fillPercentage: height / TUBE_HEIGHT,
        viscosity: profile.viscosity,
        gravity: 9.8,
        deltaTime: Math.min(delta, 0.05)
      });

      if (uniforms) {
        uniforms.uIsTopLayer.value = isTopLayer ? 1.0 : 0.0;
        uniforms.uHeight.value = height;
        uniforms.uIsFrozen.value = isFrozenSegment ? 1.0 : 0.0;
        
        // Pass solver outputs to shader
        uniforms.uSloshX.value = solverOutput.surfaceTilt * 0.5; // Scale tilt to match shader expectations
        uniforms.uSloshZ.value = 0.0;
        
        if (uniforms.uTime) {
          uniforms.uTime.value = state.clock.elapsedTime;
          uniforms.uWaveAmplitude.value = solverOutput.waveAmplitude * 0.1; 
        }
      }
    }
  });

  return (
    <a.mesh ref={meshRef} position-y={posY} position-x={position[0]} position-z={position[2]} scale-y={scaleY} castShadow>
      <cylinderGeometry args={[TUBE_RADIUS - 0.02, TUBE_RADIUS - 0.02, 1, 32, 16]} />
      <primitive object={material} attach="material" />
    </a.mesh>
  );
}

function LiquidBubbles({ segments, isActive }: { segments: {height: number}[], isActive: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const count = 20;
  const bubbles = useRef(Array(count).fill(0).map(() => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 2, (Math.random() - 0.5) * 0.6),
    speed: 0.5 + Math.random() * 1.5,
    wobbleSpeed: 2 + Math.random() * 3,
    wobbleOffset: Math.random() * Math.PI * 2,
    scale: 0.02 + Math.random() * 0.03,
    active: Math.random() > 0.5
  })));

  useFrame((state, delta) => {
    if (!meshRef.current || segments.length === 0) return;
    
    const totalHeight = segments.reduce((acc, seg) => acc + seg.height, 0);
    if (totalHeight === 0) return;

    bubbles.current.forEach((b, i) => {
      if (b.active || isActive) {
        b.active = true;
        b.pos.y += b.speed * delta;
        b.pos.x += Math.sin(state.clock.elapsedTime * b.wobbleSpeed + b.wobbleOffset) * 0.01;
        
        if (b.pos.y > totalHeight) {
          b.pos.y = 0;
          b.pos.x = (Math.random() - 0.5) * 0.6;
          b.pos.z = (Math.random() - 0.5) * 0.6;
          if (!isActive) b.active = false;
        }

        if (b.active) {
          dummy.position.copy(b.pos);
          dummy.scale.set(b.scale, b.scale, b.scale);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshPhysicalMaterial 
        transmission={0.9} 
        roughness={0} 
        ior={1.1}
        thickness={0.1}
        color="#ffffff"
      />
    </instancedMesh>
  );
}

export function Tube({
  index,
  data,
  isSelected,
  isPouring,
  onClick,
  positionX,
  positionZ,
  isHinted,
  isValidTarget,
  isInvalidShake,
  metadata
}: {
  index: number;
  data: TubeData;
  isSelected: boolean;
  isPouring: boolean;
  onClick: () => void;
  positionX: number;
  positionZ: number;
  isHinted?: boolean;
  isValidTarget?: boolean;
  isInvalidShake?: boolean;
  metadata?: TubeMetadata;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current && !isPouring && !isSelected) {
      groupRef.current.position.y = (isSelected ? 1.5 : 0) + Math.sin(clock.elapsedTime * 2 + index) * 0.05;
    }
  });

  const { pos, rot, slosh, glow, scale } = useSpring({
    pos: [positionX, isSelected ? 1.5 : 0, positionZ] as [number, number, number],
    rot: [0, 0, isPouring ? -Math.PI / 2.5 : (isInvalidShake ? Math.PI / 12 : 0)] as [number, number, number],
    slosh: isSelected ? 1 : (isPouring ? -1 : (isInvalidShake ? 1.5 : 0)),
    glow: isSelected ? 1.0 : (isValidTarget ? 0.4 : 0),
    scale: isSelected ? 1.05 : 1, 
    config: { mass: 1, tension: isInvalidShake ? 300 : 170, friction: isInvalidShake ? 5 : 14 }
  });

  const isLocked = metadata?.isLocked || false;
  const frozenLayers = metadata?.frozenLayers || 0;
  const isFrozen = frozenLayers > 0;
  
  const segments: { colorId: number; height: number; startY: number; isFrozenSegment?: boolean }[] = [];
  if (data.length > 0) {
    let currentColor = data[0];
    let currentCount = 1;
    for (let i = 1; i <= data.length; i++) {
      if (i < data.length && data[i] === currentColor) {
        currentCount++;
      } else {
        const startY = segments.reduce((sum, s) => sum + s.height, 0);
        segments.push({ colorId: currentColor, height: currentCount * LIQUID_HEIGHT, startY });
        if (i < data.length) {
          currentColor = data[i];
          currentCount = 1;
        }
      }
    }
    
    // Flag the top layer as frozen if necessary
    if (isFrozen && segments.length > 0) {
      segments[segments.length - 1].isFrozenSegment = true;
    }
  }

  const envIntensity = glow.to((g: number) => 2.0 + g * 1.5);
  const rimIntensity = glow.to((g: number) => 2.5 + g * 2.0);

  const condensationMap = useCondensationTexture();

  return (
    <a.group ref={groupRef} position={pos as any} rotation={rot as any} scale={scale as any} onClick={(e: any) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, TUBE_HEIGHT / 2 - 0.2, 0]}>
        <tubeGeometry args={[
          new THREE.LineCurve3(new THREE.Vector3(0, -TUBE_HEIGHT/2, 0), new THREE.Vector3(0, TUBE_HEIGHT/2, 0)),
          1, TUBE_RADIUS, 32, false
        ]} />
        <a.meshPhysicalMaterial 
          transmission={1.0} 
          thickness={0.2} 
          roughness={isLocked ? 0.6 : 0.05} 
          ior={1.52} 
          color={isLocked ? '#888888' : '#ffffff'}
          clearcoat={1.0}
          clearcoatRoughness={0.0} 
          transparent
          side={THREE.DoubleSide}
          envMapIntensity={envIntensity as any}
          roughnessMap={condensationMap as any}
          bumpMap={condensationMap as any}
          bumpScale={0.005}
        />
      </mesh>
      
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.4, 32]} />
        <a.meshPhysicalMaterial 
          transmission={1.0} 
          thickness={0.5} 
          roughness={0.05} 
          ior={1.52}
          clearcoat={1.0}
          envMapIntensity={envIntensity as any}
        />
      </mesh>
      
      <mesh position={[0, TUBE_HEIGHT - 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_RADIUS, 0.04, 16, 64]} />
        <a.meshPhysicalMaterial 
          transmission={1.0}
          thickness={0.1}
          ior={1.52}
          roughness={0.02}
          clearcoat={1.0}
          envMapIntensity={rimIntensity as any}
          emissive={"#ffffff"}
          emissiveIntensity={glow.to((g: number) => g * 0.2) as any}
        />
      </mesh>

      {segments.map((seg, i) => (
        <LiquidSegment 
          key={i} 
          color={COLORS[seg.colorId % COLORS.length]} 
          position={[0, seg.startY + seg.height / 2, 0]} 
          height={seg.height} 
          isTopLayer={i === segments.length - 1}
          tubeRotZSpring={rot.to((x, y, z) => z)}
          isFrozenSegment={seg.isFrozenSegment}
        />
      ))}
      
      {/* Portal Visualizer */}
      {metadata?.portalTarget !== null && metadata?.portalTarget !== undefined && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[TUBE_RADIUS * 1.2, TUBE_RADIUS * 1.6, 32]} />
          <meshBasicMaterial color="#ff00ff" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Locked Visualizer */}
      {isLocked && (
        <mesh position={[0, TUBE_HEIGHT / 2, TUBE_RADIUS + 0.1]}>
          <boxGeometry args={[0.6, 0.8, 0.2]} />
          <meshStandardMaterial color="#ffaa00" metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {segments.length > 0 && (
        <LiquidBubbles segments={segments} isActive={isPouring || isSelected} />
      )}
      
      {isHinted && (
        <Sparkles count={30} scale={2} size={3} speed={2} color="#ffffff" opacity={1} position-y={TUBE_HEIGHT/2} />
      )}
    </a.group>
  );
}
