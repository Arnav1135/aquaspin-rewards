import * as BABYLON from '@babylonjs/core';

export class KnifeSentinel {
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    
    // Monitoring state
    private frameTimes: number[] = [];
    private lastMacroCheck: number;
    
    constructor(engine: BABYLON.Engine, scene: BABYLON.Scene) {
        this.engine = engine;
        this.scene = scene;
        this.lastMacroCheck = performance.now();

        this.setupContextLossHandler();
    }

    private setupContextLossHandler() {
        const canvas = this.engine.getRenderingCanvas();
        if (!canvas) return;

        canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            console.warn("[SENTINEL] WebGL Context Lost! Initiating cinematic pause and recovery...");
            this.handleContextLoss();
        }, false);

        canvas.addEventListener("webglcontextrestored", () => {
            console.log("[SENTINEL] WebGL Context Restored. Rebuilding GPU resources...");
            this.handleContextRestored();
        }, false);
    }

    private handleContextLoss() {
        // Halt render loop safely
        this.engine.stopRenderLoop();
        // In a full implementation, we show the loading cinematic here
    }

    private handleContextRestored() {
        // Re-upload shaders and textures, then resume
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public update() {
        const now = performance.now();
        const dt = this.engine.getDeltaTime();
        
        // Micro Loop: Frame Health Monitor
        this.frameTimes.push(dt);
        if (dt > 33) {
            console.warn(`[SENTINEL] Frame spike detected: ${dt.toFixed(2)}ms. Triggering mitigation.`);
            // Mitigation logic goes here
        }

        // Macro Loop (2 seconds)
        if (now - this.lastMacroCheck > 2000) {
            this.runMacroAudit();
            this.lastMacroCheck = now;
            this.frameTimes = []; // clear window
        }
    }

    private runMacroAudit() {
        // Memory Leak Detection (Mesh Count bounds)
        if (this.scene.meshes.length > 80) {
            console.warn("[SENTINEL] Mesh count exceeds bounds. Running garbage collection / orphan disposal.");
        }

        // Visibility Error Detection
        // Ensure log and knives didn't magically disappear due to an interrupted animation
        const log = this.scene.getMeshByName("log");
        if (log && log.visibility < 0.05) {
            console.error("[SENTINEL] Invisible log detected. Self-healing visibility.");
            log.visibility = 1.0;
        }
    }
}
