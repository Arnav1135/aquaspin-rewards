import RAPIER from '@dimforge/rapier3d-compat';

// Shared state format
export interface PhysicsState {
    position: [number, number, number];
    velocity: [number, number, number];
    acceleration: [number, number, number];
    thrustVector: [number, number, number];
    dragForce: number;
    gravityForce: number;
    multiplier: number;
    angularVel: [number, number, number];
    turbulence: [number, number, number];
    burnTime: number;
}

let world: RAPIER.World;
let rocketBody: RAPIER.RigidBody;
let isInitialized = false;

// Physics parameters
const EFFECTIVE_GRAVITY = -3.2; // Anti-gravity partial reduction
const DRAG_COEFFICIENT = 0.005;

let currentMultiplier = 1.0;
let burnTime = 0;

async function init() {
    await RAPIER.init();
    
    // Create world with 0 gravity initially since we apply custom forces
    world = new RAPIER.World({ x: 0.0, y: 0.0, z: 0.0 });
    
    // Create rocket rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0.0, 0.0, 0.0)
        .setLinearDamping(0) // We calculate custom drag
        .setAngularDamping(0);
        
    rocketBody = world.createRigidBody(bodyDesc);
    
    // Minimal collider just for mass/inertia if needed, though we primarily drive it with forces
    const colliderDesc = RAPIER.ColliderDesc.capsule(1.0, 0.2);
    world.createCollider(colliderDesc, rocketBody);

    isInitialized = true;
    self.postMessage({ type: 'INIT_COMPLETE' });
}

function physicsTick(dt: number) {
    if (!isInitialized) return;

    burnTime += dt;
    
    // Get current state
    const vel = rocketBody.linvel();
    const pos = rocketBody.translation();
    
    // 1. Compute thrust vector (gravity turn)
    // Starts at ~75 degrees, rotates to ~45 degrees based on speed/multiplier
    const angleX = Math.max(45, 75 - (currentMultiplier * 5)) * (Math.PI / 180);
    const thrustMagnitude = currentMultiplier * 5; // simplified thrust coefficient
    
    const thrustVector = {
        x: Math.cos(angleX) * thrustMagnitude,
        y: Math.sin(angleX) * thrustMagnitude,
        z: 0 
    };

    // 2. Anti-gravity
    const gravityForce = { x: 0, y: EFFECTIVE_GRAVITY, z: 0 };

    // 3. Drag
    const velMagSq = (vel.x * vel.x) + (vel.y * vel.y) + (vel.z * vel.z);
    const velMag = Math.sqrt(velMagSq);
    const dragMag = DRAG_COEFFICIENT * velMagSq;
    
    let dragForce = { x: 0, y: 0, z: 0 };
    if (velMag > 0.001) {
        dragForce = {
            x: -(vel.x / velMag) * dragMag,
            y: -(vel.y / velMag) * dragMag,
            z: -(vel.z / velMag) * dragMag
        };
    }

    // 4. Turbulence (Z-Drift)
    // Z-Drift oscillates and decays slightly, but here we just apply a force
    const zOscillation = Math.sin(burnTime * 2.0) * 0.5 * (1 + currentMultiplier * 0.1);
    const turbulence = { x: 0, y: 0, z: zOscillation };

    // Apply all forces to body
    rocketBody.resetForces(true);
    rocketBody.addForce(thrustVector, true);
    rocketBody.addForce(gravityForce, true);
    rocketBody.addForce(dragForce, true);
    rocketBody.addForce(turbulence, true);

    // Step world
    world.timestep = dt;
    world.step();

    // Prepare state for main thread
    const newState = {
        position: [pos.x, pos.y, pos.z],
        velocity: [vel.x, vel.y, vel.z],
        acceleration: [
            thrustVector.x + gravityForce.x + dragForce.x + turbulence.x,
            thrustVector.y + gravityForce.y + dragForce.y + turbulence.y,
            thrustVector.z + gravityForce.z + dragForce.z + turbulence.z
        ],
        thrustVector: [thrustVector.x, thrustVector.y, thrustVector.z],
        dragForce: dragMag,
        gravityForce: Math.abs(EFFECTIVE_GRAVITY),
        multiplier: currentMultiplier,
        angularVel: [0, 0, 0], // compute from velocity in rendering layer
        turbulence: [turbulence.x, turbulence.y, turbulence.z],
        burnTime: burnTime
    };

    self.postMessage({ type: 'STATE_UPDATE', state: newState });
}

self.onmessage = (e) => {
    if (e.data.type === 'INIT') {
        init();
    } else if (e.data.type === 'SET_MULTIPLIER') {
        currentMultiplier = e.data.multiplier;
    } else if (e.data.type === 'TICK') {
        physicsTick(e.data.dt);
    }
};
