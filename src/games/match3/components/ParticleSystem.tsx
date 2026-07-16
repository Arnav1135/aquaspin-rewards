// Particle System Component for Visual Effects
import React from 'react';
import { motion } from 'framer-motion';
import '@/games/match3/styles/ParticleSystem.css';

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ParticleSystemProps {
  particles: Particle[];
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles }) => {
  return (
    <div className="particle-system">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="particle"
          style={{
            background: particle.color,
            left: '50%',
            top: '50%',
            willChange: 'transform, opacity',
          }}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: particle.x * 40,
            y: particle.y * 40,
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

export default ParticleSystem;
