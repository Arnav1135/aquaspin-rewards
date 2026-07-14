// src/features/coinflip/engine/coinflip-engine.ts
import gsap from 'gsap';

export interface CoinAnimationOptions {
  coinElement: HTMLDivElement;
  specularElement: HTMLDivElement;
  particlesContainer: HTMLDivElement;
  result: 'heads' | 'tails';
  onComplete: () => void;
  reducedMotion?: boolean;
}

export function playCoinFlipAnimation({
  coinElement,
  specularElement,
  particlesContainer,
  result,
  onComplete,
  reducedMotion = false,
}: CoinAnimationOptions) {
  // Clear any existing timelines on these elements
  gsap.killTweensOf([coinElement, specularElement]);

  const targetRotateX = result === 'heads' ? 1440 : 1620; // 4 full spins vs 4.5 spins

  if (reducedMotion) {
    // Reduced motion path: simple fade and rapid direct flip
    const tl = gsap.timeline({ onComplete });
    tl.to(coinElement, {
      opacity: 0.3,
      scale: 0.95,
      duration: 0.2,
      ease: 'power1.inOut',
    })
      .to(coinElement, {
        rotateX: targetRotateX,
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
    return;
  }

  // Master timeline for physical motion
  const masterTimeline = gsap.timeline({
    onComplete: () => {
      triggerDustPuff(particlesContainer, result === 'heads' ? '#f59e0b' : '#94a3b8');
      onComplete();
    },
  });

  // Reset initial values
  gsap.set(coinElement, { rotateX: 0, rotateY: 0, y: 0, scale: 1 });
  gsap.set(specularElement, { backgroundPosition: '-200% 0%' });

  // 1. Anticipation: Sinking down before the flip
  masterTimeline.to(coinElement, {
    y: 15,
    scale: 0.95,
    duration: 0.15,
    ease: 'power1.inOut',
  });

  // 2. Launch: Rising high & spinning
  masterTimeline.to(coinElement, {
    y: -220,
    scale: 1.45,
    rotateX: targetRotateX,
    rotateY: 25, // Slight wobble in Y for 3D tumbling feeling
    duration: 0.7,
    ease: 'power2.out',
  });

  // Specular sheen sweep in sync with the launch
  masterTimeline.to(specularElement, {
    backgroundPosition: '200% 0%',
    duration: 0.7,
    ease: 'none',
  }, '<'); // Start at the same time as launch

  // 3. Fall: Falling back to ground
  masterTimeline.to(coinElement, {
    y: 0,
    scale: 1,
    rotateY: 0, // Straighten Y rotation
    duration: 0.4,
    ease: 'power2.in',
  });

  // Specular sheen return on fall
  masterTimeline.to(specularElement, {
    backgroundPosition: '-200% 0%',
    duration: 0.4,
    ease: 'power1.in',
  }, '<');

  // 4. Settle / Impact: Landing bounce & squash
  masterTimeline.to(coinElement, {
    scaleY: 0.8,
    scaleX: 1.2,
    y: 0,
    duration: 0.08,
    ease: 'power1.out',
  });

  // Settle back up with micro-correction
  masterTimeline.to(coinElement, {
    scaleY: 1.05,
    scaleX: 0.95,
    y: -8,
    duration: 0.1,
    ease: 'power2.out',
  });

  // Final settle to resting state
  masterTimeline.to(coinElement, {
    scaleY: 1,
    scaleX: 1,
    y: 0,
    duration: 0.12,
    ease: 'bounce.out',
  });
}

function triggerDustPuff(container: HTMLDivElement, color: string) {
  if (!container) return;
  container.innerHTML = ''; // Clear previous particles

  const numParticles = 16;
  const particleElements: HTMLDivElement[] = [];

  for (let i = 0; i < numParticles; i++) {
    const p = document.createElement('div');
    p.className = 'absolute rounded-full pointer-events-none opacity-100';
    p.style.width = `${gsap.utils.random(4, 8)}px`;
    p.style.height = `${gsap.utils.random(4, 8)}px`;
    p.style.backgroundColor = color;
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.transform = 'translate(-50%, -50%)';
    p.style.filter = 'blur(0.5px) drop-shadow(0 0 2px rgba(255,255,255,0.4))';
    container.appendChild(p);
    particleElements.push(p);
  }

  // Animate dust particles shooting outward
  particleElements.forEach((p) => {
    const angle = gsap.utils.random(0, Math.PI * 2);
    const radius = gsap.utils.random(60, 110);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    gsap.to(p, {
      x,
      y,
      opacity: 0,
      scale: 0.2,
      duration: gsap.utils.random(0.4, 0.75),
      ease: 'power2.out',
      onComplete: () => p.remove(),
    });
  });
}
