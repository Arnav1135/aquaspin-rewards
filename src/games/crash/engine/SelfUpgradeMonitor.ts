import * as BABYLON from '@babylonjs/core';

export enum QualityTier {
    LOW = 0,
    MEDIUM = 1,
    HIGH = 2,
    ULTRA = 3
}

export interface EngineCapabilities {
    zAxisDrift: boolean;
    gpuParticleCount: number;
    bloomIntensity: number;
    postProcessingEnabled: boolean;
}

export class SelfUpgradeMonitor {
    private engine: BABYLON.Engine;
    private currentTier: QualityTier = QualityTier.MEDIUM;
    private frameTimes: number[] = [];
    private lastCheckTime: number;
    private readonly CHECK_INTERVAL_MS = 5000;
    private isMobile: boolean;

    // Callbacks to notify game components to adjust visuals
    public onTierChanged: ((tier: QualityTier, capabilities: EngineCapabilities) => void) | null = null;

    constructor(engine: BABYLON.Engine) {
        this.engine = engine;
        this.lastCheckTime = performance.now();
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Start at medium or load from localStorage
        const savedScore = localStorage.getItem('crashGameQualityScore');
        if (savedScore) {
            this.setTierByScore(parseInt(savedScore, 10));
        } else {
            this.setTier(this.isMobile ? QualityTier.LOW : QualityTier.MEDIUM);
        }
    }

    public update() {
        const now = performance.now();
        const dt = this.engine.getDeltaTime();
        
        // Accumulate frame times (convert to FPS later)
        this.frameTimes.push(1000.0 / dt);

        if (now - this.lastCheckTime >= this.CHECK_INTERVAL_MS) {
            this.evaluatePerformance();
            this.lastCheckTime = now;
            this.frameTimes = []; // reset window
        }
    }

    private evaluatePerformance() {
        if (this.frameTimes.length === 0) return;

        // Calculate average FPS over the last 5 seconds
        const sum = this.frameTimes.reduce((a, b) => a + b, 0);
        const avgFps = sum / this.frameTimes.length;

        // Upgrade/Downgrade logic
        const downgradeThreshold = this.isMobile ? 28 : 55;
        const upgradeThreshold = 58;

        if (avgFps < downgradeThreshold) {
            this.downgradeTier();
        } else if (avgFps > upgradeThreshold && this.frameTimes.length > (upgradeThreshold * 4)) {
            // Only upgrade if we consistently hit target for most frames
            this.upgradeTier();
        }
    }

    private upgradeTier() {
        if (this.currentTier < QualityTier.ULTRA) {
            this.setTier(this.currentTier + 1);
            console.log(`[Self-Upgrade Monitor] FPS stable. Upgraded quality to ${QualityTier[this.currentTier]}`);
        }
    }

    private downgradeTier() {
        // Enforce minimum tiers
        const minTier = this.isMobile ? QualityTier.LOW : QualityTier.MEDIUM;
        if (this.currentTier > minTier) {
            this.setTier(this.currentTier - 1);
            console.log(`[Self-Upgrade Monitor] FPS dropped. Downgraded quality to ${QualityTier[this.currentTier]}`);
        }
    }

    private setTierByScore(score: number) {
        if (score <= 3) this.setTier(QualityTier.LOW);
        else if (score <= 6) this.setTier(QualityTier.MEDIUM);
        else if (score <= 8) this.setTier(QualityTier.HIGH);
        else this.setTier(QualityTier.ULTRA);
    }

    private setTier(tier: QualityTier) {
        if (this.currentTier === tier) return;
        
        this.currentTier = tier;
        
        // Save score to local storage
        let score = 5;
        if (tier === QualityTier.LOW) score = 2;
        if (tier === QualityTier.MEDIUM) score = 5;
        if (tier === QualityTier.HIGH) score = 7;
        if (tier === QualityTier.ULTRA) score = 9;
        localStorage.setItem('crashGameQualityScore', score.toString());

        if (this.onTierChanged) {
            this.onTierChanged(this.currentTier, this.getCapabilities());
        }
    }

    public getCapabilities(): EngineCapabilities {
        switch (this.currentTier) {
            case QualityTier.LOW:
                return { zAxisDrift: false, gpuParticleCount: 500, bloomIntensity: 0.2, postProcessingEnabled: false };
            case QualityTier.MEDIUM:
                return { zAxisDrift: true, gpuParticleCount: 2000, bloomIntensity: 0.5, postProcessingEnabled: true };
            case QualityTier.HIGH:
                return { zAxisDrift: true, gpuParticleCount: 5000, bloomIntensity: 0.8, postProcessingEnabled: true };
            case QualityTier.ULTRA:
                return { zAxisDrift: true, gpuParticleCount: 10000, bloomIntensity: 1.2, postProcessingEnabled: true };
            default:
                return { zAxisDrift: true, gpuParticleCount: 2000, bloomIntensity: 0.5, postProcessingEnabled: true };
        }
    }
}
