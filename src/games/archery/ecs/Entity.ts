export class Entity {
    public id: string;
    private components: Map<string, any>;

    constructor(id?: string) {
        this.id = id || Math.random().toString(36).substring(2, 9);
        this.components = new Map<string, any>();
    }

    public addComponent<T>(name: string, component: T): void {
        this.components.set(name, component);
    }

    public getComponent<T>(name: string): T | undefined {
        return this.components.get(name) as T;
    }

    public hasComponent(name: string): boolean {
        return this.components.has(name);
    }

    public removeComponent(name: string): void {
        this.components.delete(name);
    }
}
