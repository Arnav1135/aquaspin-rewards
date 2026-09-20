import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import { BetControl } from '@/components/ui/BetControl';
import { useAuthStore } from '@/features/authStore';
import { audio } from '@/lib/audioEngine';
import { secureRecordGameResult } from '@/lib/secureEconomy';

const HORSES = [
  { id: 1, name: "Crimson Lightning", color: "#EF4444", odds: 2.0, speedBase: 0.8 },
  { id: 2, name: "Sapphire Dream", color: "#3B82F6", odds: 3.5, speedBase: 0.7 },
  { id: 3, name: "Emerald Wind", color: "#10B981", odds: 5.0, speedBase: 0.65 },
  { id: 4, name: "Golden Shadow", color: "#F59E0B", odds: 8.0, speedBase: 0.6 },
  { id: 5, name: "Midnight Star", color: "#8B5CF6", odds: 12.0, speedBase: 0.55 }
];

const TRACK_LENGTH = 50;

function HorseMesh({ position, color, progress, rank }: { position: [number, number, number], color: string, progress: number, rank: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = -TRACK_LENGTH / 2 + progress * TRACK_LENGTH;
      if (progress < 1 && progress > 0) {
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(state.clock.elapsedTime * 15)) * 0.3;
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.7, 1.0, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text position={[0, 1.8, 0]} fontSize={0.4} color="white" outlineColor="black" outlineWidth={0.02}>
        {rank}
      </Text>
    </group>
  );
}

function RaceTrack({ progresses }: { progresses: number[] }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_LENGTH + 4, 15]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>
      
      {HORSES.map((_, i) => (
        <mesh key={`lane-${i}`} position={[0, 0.01, -4 + i * 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TRACK_LENGTH, 0.1]} />
          <meshBasicMaterial color="rgba(255,255,255,0.2)" transparent />
        </mesh>
      ))}

      <mesh position={[-TRACK_LENGTH / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh position={[TRACK_LENGTH / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {HORSES.map((h, i) => (
        <HorseMesh 
          key={h.id} 
          position={[-TRACK_LENGTH / 2, 0, -4 + i * 2]} 
          color={h.color} 
          progress={progresses[i]} 
          rank={h.id} 
        />
      ))}
    </group>
  );
}

export default function HorseRacing3DGame({ onClose }: { onClose?: () => void }) {
  const { profile } = useAuthStore();
  const [bet, setBet] = useState(10);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  
  const [gameState, setGameState] = useState<'BETTING' | 'RACING' | 'FINISHED'>('BETTING');
  const [progresses, setProgresses] = useState<number[]>(HORSES.map(() => 0));
  const [winnerId, setWinnerId] = useState<number | null>(null);
  
  useEffect(() => {
    if (gameState !== 'RACING') return;
    
    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setProgresses(prev => {
        let isFinished = false;
        const next = [...prev];
        let maxProgress = 0;
        let currentLeader = 0;

        for (let i = 0; i < HORSES.length; i++) {
          if (next[i] >= 1) {
            isFinished = true;
            if (next[i] > maxProgress) {
              maxProgress = next[i];
              currentLeader = HORSES[i].id;
            }
          }
          if (!isFinished) {
            const speed = HORSES[i].speedBase + Math.random() * 0.4;
            next[i] += speed * delta * 0.1; 
          }
        }

        if (isFinished) {
          setGameState('FINISHED');
          setWinnerId(currentLeader);
        }

        return next;
      });

      if (gameState === 'RACING') {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'FINISHED' && winnerId !== null && profile) {
      if (winnerId === selectedHorseId) {
        const horse = HORSES.find(h => h.id === winnerId);
        const multiplier = horse ? horse.odds : 0;
        const winAmount = Math.floor(bet * multiplier);
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: winAmount }) /* AUTOFIX: bet=0 to prevent double charge */;
        audio.play('horse', 'win');
      } else {
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: 0 }) /* AUTOFIX: bet=0 to prevent double charge */;
        audio.play('horse', 'lose');
      }
    }
  }, [gameState, winnerId, selectedHorseId, bet, profile]);

  const handleStart = () => {
    if (!selectedHorseId || bet <= 0) return;
    setGameState('RACING');
    setProgresses(HORSES.map(() => 0));
    setWinnerId(null);
    audio.play('horse', 'click');
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative bg-[#0f172a] overflow-hidden rounded-xl border border-gray-800">
      <div className="relative flex-1 min-h-[400px] lg:min-h-full">
        <Canvas shadows camera={{ position: [15, 10, 15], fov: 60 }}>
          <color attach="background" args={['#87CEEB']} />
          <ambientLight intensity={0.5} />
          <directionalLight 
            castShadow 
            position={[10, 20, 10]} 
            intensity={1.5} 
            shadow-mapSize={[1024, 1024]}
          />
          <Environment preset="park" />
          
          <RaceTrack progresses={progresses} />
          
          <OrbitControls 
            target={[0, 0, 0]} 
            maxPolarAngle={Math.PI / 2 - 0.1}
            minDistance={10}
            maxDistance={40}
          />
        </Canvas>
      </div>
      
      <div className="w-full lg:w-96 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">3D Horse Racing</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">
              ✕
            </button>
          )}
        </div>

        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 flex-1">
          <h3 className="font-bold text-lg mb-4 text-white">Select Horse</h3>
          <div className="flex flex-col gap-3">
            {HORSES.map(h => (
              <button
                key={h.id}
                disabled={gameState !== 'BETTING'}
                onClick={() => setSelectedHorseId(h.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  selectedHorseId === h.id 
                    ? 'border-yellow-400 bg-gray-700' 
                    : 'border-transparent bg-gray-800 hover:bg-gray-700/50'
                } ${gameState !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: h.color }} />
                  <span className="font-semibold text-white">{h.id}. {h.name}</span>
                </div>
                <span className="text-yellow-400 font-bold">{h.odds}x</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <BetControl 
            betAmount={bet} 
            setBetAmount={setBet} 
            disabled={gameState !== 'BETTING' || !selectedHorseId} 
          />
          
          <button
            onClick={handleStart}
            disabled={gameState !== 'BETTING' || !selectedHorseId}
            className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all ${
              gameState === 'BETTING' && selectedHorseId
                ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Place Bet & Race
          </button>
        </div>

        {gameState === 'FINISHED' && winnerId !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 p-8 rounded-2xl border-2 border-yellow-500 text-center max-w-md w-full shadow-2xl">
              <h2 className="text-4xl font-black mb-2 text-white">
                Horse #{winnerId} Wins!
              </h2>
              <div className="text-xl mb-8">
                {winnerId === selectedHorseId ? (
                  <span className="text-green-400 font-bold drop-shadow-md">You Won!</span>
                ) : (
                  <span className="text-red-400 font-bold drop-shadow-md">You Lost.</span>
                )}
              </div>
              <button
                onClick={() => {
                  setGameState('BETTING');
                  setSelectedHorseId(null);
                }}
                className="w-full bg-yellow-500 text-gray-900 font-bold py-4 rounded-lg hover:bg-yellow-400 text-xl"
              >
                Race Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
