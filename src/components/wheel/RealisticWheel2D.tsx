// src/components/wheel/RealisticWheel2D.tsx
// Hyper-Realistic 2D Luxury Casino Spin Wheel with physical lighting, glass reflections, and spring physics clicker

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SEGMENTS, WheelThemeName, WHEEL_THEMES } from '@/features/gameStore';
import { audio } from '@/lib/audioEngine';
import { vibrate } from '@/lib/utils';

interface RealisticWheel2DProps {
  rotationAngle: number; // in radians
  isSpinning: boolean;
  themeName: WheelThemeName;
  onCenterClick?: () => void;
  canSpin?: boolean;
}

export function RealisticWheel2D({
  rotationAngle,
  isSpinning,
  themeName,
  onCenterClick,
  canSpin = true,
}: RealisticWheel2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevAngleRef = useRef<number>(rotationAngle);
  const [pointerDeflection, setPointerDeflection] = useState(0);
  const [activeLedIndex, setActiveLedIndex] = useState(0);
  const theme = WHEEL_THEMES[themeName];

  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = (2 * Math.PI) / segmentCount;
  const pegCount = segmentCount * 2; // 24 pegs for ultra-detailed clicks
  const pegAngle = (2 * Math.PI) / pegCount;

  // Track pointer deflection and sound on peg collisions
  useEffect(() => {
    const prev = prevAngleRef.current;
    const curr = rotationAngle;
    const diff = Math.abs(curr - prev);

    if (diff > 0.0001) {
      // Calculate how many pegs were crossed
      const prevPegIndex = Math.floor((prev % (2 * Math.PI)) / pegAngle);
      const currPegIndex = Math.floor((curr % (2 * Math.PI)) / pegAngle);

      if (prevPegIndex !== currPegIndex) {
        // Pointer deflects in spin direction
        const speed = Math.min(diff * 180, 24);
        setPointerDeflection(speed);

        // Sound & haptics
        if (isSpinning) {
          const clickFreq = 750 + Math.random() * 150;
          audio.playClick(clickFreq, 0.02, 'triangle');
          vibrate(8);
        }

        setTimeout(() => {
          setPointerDeflection(0);
        }, 50);
      }

      // LED chase effect
      setActiveLedIndex(Math.floor((curr * 3) % 24));
    }

    prevAngleRef.current = curr;
  }, [rotationAngle, isSpinning, pegAngle]);

  // Render high-res crisp wheel face on offscreen/HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 900;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 24;

    // ── 1. Outer Dark Rim Bed ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    const rimGrad = ctx.createRadialGradient(cx, cy, radius - 10, cx, cy, radius + 20);
    rimGrad.addColorStop(0, '#0a101d');
    rimGrad.addColorStop(0.7, '#141f36');
    rimGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();

    // ── 2. Render 12 Precision Segments ──
    WHEEL_SEGMENTS.forEach((seg, i) => {
      // Segments are centered such that segment 0 is centered at top when angle = 0
      const start = i * segmentAngle - Math.PI / 2 - segmentAngle / 2;
      const end = start + segmentAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();

      // Deep Metallic/Lacquer Wedge Gradient
      const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, radius);

      if (seg.isJackpot) {
        // High-Luminance Gold Jackpot Wedge
        grad.addColorStop(0, '#FFF6B7');
        grad.addColorStop(0.2, '#F6D365');
        grad.addColorStop(0.6, '#FDA085');
        grad.addColorStop(0.9, '#F46B45');
        grad.addColorStop(1, '#B83B18');
      } else {
        const isAlternate = i % 2 === 0;
        if (themeName === 'gold') {
          grad.addColorStop(0, isAlternate ? '#1f1604' : '#2b1f07');
          grad.addColorStop(0.5, isAlternate ? '#2f2105' : '#3d2b09');
          grad.addColorStop(1, isAlternate ? '#4a350b' : '#573f0e');
        } else if (themeName === 'neon') {
          grad.addColorStop(0, isAlternate ? '#180728' : '#200a35');
          grad.addColorStop(0.5, isAlternate ? '#280c44' : '#321054');
          grad.addColorStop(1, isAlternate ? '#3c1066' : '#4a157d');
        } else if (themeName === 'fire') {
          grad.addColorStop(0, isAlternate ? '#200705' : '#2a0c08');
          grad.addColorStop(0.5, isAlternate ? '#36100a' : '#42140d');
          grad.addColorStop(1, isAlternate ? '#4f170e' : '#5f1d12');
        } else {
          // Aqua Blue (Default luxury theme)
          grad.addColorStop(0, isAlternate ? '#040d1a' : '#08172c');
          grad.addColorStop(0.5, isAlternate ? '#0a1d37' : '#0f274a');
          grad.addColorStop(1, isAlternate ? '#122c54' : '#173666');
        }
      }

      ctx.fillStyle = grad;
      ctx.fill();

      // Wedge Inner Bevel / Border Line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.lineWidth = seg.isJackpot ? 4 : 2;
      ctx.strokeStyle = seg.isJackpot ? 'rgba(255, 223, 0, 0.9)' : 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // Subtle radial ray shine along center of wedge
      const midAngle = start + segmentAngle / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(midAngle) * radius, cy + Math.sin(midAngle) * radius);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      // ── Typography & Prize Value ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);
      ctx.translate(radius * 0.65, 0);

      // Rotate text so it reads outward from center
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (seg.isJackpot) {
        // JACKPOT Text with Golden Glow
        ctx.shadowColor = '#FFE57F';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 36px "Inter", sans-serif';
        ctx.fillText('JACKPOT', 0, -20);

        ctx.font = '900 42px "Orbitron", sans-serif';
        ctx.fillStyle = '#FFF8D6';
        ctx.fillText('500', 0, 24);

        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = '#FFE082';
        ctx.fillText('TOKENS', 0, 52);
      } else {
        const parts = seg.label.split(' ');
        const tokenVal = parts[0] || '10';

        // Prize number with drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 40px "Inter", sans-serif';
        ctx.fillText(tokenVal, 0, -14);

        // Prize unit label
        ctx.font = 'bold 18px "Inter", sans-serif';
        ctx.shadowBlur = 4;
        ctx.fillStyle = seg.glowColor;
        ctx.fillText(parts[1] || 'Tokens', 0, 24);
      }

      ctx.restore();
      ctx.restore();
    });

    // ── 3. Inner Concentric Grooves on Wheel Face ──
    [radius * 0.45, radius * 0.88, radius].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 2 ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = idx === 2 ? 3 : 1.5;
      ctx.stroke();
    });

    // ── 4. Golden Pegs / Studs on Wheel Rim ──
    for (let p = 0; p < pegCount; p++) {
      const angle = p * pegAngle;
      const px = cx + Math.cos(angle) * (radius - 8);
      const py = cy + Math.sin(angle) * (radius - 8);

      // Peg Drop Shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py + 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Brass/Chrome Peg Body
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      const pegGrad = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 6);
      pegGrad.addColorStop(0, '#FFFFFF');
      pegGrad.addColorStop(0.3, '#FFE082');
      pegGrad.addColorStop(0.7, '#D4AF37');
      pegGrad.addColorStop(1, '#8C6D1F');
      ctx.fillStyle = pegGrad;
      ctx.fill();

      // Specular Glint on Top of Peg
      ctx.beginPath();
      ctx.arc(px - 1.5, py - 1.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    }
  }, [themeName, segmentAngle, pegCount, pegAngle]);

  return (
    <div className="relative w-full max-w-[460px] md:max-w-[500px] aspect-square mx-auto flex items-center justify-center select-none">
      
      {/* ── Ambient Radial Halo Glow ── */}
      <div
        className="absolute inset-[-12%] rounded-full blur-[60px] opacity-40 transition-colors duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${theme.borderColor} 0%, transparent 70%)`,
        }}
      />

      {/* ── Heavy Luxury Outer Bezel (Machined Gold & Titanium) ── */}
      <div
        className="relative w-full h-full rounded-full p-[18px] sm:p-[22px] flex items-center justify-center"
        style={{
          background:
            'conic-gradient(from 45deg, #1f2b42, #475a80, #141f33, #38486b, #1f2b42, #475a80, #141f33, #38486b, #1f2b42)',
          boxShadow: `
            0 24px 60px rgba(0, 0, 0, 0.8),
            0 0 0 2px rgba(255, 255, 255, 0.15),
            inset 0 4px 8px rgba(255, 255, 255, 0.25),
            inset 0 -6px 12px rgba(0, 0, 0, 0.7)
          `,
        }}
      >
        {/* ── Outer Golden Trim Inset Ring ── */}
        <div
          className="absolute inset-[6px] sm:inset-[8px] rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(255, 215, 0, 0.5)',
            boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.2), 0 0 8px rgba(255, 215, 0, 0.3)',
          }}
        />

        {/* ── Running LED Perimeter Track ── */}
        <div className="absolute inset-[10px] sm:inset-[12px] rounded-full pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => {
            const angleDeg = (i * 360) / 24;
            const isActive = isSpinning
              ? (i + activeLedIndex) % 4 === 0
              : i % 2 === 0;

            return (
              <div
                key={i}
                className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
                style={{
                  top: `${50 - 48.5 * Math.cos((angleDeg * Math.PI) / 180)}%`,
                  left: `${50 + 48.5 * Math.sin((angleDeg * Math.PI) / 180)}%`,
                  backgroundColor: isActive ? theme.borderColor : '#18243b',
                  boxShadow: isActive
                    ? `0 0 8px ${theme.borderColor}, 0 0 14px ${theme.borderColor}`
                    : 'none',
                }}
              />
            );
          })}
        </div>

        {/* ── The Rotating Canvas Wheel Container ── */}
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_10px_25px_rgba(0,0,0,0.85)]">
          <canvas
            ref={canvasRef}
            className="w-full h-full block rounded-full will-change-transform"
            style={{
              transform: `rotate(${rotationAngle}rad)`,
              transformOrigin: '50% 50%',
              transition: isSpinning ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          />

          {/* ── Realistic Convex Glass Dome Specular Reflection Overlay ── */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 60% at 35% 25%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 35%, transparent 65%)',
              mixBlendMode: 'screen',
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: 'inset 0 16px 30px rgba(255, 255, 255, 0.15), inset 0 -20px 40px rgba(0, 0, 0, 0.8)',
            }}
          />
        </div>

        {/* ── Luxury Central Spindle / Center Hub ── */}
        <div
          onClick={canSpin && !isSpinning ? onCenterClick : undefined}
          className={`absolute z-30 rounded-full w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center transition-transform duration-200 ${
            canSpin && !isSpinning ? 'cursor-pointer active:scale-95 hover:scale-105' : 'cursor-default'
          }`}
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #ffffff 0%, #e2e8f0 20%, #94a3b8 50%, #334155 85%, #0f172a 100%)',
            boxShadow: `
              0 12px 30px rgba(0, 0, 0, 0.85),
              0 0 0 3px rgba(255, 215, 0, 0.6),
              inset 0 3px 6px rgba(255, 255, 255, 0.8),
              inset 0 -4px 8px rgba(0, 0, 0, 0.6)
            `,
          }}
        >
          {/* Inner Turret Gem Bezel */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center"
            style={{
              background: `radial-gradient(circle at 40% 35%, ${theme.borderColor} 0%, ${theme.centerColor} 65%, #020712 100%)`,
              border: '2px solid rgba(255, 215, 0, 0.8)',
              boxShadow: `inset 0 2px 6px rgba(255, 255, 255, 0.4), 0 0 15px ${theme.borderColor}55`,
            }}
          >
            <span
              className="font-black text-xs sm:text-sm tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              style={{ fontFamily: '"Orbitron", sans-serif' }}
            >
              SPIN
            </span>
            <div
              className="w-2 h-2 rounded-full mt-1 animate-pulse"
              style={{
                backgroundColor: theme.borderColor,
                boxShadow: `0 0 8px ${theme.borderColor}`,
              }}
            />
          </div>
        </div>

        {/* ── Precision Spring-Loaded Pointer / Clicker (12 o'clock) ── */}
        <div
          className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none origin-top will-change-transform"
          style={{
            transform: `translateX(-50%) rotate(${pointerDeflection}deg)`,
            transition: 'transform 0.04s cubic-bezier(0.2, 0.8, 0.3, 1.2)',
          }}
        >
          {/* Golden Pin Head */}
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full z-10 flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #FFF8D6 0%, #FFD700 40%, #B8860B 80%, #5E4304 100%)',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
              border: '1.5px solid #FFE082',
            }}
          >
            {/* Center Ruby Accent */}
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #FF8A80 0%, #D50000 70%, #680000 100%)',
                boxShadow: '0 0 6px rgba(213, 0, 0, 0.8)',
              }}
            />
          </div>

          {/* Golden Arrow Tip pointing down */}
          <div
            className="-mt-3 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[34px] sm:border-t-[38px] drop-shadow-[0_6px_8px_rgba(0,0,0,0.8)]"
            style={{
              borderTopColor: '#FFD700',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.85))',
            }}
          />
        </div>

      </div>
    </div>
  );
}
