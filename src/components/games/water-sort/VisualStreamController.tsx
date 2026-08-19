import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { liquidVisualEngine } from '../../../engine/rendering/shaders/LiquidVisualEngine';
import { WaterSortLiquidProfile } from './WaterSortLiquidProfile';

interface VisualStreamProps {
  active: boolean;
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  color: string;
}

export function VisualStreamController({ active, sourcePos, targetPos, color }: VisualStreamProps) {
  const lineRef = useRef<THREE.Line>(null);
  const dropletsRef = useRef<THREE.InstancedMesh>(null);
  
  const profile = useMemo(() => WaterSortLiquidProfile.getProfileForColor(color), [color]);
  const material = useMemo(() => liquidVisualEngine.getLiquidMaterial(profile), [profile]);

  // Generate curve for stream
  const curve = useMemo(() => {
    // Basic parabola from source to target
    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = Math.max(sourcePos.y, targetPos.y) + 0.5; // Arcing up slightly before falling
    const midZ = (sourcePos.z + targetPos.z) / 2;

    return new THREE.QuadraticBezierCurve3(
      sourcePos,
      new THREE.Vector3(midX, midY, midZ),
      targetPos
    );
  }, [sourcePos, targetPos]);

  const points = useMemo(() => curve.getPoints(20), [curve]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  // Droplet data for stream breakup
  const maxDroplets = 50;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dropletData = useRef(Array(maxDroplets).fill(0).map(() => ({
    progress: Math.random(),
    speed: 1.5 + Math.random(),
    baseScale: 0.1 + Math.random() * 0.1,
    offset: new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2),
    mergedScale: 0,
    merged: false,
    currentPos: new THREE.Vector3()
  })));

  // Phase 9: Splash Crown Physics
  const splashDropletsRef = useRef<THREE.InstancedMesh>(null);
  const maxSplash = 30;
  const splashData = useRef(Array(maxSplash).fill(0).map(() => ({
    active: false,
    life: 0,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    scale: 0
  })));

  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color, linewidth: 5, transparent: true, opacity: 0.8 }), [color]);

  const lineObj = useMemo(() => new THREE.Line(geometry, lineMat), [geometry, lineMat]);

  // Phase 6 & 7: Pour Start/End Transitions
  const pourState = useRef({ progress: 0 });

  useFrame((state, delta) => {
    // Lerp pour state
    const targetProgress = active ? 1.0 : 0.0;
    pourState.current.progress = THREE.MathUtils.lerp(pourState.current.progress, targetProgress, delta * 5);

    if (pourState.current.progress < 0.01 && !active) {
      if (lineRef.current) lineRef.current.visible = false;
      if (dropletsRef.current) dropletsRef.current.visible = false;
      if (splashDropletsRef.current) splashDropletsRef.current.visible = false;
      return;
    }

    if (lineRef.current) {
      lineRef.current.visible = true;
      // Adjust opacity and thickness based on pour progress
      (lineMat as THREE.LineBasicMaterial).opacity = 0.8 * pourState.current.progress;
    }

    if (dropletsRef.current) {
      dropletsRef.current.visible = true;
      
      let spawnSplash = false;

      // Phase 7 & 8: Stream Breakup and Movement
      dropletData.current.forEach((drop) => {
        drop.progress += drop.speed * delta;
        
        // Wrap droplets
        if (drop.progress > 1) {
          drop.progress = active ? 0 : 2;
          drop.merged = false; // Unmerge on reset
          drop.mergedScale = 0;
          if (active) spawnSplash = true; 
        }

        // Calculate positions for active droplets
        if (!drop.merged && drop.progress <= 1 && drop.progress <= pourState.current.progress * 1.5) {
          const point = curve.getPoint(drop.progress);
          const spread = drop.progress * 0.5;
          drop.currentPos.copy(point).add(new THREE.Vector3(
            drop.offset.x * spread,
            drop.offset.y * spread,
            drop.offset.z * spread
          ));
        }
      });

      // Phase 8: True Spatial Droplet Merging (Collision Detection)
      for (let i = 0; i < maxDroplets; i++) {
        const dropA = dropletData.current[i];
        if (dropA.merged || dropA.progress > 1 || dropA.progress === 0) continue;

        for (let j = i + 1; j < maxDroplets; j++) {
          const dropB = dropletData.current[j];
          if (dropB.merged || dropB.progress > 1 || dropB.progress === 0) continue;

          const distSq = dropA.currentPos.distanceToSquared(dropB.currentPos);
          const mergeThreshold = (dropA.baseScale + dropB.baseScale) * 0.6; // spatial threshold
          
          if (distSq < mergeThreshold * mergeThreshold) {
            // Absorb droplet B into droplet A
            dropB.merged = true;
            // Mass combination (volume scales cubically, radius scales by cuberoot, but simplified to visual pop here)
            dropA.mergedScale += (dropB.baseScale + dropB.mergedScale) * 0.8;
          }
        }
      }

      // Render Final Droplet Matrices
      dropletData.current.forEach((drop, i) => {
        if (!drop.merged && drop.progress <= 1 && drop.progress <= pourState.current.progress * 1.5) {
          const totalScale = drop.baseScale + drop.mergedScale;
          const scale = totalScale * (1 - drop.progress * 0.5) * pourState.current.progress;
          dummy.position.copy(drop.currentPos);
          dummy.scale.set(scale, scale, scale);
        } else {
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        dropletsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      dropletsRef.current.instanceMatrix.needsUpdate = true;

      // Phase 9: Splash Crown Update
      if (splashDropletsRef.current) {
        splashDropletsRef.current.visible = true;
        
        // Spawn new splashes
        if (spawnSplash && pourState.current.progress > 0.8) {
          for (let i = 0; i < 3; i++) {
            const inactive = splashData.current.find(s => !s.active);
            if (inactive) {
              inactive.active = true;
              inactive.life = 1.0;
              inactive.pos.copy(targetPos);
              // Radial outward velocity + upward arc
              const angle = Math.random() * Math.PI * 2;
              const radius = 0.5 + Math.random() * 0.5;
              inactive.vel.set(Math.cos(angle) * radius, 1.5 + Math.random(), Math.sin(angle) * radius);
              inactive.scale = 0.05 + Math.random() * 0.05;
            }
          }
        }

        // Update active splashes
        splashData.current.forEach((splash, i) => {
          if (splash.active) {
            splash.life -= delta * 2; // Die in 0.5s
            if (splash.life <= 0) {
              splash.active = false;
              dummy.scale.set(0, 0, 0);
            } else {
              // Apply gravity
              splash.vel.y -= 9.8 * delta;
              splash.pos.addScaledVector(splash.vel, delta);
              
              dummy.position.copy(splash.pos);
              const s = splash.scale * splash.life * pourState.current.progress;
              dummy.scale.set(s, s, s);
            }
            dummy.updateMatrix();
            splashDropletsRef.current!.setMatrixAt(i, dummy.matrix);
          }
        });
        splashDropletsRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Core Stream */}
      <primitive object={lineObj} ref={lineRef} />
      
      {/* Phase 7 & 8: Stream Breakup */}
      <instancedMesh ref={dropletsRef} args={[new THREE.SphereGeometry(1, 8, 8), material, maxDroplets]} />
      
      {/* Phase 9: Splash Crown */}
      <instancedMesh ref={splashDropletsRef} args={[new THREE.SphereGeometry(1, 8, 8), material, maxSplash]} />
    </group>
  );
}
