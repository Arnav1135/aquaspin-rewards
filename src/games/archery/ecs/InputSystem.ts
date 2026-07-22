import { System } from './System';
import { Entity } from './Entity';
import { InputControllerComponent } from './components';

export class InputSystem extends System {
    constructor() {
        super(['InputControllerComponent']);
    }

    public update(entities: Entity[], deltaTime: number): void {
        for (const entity of entities) {
            const input = entity.getComponent<InputControllerComponent>('InputControllerComponent');
            if (input && input.state === 'drawing') {
                input.drawPower += deltaTime * 0.001; // Increase power over time
                if (input.drawPower > 1) {
                    input.drawPower = 1;
                }
            }
        }
    }
}
