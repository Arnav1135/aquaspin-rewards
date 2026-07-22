import { Mesh } from '@babylonjs/core';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';

export class TransformComponent {
    constructor(public mesh: Mesh) {}
}

export class PhysicsComponent {
    constructor(public body: PhysicsBody) {}
}

export class ArrowComponent {
    public isFlying = false;
    public stuck = false;
    constructor(public mass = 0.1) {}
}

export class InputControllerComponent {
    public aimX = 0;
    public aimY = 0;
    public drawPower = 0; // 0 to 1
    public isDrawing = false;
    public state: 'idle' | 'drawing' | 'released' = 'idle';
}

export class WindComponent {
    public windX = 0;
    public windZ = 0;
}
