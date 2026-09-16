import React, { Suspense, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  OrbitControls, 
  Environment, 
  Text, 
  Float, 
  MeshTransmissionMaterial,
  Html
} from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Gamepad2, Store, Users, Map as MapIcon, Crown, Shield } from "lucide-react";
import * as THREE from "three";
import { audio } from "@/lib/audioEngine";

function Building({ 
  position, 
  color, 
  label, 
  icon: Icon, 
  route,
  scale = 1
}: { 
  position: [number, number, number], 
  color: string, 
  label: string, 
  icon: any, 
  route: string,
  scale?: number
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + (hovered ? Math.sin(state.clock.elapsedTime * 4) * 0.2 : 0);
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      } else {
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, 0.1);
      }
    }
  });

  const handleClick = () => {
    audio.playClick();
    audio.play("win", "coin"); // Satisfying building click
    navigate(route);
  };

  return (
    <group position={position} scale={scale}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh 
          ref={meshRef}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; audio.playClick(); }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
          onClick={handleClick}
        >
          <boxGeometry args={[2, 3, 2]} />
          <meshStandardMaterial 
            color={hovered ? "#ffffff" : color} 
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.2}
            roughness={0.2}
            metalness={0.8}
          />
          
          {hovered && (
            <Html position={[0, 2.5, 0]} center className="pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.5 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-black/80 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl flex items-center gap-2 text-white font-black whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Icon size={16} className="text-emerald-400" />
                {label}
              </motion.div>
            </Html>
          )}
        </mesh>

        {/* Building Base/Platform */}
        <mesh position={[0, -1.6, 0]}>
          <cylinderGeometry args={[1.8, 2, 0.2, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      </Float>
    </group>
  );
}

function Island() {
  return (
    <group>
      {/* Ocean */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#091428" roughness={0.1} metalness={0.8} />
      </mesh>
      
      {/* Main Island */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[12, 14, 2, 32]} />
        <meshStandardMaterial color="#0c1b33" roughness={0.8} />
      </mesh>
      
      {/* Grid Floor */}
      <gridHelper args={[24, 24, "#66bdf2", "#1a365d"]} position={[0, -0.49, 0]} />
    </group>
  );
}

export function CasinoMap() {
  return (
    <div className="w-full h-screen bg-[#050b14] relative overflow-hidden flex flex-col">
      <div className="absolute top-24 left-8 z-10 pointer-events-none">
        <h1 className="text-4xl font-black text-white flex items-center gap-3 drop-shadow-[0_0_20px_rgba(102,189,242,0.5)]">
          <MapIcon className="text-[#66bdf2]" size={40} />
          AquaSpin Resort
        </h1>
        <p className="text-white/60 font-medium mt-2 max-w-sm">
          Welcome to the immersive 3D Island. Click on any sector to travel instantly.
        </p>
      </div>

      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 15, 20], fov: 45 }}>
          <color attach="background" args={['#050b14']} />
          <fog attach="fog" args={['#050b14', 20, 50]} />
          
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <pointLight position={[-10, 10, -10]} color="#66bdf2" intensity={2} />
          <pointLight position={[10, 5, 10]} color="#f59e0b" intensity={1} />
          
          <Suspense fallback={null}>
            <Environment preset="city" />
            
            <Island />

            {/* Buildings */}
            <Building 
              position={[0, 1.5, 0]} 
              color="#3b82f6" 
              label="Main Casino" 
              icon={Gamepad2} 
              route="/games"
              scale={1.5}
            />
            <Building 
              position={[-6, 1.5, -4]} 
              color="#eab308" 
              label="The Shop" 
              icon={Store} 
              route="/shop" 
            />
            <Building 
              position={[6, 1.5, -4]} 
              color="#ef4444" 
              label="PvP Arena" 
              icon={Users} 
              route="/multiplayer" 
            />
            <Building 
              position={[-5, 1.5, 5]} 
              color="#a855f7" 
              label="VIP Lounge" 
              icon={Crown} 
              route="/vip" 
            />
            <Building 
              position={[5, 1.5, 5]} 
              color="#10b981" 
              label="God Mode Admin" 
              icon={Shield} 
              route="/admin" 
            />

            <OrbitControls 
              enablePan={false} 
              minPolarAngle={Math.PI / 6} 
              maxPolarAngle={Math.PI / 2.2}
              minDistance={10}
              maxDistance={35}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
