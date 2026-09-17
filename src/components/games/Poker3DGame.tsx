import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { Card as CardType, PokerEngine } from '@/lib/pokerEngine';
import { Button } from '@/components/ui/Button';
import { EnvironmentManager, QualityManager, VFXManager, PostFXManager } from '@/engine/aaa';
import { OrbitControls, Text } from '@react-three/drei';

function CardMesh({ card, position, rotation }: { card: CardType, position: [number, number, number], rotation: [number, number, number] }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠';
  
  return (
    <RigidBody position={position} rotation={rotation} colliders="cuboid" type="dynamic" mass={0.1}>
      <group>
        {/* Card Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 2.1, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        
        {/* Card Front Details */}
        <group position={[0, 0, 0.015]}>
          <Text position={[-0.5, 0.7, 0]} fontSize={0.3} color={isRed ? '#ef4444' : '#111827'} anchorX="center" anchorY="middle">
            {card.rank}
          </Text>
          <Text position={[-0.5, 0.4, 0]} fontSize={0.2} color={isRed ? '#ef4444' : '#111827'} anchorX="center" anchorY="middle">
            {symbol}
          </Text>
          <Text position={[0, 0, 0]} fontSize={0.8} color={isRed ? '#ef4444' : '#111827'} anchorX="center" anchorY="middle">
            {symbol}
          </Text>
        </group>

        {/* Card Back Details */}
        <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
           <mesh>
             <planeGeometry args={[1.4, 2.0]} />
             <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
           </mesh>
        </group>
      </group>
    </RigidBody>
  );
}

export function Poker3DGame({ onClose }: { onClose: () => void }) {
  const [deck, setDeck] = useState<CardType[]>([]);
  const [communityCards, setCommunityCards] = useState<CardType[]>([]);
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [phase, setPhase] = useState<'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'>('PREFLOP');
  
  const startGame = () => {
    const newDeck = PokerEngine.shuffle(PokerEngine.createDeck());
    setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
    setCommunityCards([]);
    setDeck(newDeck);
    setPhase('PREFLOP');
  };

  const dealNext = () => {
    if (phase === 'PREFLOP') {
      const newComm = [deck.pop()!, deck.pop()!, deck.pop()!];
      setCommunityCards(newComm);
      setPhase('FLOP');
    } else if (phase === 'FLOP') {
      const newComm = [...communityCards, deck.pop()!];
      setCommunityCards(newComm);
      setPhase('TURN');
    } else if (phase === 'TURN') {
      const newComm = [...communityCards, deck.pop()!];
      setCommunityCards(newComm);
      setPhase('RIVER');
    } else if (phase === 'RIVER') {
      setPhase('SHOWDOWN');
    }
  };

  useEffect(() => {
    startGame();
  }, []);

  const handResult = phase === 'SHOWDOWN' ? PokerEngine.evaluateHand([...playerHand, ...communityCards]) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden shadow-2xl border border-navy-600 bg-navy-900 rounded-2xl">
        <div className="absolute top-4 right-4 z-50">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white bg-black/20">Close</Button>
        </div>

        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 8, 8], fov: 45 }}>
            <QualityManager>
              <EnvironmentManager initialTheme="CASINO">
                <VFXManager>
                  <PostFXManager />
                  <Physics>
                    {/* Poker Table */}
                    <RigidBody type="fixed" colliders="hull" friction={1}>
                      <mesh position={[0, -0.5, 0]} receiveShadow>
                        <cylinderGeometry args={[5, 5, 1, 32]} />
                        <meshStandardMaterial color="#064e3b" roughness={0.8} />
                      </mesh>
                      <mesh position={[0, 0.1, 0]}>
                        <ringGeometry args={[4.5, 5.2, 32]} />
                        <meshStandardMaterial color="#451a03" roughness={0.4} />
                      </mesh>
                    </RigidBody>

                    {/* Render Community Cards */}
                    {communityCards.map((c, i) => (
                      <CardMesh 
                        key={c.rank+c.suit} 
                        card={c} 
                        position={[-3 + i * 1.6, 2 + i * 0.5, -1]} 
                        rotation={[-Math.PI / 2, 0, 0]} 
                      />
                    ))}

                    {/* Render Player Hand */}
                    {playerHand.map((c, i) => (
                      <CardMesh 
                        key={c.rank+c.suit} 
                        card={c} 
                        position={[-1 + i * 2, 3, 3]} 
                        rotation={[-Math.PI / 2.5, 0, 0]} 
                      />
                    ))}

                  </Physics>
                </VFXManager>
              </EnvironmentManager>
            </QualityManager>
            <OrbitControls enablePan={false} enableZoom={true} minPolarAngle={0} maxPolarAngle={Math.PI / 2.5} />
          </Canvas>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
          {handResult && (
            <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold px-8 py-3 rounded-xl backdrop-blur-md text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {handResult.name}
            </div>
          )}
          
          <div className="flex gap-4">
            {phase !== 'SHOWDOWN' && (
              <Button variant="neon" size="lg" className="px-12 font-bold" onClick={dealNext}>
                {phase === 'PREFLOP' ? 'DEAL FLOP' : phase === 'FLOP' ? 'DEAL TURN' : 'DEAL RIVER'}
              </Button>
            )}
            {phase === 'SHOWDOWN' && (
              <Button variant="ghost" size="lg" className="bg-white/10 text-white px-12" onClick={startGame}>
                PLAY AGAIN
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
