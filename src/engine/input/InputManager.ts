// src/engine/input/InputManager.ts

export type InputAction = 'moveForward' | 'moveBackward' | 'moveLeft' | 'moveRight' | 'jump' | 'interact' | 'action1' | 'action2';

export interface ControlBinding {
  keyboard?: string[]; // e.g. ['KeyW', 'ArrowUp']
  gamepadButton?: number[]; // e.g. [0] for A/Cross
}

export type InputMap = Record<InputAction, ControlBinding>;

const DEFAULT_INPUT_MAP: InputMap = {
  moveForward: { keyboard: ['KeyW', 'ArrowUp'] },
  moveBackward: { keyboard: ['KeyS', 'ArrowDown'] },
  moveLeft: { keyboard: ['KeyA', 'ArrowLeft'] },
  moveRight: { keyboard: ['KeyD', 'ArrowRight'] },
  jump: { keyboard: ['Space'], gamepadButton: [0] },
  interact: { keyboard: ['KeyE', 'Enter'], gamepadButton: [2] },
  action1: { keyboard: ['KeyF', 'Click'], gamepadButton: [1] },
  action2: { keyboard: ['ShiftLeft'], gamepadButton: [3] },
};

export class InputManager {
  private static instance: InputManager;
  private inputMap: InputMap = { ...DEFAULT_INPUT_MAP };
  private activeKeys: Set<string> = new Set();
  private virtualActionStates: Map<InputAction, boolean> = new Map();
  private listeners: Set<(action: InputAction, active: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    }
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  public setBinding(action: InputAction, binding: ControlBinding) {
    this.inputMap[action] = binding;
  }

  public isPressed(action: InputAction): boolean {
    if (this.virtualActionStates.get(action)) return true;

    const binding = this.inputMap[action];
    if (!binding) return false;

    if (binding.keyboard) {
      for (const code of binding.keyboard) {
        if (this.activeKeys.has(code)) return true;
      }
    }
    return false;
  }

  public setVirtualAction(action: InputAction, active: boolean) {
    const prev = !!this.virtualActionStates.get(action);
    this.virtualActionStates.set(action, active);
    if (prev !== active) {
      this.notify(action, active);
    }
  }

  public subscribe(fn: (action: InputAction, active: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.activeKeys.has(e.code)) return;
    this.activeKeys.add(e.code);
    this.checkActionsForCode(e.code, true);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.activeKeys.delete(e.code);
    this.checkActionsForCode(e.code, false);
  };

  private checkActionsForCode(code: string, active: boolean) {
    (Object.keys(this.inputMap) as InputAction[]).forEach((action) => {
      const binding = this.inputMap[action];
      if (binding?.keyboard?.includes(code)) {
        this.notify(action, active);
      }
    });
  }

  private notify(action: InputAction, active: boolean) {
    this.listeners.forEach((fn) => fn(action, active));
  }
}

export const inputManager = InputManager.getInstance();
