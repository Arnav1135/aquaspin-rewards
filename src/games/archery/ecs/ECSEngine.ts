import { Entity } from './Entity';
import { System } from './System';

export class ECSEngine {
    private entities: Entity[] = [];
    private systems: System[] = [];

    public addEntity(entity: Entity): void {
        this.entities.push(entity);
    }

    public removeEntity(id: string): void {
        this.entities = this.entities.filter(e => e.id !== id);
    }

    public addSystem(system: System): void {
        this.systems.push(system);
    }

    public update(deltaTime: number): void {
        for (const system of this.systems) {
            const applicableEntities = this.entities.filter(entity => 
                system.requiredComponents.every(req => entity.hasComponent(req))
            );
            system.update(applicableEntities, deltaTime);
        }
    }
}
