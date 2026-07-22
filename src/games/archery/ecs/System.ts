import { Entity } from './Entity';

export abstract class System {
    public requiredComponents: string[];

    constructor(requiredComponents: string[]) {
        this.requiredComponents = requiredComponents;
    }

    /**
     * Called every frame.
     * @param entities A list of entities that match the required components.
     * @param deltaTime Time elapsed since last frame.
     */
    public abstract update(entities: Entity[], deltaTime: number): void;
}
