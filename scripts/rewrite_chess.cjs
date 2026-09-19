const fs = require('fs');
const path = require('path');

const scenePath = path.join(__dirname, '../src/components/games/Chess3D/chess/scene.ts');
let content = fs.readFileSync(scenePath, 'utf-8');

// Replace capture animation to include disintegrate
content = content.replace(
  /const capPos = algebraToWorld\(capturedSquare\);\s*this\.triggerCaptureParticles\(capPos, capturedPieceData\.color\);/g,
  `const capPos = algebraToWorld(capturedSquare);
          this.triggerCaptureParticles(capPos, capturedPieceData.color);
          this.triggerShockwave(capPos);
          this.triggerDisintegrate(capturedMesh);`
);

if (!content.includes('triggerShockwave')) {
  content = content.replace(
    /private triggerCaptureParticles\(pos: THREE.Vector3, color: PieceColor\) \{/,
    `private triggerShockwave(pos: THREE.Vector3) {
      const geometry = new THREE.TorusGeometry(0.1, 0.05, 16, 100);
      const material = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1.0 });
      const torus = new THREE.Mesh(geometry, material);
      torus.position.copy(pos);
      torus.position.y = 0.2;
      torus.rotation.x = Math.PI / 2;
      this.scene.add(torus);
      gsap.to(torus.scale, { x: 30, y: 30, z: 30, duration: 0.8, ease: 'power2.out' });
      gsap.to(material, { opacity: 0, duration: 0.8, ease: 'power2.in', onComplete: () => {
        this.scene.remove(torus);
        geometry.dispose();
        material.dispose();
      }});
    }

    private triggerDisintegrate(mesh: THREE.Mesh) {
      gsap.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'back.in(2)' });
      gsap.to(mesh.rotation, { y: mesh.rotation.y + Math.PI * 4, duration: 0.5 });
      gsap.to(mesh.position, { y: mesh.position.y + 2, duration: 0.5 });
    }

    private triggerCaptureParticles(pos: THREE.Vector3, color: PieceColor) {`
  );
}

// Replace move animation
content = content.replace(
  /gsap\.to\(pieceMesh\.position, \{\s*x: targetWorldPos\.x,\s*z: targetWorldPos\.z,\s*duration: [^}]+\}\);/g,
  `gsap.to(pieceMesh.position, {
          x: targetWorldPos.x,
          z: targetWorldPos.z,
          duration: 0.6,
          ease: 'back.out(1.5)',
        });
        
        gsap.to(pieceMesh.position, {
          y: 2.0,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        });
        
        gsap.to(pieceMesh.rotation, {
          x: 0.2,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
        });`
);

fs.writeFileSync(scenePath, content);
console.log('scene.ts updated with VFX and Physics');
