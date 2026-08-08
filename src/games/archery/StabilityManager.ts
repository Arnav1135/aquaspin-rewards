import { Engine, Scene, SceneLoader, ISceneLoaderAsyncResult, MeshBuilder } from '@babylonjs/core';

/**
 * Keeps the Babylon archery scene resilient without changing gameplay authority.
 * Handles render-loop failures, WebGL recovery and adaptive render resolution.
 */
export class StabilityManager {
    private engine: Engine;
    private scene: Scene;
    private onCriticalFailure: (err: Error) => void;
    private frameTimes: number[] = [];
    private lastScaleTime = 0;
    private renderLoopRunning = false;
    private contextLost = false;
    private currentQualityLevel = 2; // 2 high, 1 medium, 0 low

    private readonly TARGET_FPS = 45;
    private readonly SAMPLE_SIZE = 60;

    constructor(engine: Engine, scene: Scene, onCriticalFailure: (err: Error) => void) {
        this.engine = engine;
        this.scene = scene;
        this.onCriticalFailure = onCriticalFailure;
        this.initContextLossHandlers();
        this.initPerformanceMonitor();
    }

    public startGuardedRenderLoop(): void {
        if (this.renderLoopRunning || this.contextLost) return;
        this.renderLoopRunning = true;
        this.engine.runRenderLoop(() => {
            if (this.contextLost) return;
            try {
                this.scene.render();
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('[StabilityManager] Render loop exception', err);
                this.logTelemetry('RenderLoopException', err.message);
                this.renderLoopRunning = false;
                this.engine.stopRenderLoop();
                this.onCriticalFailure(err);
            }
        });
    }

    public stop(): void {
        this.renderLoopRunning = false;
        this.engine.stopRenderLoop();
    }

    private initContextLossHandlers(): void {
        const canvas = this.engine.getRenderingCanvas();
        if (!canvas) return;

        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.contextLost = true;
            this.renderLoopRunning = false;
            this.engine.stopRenderLoop();
            this.logTelemetry('ContextLost', 'WebGL context was lost');
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
            this.contextLost = false;
            this.frameTimes.length = 0;
            this.lastScaleTime = 0;
            this.logTelemetry('ContextRestored', 'WebGL context restored');
            this.startGuardedRenderLoop();
        }, false);
    }

    private initPerformanceMonitor(): void {
        this.scene.onBeforeRenderObservable.add(() => {
            const delta = this.engine.getDeltaTime();
            if (!Number.isFinite(delta) || delta <= 0) return;

            this.frameTimes.push(delta);
            if (this.frameTimes.length > this.SAMPLE_SIZE) this.frameTimes.shift();

            const now = performance.now();
            if (now - this.lastScaleTime < 2000 || this.frameTimes.length < this.SAMPLE_SIZE) return;

            const avgDelta = this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
            const currentFps = 1000 / avgDelta;

            if (currentFps < this.TARGET_FPS && this.currentQualityLevel > 0) {
                this.degradeQuality();
                this.lastScaleTime = now;
            } else if (currentFps > 55 && this.currentQualityLevel < 2) {
                this.upgradeQuality();
                this.lastScaleTime = now;
            }
        });
    }

    private degradeQuality(): void {
        this.currentQualityLevel -= 1;
        const scaling = this.currentQualityLevel === 1 ? 1.5 : 2;
        this.engine.setHardwareScalingLevel(scaling);
        this.logTelemetry('AutoScaling', `Degrading render quality to level ${this.currentQualityLevel}`);
    }

    private upgradeQuality(): void {
        this.currentQualityLevel += 1;
        const scaling = this.currentQualityLevel === 2 ? 1 : 1.5;
        this.engine.setHardwareScalingLevel(scaling);
        this.logTelemetry('AutoScaling', `Upgrading render quality to level ${this.currentQualityLevel}`);
    }

    public async safeLoadAsset(rootUrl: string, sceneFilename: string): Promise<ISceneLoaderAsyncResult | null> {
        try {
            return await SceneLoader.ImportMeshAsync('', rootUrl, sceneFilename, this.scene);
        } catch (error) {
            console.error(`[StabilityManager] Failed to load ${sceneFilename}; using fallback`, error);
            this.logTelemetry('AssetLoadFail', sceneFilename);
            const fallbackMesh = MeshBuilder.CreateBox(`fallback_${sceneFilename}`, { size: 1 }, this.scene);
            return {
                meshes: [fallbackMesh],
                particleSystems: [],
                skeletons: [],
                animationGroups: [],
                transformNodes: [],
                geometries: [],
                lights: [],
                spriteManagers: [],
            };
        }
    }

    public validateAnimationState(totalWeight: number): void {
        if (totalWeight > 1.01 || !Number.isFinite(totalWeight)) {
            console.warn('[StabilityManager] Invalid animation state detected', totalWeight);
            this.logTelemetry('AnimationWatchdog', `Invalid weight: ${totalWeight}`);
        }
    }

    private logTelemetry(event: string, details: string): void {
        console.log(`[TELEMETRY] ${event}: ${details}`);
    }
}
