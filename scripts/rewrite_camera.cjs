const fs = require('fs');
const path = require('path');

const camPath = path.join(__dirname, '../src/components/games/Chess3D/chess/cameraController.ts');
let content = fs.readFileSync(camPath, 'utf-8');

// Enhance Intro Sweep
content = content.replace(
  /public playIntroSweep\(\) \{[\s\S]*?\n  \}/,
  `public playIntroSweep() {
    this.killActiveTweens();
    
    // Start zoomed out and high up
    this.camera.position.set(20, 15, 20);
    this.camera.lookAt(0, 0, 0);
    
    // Sweep in with cinematic bezier-like motion
    this.activeTween = gsap.to(this.camera.position, {
      x: 0,
      y: 9.5,
      z: 10.5,
      duration: 2.5,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.updateResponsiveFraming();
      }
    });
  }`
);

// Add Checkmate Sequence
if (!content.includes('playCheckmateSequence')) {
  content = content.replace(
    /public updateAntiOcclusion\(/,
    `public playCheckmateSequence(winningColor: PieceColor, kingPos: THREE.Vector3) {
      this.killActiveTweens();
      
      const angle = winningColor === 'w' ? Math.PI / 4 : -Math.PI / 4;
      const dist = 5.0;
      
      // Dramatic slow motion zoom into the defeated king
      this.activeTween = gsap.to(this.camera.position, {
        x: kingPos.x + Math.cos(angle) * dist,
        y: kingPos.y + 3.0,
        z: kingPos.z + Math.sin(angle) * dist,
        duration: 3.0,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.camera.lookAt(kingPos);
          this.controls.target.copy(kingPos);
          this.controls.update();
        }
      });
    }

    public updateAntiOcclusion(`
  );
}

fs.writeFileSync(camPath, content);
console.log('cameraController updated for Checkmate / Cinematic Sweep');
