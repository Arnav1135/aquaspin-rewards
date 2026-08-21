import * as THREE from 'three';

export class VFXManager {
  private particlePool: THREE.InstancedMesh;

  constructor(...args: any[]) {
    this.particlePool = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.1, 0.1),
      new THREE.MeshBasicMaterial({ transparent: true }),
      10000 
    );
    if(args[0]) args[0].add(this.particlePool);
  }

  public spawnExplosion(...args: any[]) {}
  public spawnDust(...args: any[]) {}
  public spawnEnergyStreaks(...args: any[]) {}
  public spawnCinematicStarburst(...args: any[]) {}
  public spawnShockwave(...args: any[]) {}
  public update(...args: any[]) {}
  public dispose(...args: any[]) {}
}
