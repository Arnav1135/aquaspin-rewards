import RAPIER from '@dimforge/rapier3d-compat';

// Define message types
export type PhysicsCommand = 
    | { type: 'INIT' }
    | { type: 'THROW_KNIFE', id: string, startY: number }
    | { type: 'SET_LOG_SPEED', speed: number };

export type PhysicsEvent = 
    | { type: 'READY' }
    | { type: 'STATE_UPDATE', logRotation: any, knives: { id: string, pos: any, rot: any, embedded: boolean }[] }
    | { type: 'KNIFE_HIT_LOG', id: string }
    | { type: 'KNIFE_HIT_KNIFE', id: string, hitId: string };

let world: RAPIER.World;
let logBody: RAPIER.RigidBody;
let knives: Map<string, { body: RAPIER.RigidBody, embedded: boolean }> = new Map();

// Game constants
const LOG_RADIUS = 1.25;
let currentLogSpeed = 1.5;

async function initPhysics() {
    await RAPIER.init();
    world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

    // Create log (kinematic so we can control rotation but it affects others)
    const logDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.5, 0);
    logBody = world.createRigidBody(logDesc);
    const logColliderDesc = RAPIER.ColliderDesc.cylinder(1.4, LOG_RADIUS);
    world.createCollider(logColliderDesc, logBody);

    // Physics Loop 120Hz
    setInterval(() => {
        // Rotate log
        const currentRot = logBody.rotation();
        const nextRot = new RAPIER.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
        // Simplified rotation around Y axis
        const dt = 1 / 120;
        const angle = currentLogSpeed * dt;
        const qY = RAPIER.Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
        logBody.setNextKinematicRotation(logBody.rotation()); // In a full implementation, multiply quaternions here

        world.step();

        // Check naive collisions since this is a simple physics implementation for Phase 2
        const stateKnives = [];
        for (const [id, knife] of knives.entries()) {
            const pos = knife.body.translation();
            const rot = knife.body.rotation();
            
            if (!knife.embedded) {
                // If tip reaches log radius
                if (pos.y > 1.5 - LOG_RADIUS) {
                    knife.embedded = true;
                    knife.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
                    knife.body.setTranslation({ x: pos.x, y: 1.5 - LOG_RADIUS + 0.4, z: pos.z }, true);
                    postMessage({ type: 'KNIFE_HIT_LOG', id } as PhysicsEvent);
                }
            }

            stateKnives.push({ id, pos, rot, embedded: knife.embedded });
        }

        postMessage({
            type: 'STATE_UPDATE',
            logRotation: logBody.rotation(),
            knives: stateKnives
        } as PhysicsEvent);

    }, 1000 / 120);

    postMessage({ type: 'READY' } as PhysicsEvent);
}

onmessage = (e: MessageEvent<PhysicsCommand>) => {
    const cmd = e.data;
    if (cmd.type === 'INIT') {
        initPhysics();
    } else if (cmd.type === 'THROW_KNIFE') {
        if (!world) return;
        const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, cmd.startY, 0).setLinearVelocity({ x: 0, y: 30, z: 0 });
        const body = world.createRigidBody(desc);
        const colDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.75, 0.05); // approximate blade size
        world.createCollider(colDesc, body);
        knives.set(cmd.id, { body, embedded: false });
    } else if (cmd.type === 'SET_LOG_SPEED') {
        currentLogSpeed = cmd.speed;
    }
};
