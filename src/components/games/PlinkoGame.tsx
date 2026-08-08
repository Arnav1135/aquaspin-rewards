import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';

export default function PlinkoGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile, updateProfile } = useAuthStore();
  const balance = profile?.tokens ?? 0;
  
  const [gameState, setGameState] = useState<'betting' | 'dropping' | 'result'>('betting');
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<{ multiplier: number, winnings: number } | null>(null);

  // Store active animation frame to cancel it properly
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // Read actual dimensions
    const width = container.clientWidth || window.innerWidth;
    const height = 520; // Match the arcade card height

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);

    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(0, 3, 3);
    scene.add(light);

    // Background gradient
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#0066cc');
      gradient.addColorStop(1, '#ff6600');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const bgGeometry = new THREE.PlaneGeometry(10, 10);
    const bgMaterial = new THREE.MeshBasicMaterial({ map: texture });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.z = -2;
    scene.add(background);

    // Pegs
    const pegRadius = 0.1;
    const pegCount = 25;
    for (let i = 0; i < pegCount; i++) {
      const pegGeometry = new THREE.SphereGeometry(pegRadius, 32, 32);
      const pegMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2,
      });
      const peg = new THREE.Mesh(pegGeometry, pegMaterial);
      peg.position.set(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        0
      );
      scene.add(peg);
    }

    // Ball
    const ballGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 2, 0);
    scene.add(ball);

    // Animation
    const ballVelocity = new THREE.Vector3(0, -0.02, 0);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // Ball physics
      ballVelocity.y -= 0.001;
      ball.position.add(ballVelocity);

      // Bounce off edges
      if (Math.abs(ball.position.x) > 2) ballVelocity.x *= -0.8;
      if (ball.position.y < -2.5) ballVelocity.y = 0;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const startGame = async () => {
    if (balance < bet) return;
    
    // Deduct bet immediately
    const intermediateBalance = balance - bet;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch (err) {
        console.error(err);
      }
    }
    (updateProfile as any)({ tokens: intermediateBalance });

    setGameState('dropping');
    setTimeout(() => {
      const multiplier = Math.random() * 3 + 0.5;
      const winnings = Math.floor(bet * multiplier);
      setResult({ multiplier, winnings });
      setGameState('result');
    }, 3000);
  };

  const playAgain = async () => {
    if (result && result.winnings > 0) {
      const newBalance = balance + result.winnings;
      if (profile && !profile.id.startsWith('guest')) {
        try {
          await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);
        } catch (err) {
          console.error(err);
        }
      }
      (updateProfile as any)({ tokens: newBalance });
    }
    setGameState('betting');
    setResult(null);
  };

  return (
    <Card className="relative overflow-hidden bg-[#0a0e27] text-white">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-[520px]" />
      
      {/* Overlay UI Layer */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        
        {gameState === 'betting' && (
          <div className="bg-black/90 border-2 border-yellow-500/80 rounded-xl p-8 text-center backdrop-blur-md min-w-[300px] pointer-events-auto">
            <h2 className="text-yellow-400 text-4xl mb-5 font-bold">PLINKO</h2>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Enter bet"
              min="1"
              className="px-3 py-3 border-2 border-yellow-500 rounded-lg bg-yellow-500/10 text-white text-lg w-[150px] mb-4 text-center outline-none"
            />
            <br />
            <button 
              onClick={startGame} 
              disabled={balance < bet}
              className="px-8 py-3 bg-gradient-to-br from-yellow-400 to-yellow-200 text-black border-none rounded-lg font-bold text-lg cursor-pointer transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,215,0,0.5)]"
            >
              DROP BALL
            </button>
          </div>
        )}

        {gameState === 'dropping' && (
          <div className="bg-black/90 border-2 border-yellow-500/80 rounded-xl p-8 text-center backdrop-blur-md min-w-[300px]">
            <h2 className="text-yellow-400 text-3xl font-bold animate-pulse">Dropping...</h2>
          </div>
        )}

        {gameState === 'result' && result && (
          <div className="bg-black/90 border-2 border-yellow-500/80 rounded-xl p-8 text-center backdrop-blur-md min-w-[300px] pointer-events-auto">
            <h2 className="text-yellow-400 text-3xl mb-4 font-bold">Result: {result.multiplier.toFixed(2)}x</h2>
            <p className="text-green-400 text-xl font-bold my-4">Winnings: ${result.winnings}</p>
            <button 
              onClick={playAgain}
              className="px-8 py-3 bg-gradient-to-br from-yellow-400 to-yellow-200 text-black border-none rounded-lg font-bold text-lg cursor-pointer transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
