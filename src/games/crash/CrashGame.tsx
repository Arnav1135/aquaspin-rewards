import React, { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';
import type { PhysicsState } from './physics/PhysicsWorker';
import { SelfUpgradeMonitor } from './engine/SelfUpgradeMonitor';

const createPhysicsWorker = () => {
  return new Worker(new URL('./physics/PhysicsWorker.ts', import.meta.url), { type: 'module' });
};

export const CrashGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const engine = new BABYLON.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1.0);

        // -- Phase 5: Camera Setup (Basic Chase Mode) --
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 40, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvasRef.current, true);
        camera.fov = 65 * (Math.PI / 180);

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.5;

        const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
        dirLight.intensity = 0.8;

        // -- Phase 6: Post-Processing Stack --
        const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
        pipeline.samples = 4;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8;
        pipeline.bloomWeight = 1.2;
        
        // ACES Tonemapping
        pipeline.imageProcessingEnabled = true;
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

        // -- Phase 2: Procedural Rocket Model --
        const rocket = new BABYLON.TransformNode("rocket", scene);
        
        const bodyMat = new BABYLON.StandardMaterial("bodyMat", scene);
        bodyMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.85);
        bodyMat.specularColor = new BABYLON.Color3(1, 1, 1);
        
        const noseMat = new BABYLON.StandardMaterial("noseMat", scene);
        noseMat.diffuseColor = new BABYLON.Color3(0.9, 0.2, 0.2);

        const body = BABYLON.MeshBuilder.CreateCylinder("body", {height: 3, diameter: 0.8}, scene);
        body.material = bodyMat;
        body.rotation.x = Math.PI / 2; // Align cylinder along Z axis (forward)
        body.parent = rocket;

        const nose = BABYLON.MeshBuilder.CreateCylinder("nose", {height: 1.5, diameterTop: 0, diameterBottom: 0.8}, scene);
        nose.material = noseMat;
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 2.25;
        nose.parent = rocket;

        const engineMat = new BABYLON.StandardMaterial("engineMat", scene);
        engineMat.emissiveColor = new BABYLON.Color3(1, 0.4, 0);

        const engineNozzle = BABYLON.MeshBuilder.CreateCylinder("engineNozzle", {height: 0.5, diameterTop: 0.6, diameterBottom: 0.8}, scene);
        engineNozzle.material = engineMat;
        engineNozzle.rotation.x = Math.PI / 2;
        engineNozzle.position.z = -1.75;
        engineNozzle.parent = rocket;

        // -- Phase 3: Core Exhaust & Contrail --
        const particleSystem = new BABYLON.ParticleSystem("exhaust", 2000, scene);
        particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
        particleSystem.emitter = engineNozzle; 
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0.2, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 0.3, 0.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        particleSystem.minSize = 0.5;
        particleSystem.maxSize = 1.5;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.6;
        particleSystem.emitRate = 500;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0); // Real gravity on exhaust
        particleSystem.direction1 = new BABYLON.Vector3(0, 0, -1);
        particleSystem.direction2 = new BABYLON.Vector3(0, 0, -1);
        particleSystem.minEmitPower = 5;
        particleSystem.maxEmitPower = 10;
        particleSystem.updateSpeed = 0.016;
        particleSystem.start();

        const trail = new BABYLON.TrailMesh("contrail", rocket, scene, 0.5, 60, true);
        const trailMat = new BABYLON.StandardMaterial("trailMat", scene);
        trailMat.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
        trailMat.alpha = 0.4;
        trail.material = trailMat;

        // -- Phase 7: Dynamic Engine Light --
        const engineLight = new BABYLON.PointLight("engineLight", new BABYLON.Vector3(0, 0, -2), scene);
        engineLight.parent = rocket;
        engineLight.diffuse = new BABYLON.Color3(1, 0.5, 0);
        engineLight.intensity = 2;

        const worker = createPhysicsWorker();

        let rawPhysicsPos = BABYLON.Vector3.Zero();
        let currentVelocity = BABYLON.Vector3.Zero();
        let targetQuaternion = BABYLON.Quaternion.Identity();
        let currentMultiplier = 1.0;
        let burnTime = 0;

        let visualPos = BABYLON.Vector3.Zero();
        let isCrashed = false;
        const CRASH_MULTIPLIER = 8.5; // Mock crash point for demonstration

        // Phase 9: Crash Assets
        const explosionMaterial = new BABYLON.StandardMaterial("explosionMat", scene);
        explosionMaterial.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
        explosionMaterial.alpha = 0.8;

        const shockwaveMaterial = new BABYLON.StandardMaterial("shockwaveMat", scene);
        shockwaveMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
        shockwaveMaterial.alpha = 0.5;
        shockwaveMaterial.backFaceCulling = false;

        worker.onmessage = (e) => {
            if (e.data.type === 'INIT_COMPLETE') {
                setInterval(() => worker.postMessage({ type: 'TICK', dt: 1.0 / 120.0 }), 1000 / 120);
                
                setInterval(() => {
                    currentMultiplier += 0.02;
                    worker.postMessage({ type: 'SET_MULTIPLIER', multiplier: currentMultiplier });
                }, 100);

            } else if (e.data.type === 'STATE_UPDATE') {
                if (isCrashed) return; // Stop updating state if crashed

                const state = e.data.state as PhysicsState;
                if (state.multiplier >= CRASH_MULTIPLIER) {
                    triggerCrashSequence();
                    return;
                }

                rawPhysicsPos = new BABYLON.Vector3(state.position[0], state.position[1], state.position[2]);
                currentVelocity = new BABYLON.Vector3(state.velocity[0], state.velocity[1], state.velocity[2]);
                burnTime = state.burnTime;
                
                // Calculate rotation (nose points along velocity)
                if (currentVelocity.lengthSquared() > 0.1) {
                    const velocityDir = currentVelocity.normalizeToNew();
                    // Rocket default forward is Z, so we align Z with velocityDir
                    const pitch = Math.asin(-velocityDir.y);
                    const yaw = Math.atan2(velocityDir.x, velocityDir.z);
                    targetQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch, 0);
                }
            }
        };

        worker.postMessage({ type: 'INIT' });

        // -- Phase 10: Self Upgrade Monitor --
        const upgradeMonitor = new SelfUpgradeMonitor(engine);
        upgradeMonitor.onTierChanged = (tier, caps) => {
            console.log(`Applying visual changes for tier ${tier}`);
            particleSystem.emitRate = caps.gpuParticleCount / 10; // scale down for testing
            pipeline.bloomWeight = caps.bloomIntensity;
            if (!caps.postProcessingEnabled) {
                pipeline.bloomEnabled = false;
                pipeline.imageProcessingEnabled = false;
            } else {
                pipeline.bloomEnabled = true;
                pipeline.imageProcessingEnabled = true;
            }
        };

        const triggerCrashSequence = () => {
            isCrashed = true;
            particleSystem.stop();
            engineLight.intensity = 0;
            rocket.setEnabled(false); // Hide rocket mesh
            trail.dispose(); // Remove contrail

            // 1. Initial Flash
            const flash = BABYLON.MeshBuilder.CreateSphere("flash", {diameter: 10}, scene);
            flash.position = visualPos.clone();
            const flashMat = new BABYLON.StandardMaterial("flashMat", scene);
            flashMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            flash.material = flashMat;

            // 2. Fireball
            const fireball = BABYLON.MeshBuilder.CreateSphere("fireball", {diameter: 2}, scene);
            fireball.position = visualPos.clone();
            fireball.material = explosionMaterial;

            // 3. Shockwave Ring
            const shockwave = BABYLON.MeshBuilder.CreateTorus("shockwave", {diameter: 2, thickness: 0.2}, scene);
            shockwave.position = visualPos.clone();
            shockwave.material = shockwaveMaterial;
            // Face camera roughly
            shockwave.rotation.x = Math.PI / 2;

            // Animate using BABYLON Animations
            const frameRate = 60;
            
            // Flash scale up and fade out instantly
            const flashAnim = new BABYLON.Animation("flashAnim", "scaling", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            flashAnim.setKeys([
                { frame: 0, value: new BABYLON.Vector3(0, 0, 0) },
                { frame: 3, value: new BABYLON.Vector3(3, 3, 3) },
                { frame: 5, value: new BABYLON.Vector3(0, 0, 0) }
            ]);
            flash.animations.push(flashAnim);
            scene.beginAnimation(flash, 0, 5, false, 1, () => flash.dispose());

            // Fireball expand slowly
            const fireballAnim = new BABYLON.Animation("fireballAnim", "scaling", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            fireballAnim.setKeys([
                { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
                { frame: 60, value: new BABYLON.Vector3(15, 15, 15) }
            ]);
            
            const fireballAlpha = new BABYLON.Animation("fireballAlpha", "material.alpha", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            fireballAlpha.setKeys([
                { frame: 0, value: 0.8 },
                { frame: 40, value: 0.5 },
                { frame: 60, value: 0.0 }
            ]);
            fireball.animations.push(fireballAnim, fireballAlpha);
            scene.beginAnimation(fireball, 0, 60, false, 1, () => fireball.dispose());

            // Shockwave expand rapidly
            const shockAnim = new BABYLON.Animation("shockAnim", "scaling", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            shockAnim.setKeys([
                { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
                { frame: 30, value: new BABYLON.Vector3(30, 30, 30) }
            ]);
            
            const shockAlpha = new BABYLON.Animation("shockAlpha", "material.alpha", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            shockAlpha.setKeys([
                { frame: 0, value: 0.5 },
                { frame: 30, value: 0.0 }
            ]);
            shockwave.animations.push(shockAnim, shockAlpha);
            scene.beginAnimation(shockwave, 0, 30, false, 1, () => shockwave.dispose());
            
            // Phase 5: Crash Camera mode (lock forward, widen FOV)
            camera.fov = 80 * (Math.PI / 180);
        };

        engine.runRenderLoop(() => {
            const dt = engine.getDeltaTime() / 1000.0;
            
            // Monitor FPS and adapt
            upgradeMonitor.update();
            
            if (!isCrashed) {

            // Phase 4: Curve Regulator (Breathing Oscillation & Drama)
            const dramaFactor = 1.0 + (currentMultiplier * 0.05); // Amplifies Y curve
            const breathingOscillation = Math.sin(burnTime * 3) * 0.2 * (currentMultiplier > 5 ? 1 : 0);

            // Interpolate position for smoothness
            const targetVisualPos = new BABYLON.Vector3(
                rawPhysicsPos.x,
                (rawPhysicsPos.y * dramaFactor) + breathingOscillation,
                rawPhysicsPos.z
            );
            
            visualPos = BABYLON.Vector3.Lerp(visualPos, targetVisualPos, 15 * dt);
            rocket.position = visualPos;

            // Phase 2: Slerp Rotation
            if (rocket.rotationQuaternion) {
                rocket.rotationQuaternion = BABYLON.Quaternion.Slerp(rocket.rotationQuaternion, targetQuaternion, 10 * dt);
            } else {
                rocket.rotationQuaternion = targetQuaternion;
            }

            // Phase 3 & 7 updates: modulate visuals by multiplier/speed
            const speed = currentVelocity.length();
            engineLight.intensity = 1.0 + (speed * 0.1);
            particleSystem.emitRate = 500 + (speed * 20);
            
            // Phase 5: Camera Chase
            camera.setTarget(rocket.position);
            }
            
            scene.render();
        });

        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            worker.terminate();
            engine.dispose();
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} touch-action="none" />
        </div>
    );
};
