import * as THREE from 'three';

export type FieldType = 'WIND' | 'VORTEX' | 'RADIAL_EXPLOSION' | 'ATTRACTOR';

export interface ParticleField {
  type: FieldType;
  position: THREE.Vector3;
  direction?: THREE.Vector3;
  strength: number;
  radius: number;
  active: boolean;
  decayRate: number; // For explosions
}

/* eslint-disable no-case-declarations */
export class ParticleFieldSystem {
  private fields: ParticleField[] = [];

  // Phase 22: Particle Field System
  public addField(field: ParticleField) {
    this.fields.push(field);
  }

  public getVelocityDelta(position: THREE.Vector3, delta: number): THREE.Vector3 {
    const totalDelta = new THREE.Vector3(0, 0, 0);

    for (let i = this.fields.length - 1; i >= 0; i--) {
      const field = this.fields[i];
      if (!field.active) continue;

      // Distance to field center
      const toPos = new THREE.Vector3().subVectors(position, field.position);
      const dist = toPos.length();

      if (dist < field.radius) {
        const influence = 1.0 - (dist / field.radius);
        const power = field.strength * influence * delta;

        switch (field.type) {
          case 'WIND':
            if (field.direction) {
              totalDelta.add(field.direction.clone().multiplyScalar(power));
            }
            break;
          case 'RADIAL_EXPLOSION':
          case 'ATTRACTOR':
            const dir = toPos.clone().normalize();
            if (field.type === 'ATTRACTOR') dir.negate();
            totalDelta.add(dir.multiplyScalar(power));
            break;
          case 'VORTEX':
            // Cross product with UP vector to create swirl
            const swirl = new THREE.Vector3().crossVectors(toPos, new THREE.Vector3(0, 1, 0)).normalize();
            totalDelta.add(swirl.multiplyScalar(power));
            break;
        }
      }

      // Decay explosion fields
      if (field.type === 'RADIAL_EXPLOSION') {
        field.strength -= field.decayRate * delta;
        if (field.strength <= 0) {
          field.active = false;
        }
      }
    }

    return totalDelta;
  }
}
