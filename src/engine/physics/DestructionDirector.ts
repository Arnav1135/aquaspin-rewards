import * as THREE from 'three';
import { MaterialKind } from './MaterialReactionEngine';
import { DebrisSimulationSystem } from './DebrisSimulationSystem';

export class DestructionDirector {
  private debrisSim: DebrisSimulationSystem;

  constructor(debrisSim: DebrisSimulationSystem) {
    this.debrisSim = debrisSim;
  }

  // Phase 18 & 19: Progressive Damage & Fracture Geometry Spawning
  public shatterObject(mesh: THREE.Mesh, material: MaterialKind, impactStrength: number) {
    mesh.visible = false; // Hide original
    
    // Determine fragment count based on impact and material
    let fragmentCount = 10;
    if (material === 'GLASS' || material === 'ICE') fragmentCount = 30;
    if (material === 'STONE') fragmentCount = 15;
    
    fragmentCount = Math.floor(fragmentCount * impactStrength);
    
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    this.debrisSim.spawnDebris(worldPos, fragmentCount, material);
  }
}
