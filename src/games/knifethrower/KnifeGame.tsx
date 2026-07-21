import React, { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { KnifeSentinel } from './engine/KnifeSentinel';

export const KnifeGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const engine = new BABYLON.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1.0);

        // Camera setup
        const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
        camera.setTarget(BABYLON.Vector3.Zero());

        // Sentinel AI Initialization
        const sentinel = new KnifeSentinel(engine, scene);

        // Lighting
        const keyLight = new BABYLON.DirectionalLight("keyLight", new BABYLON.Vector3(-1, -2, 1), scene);
        keyLight.intensity = 1.2;
        keyLight.diffuse = new BABYLON.Color3(1, 0.95, 0.9);

        const rimLight = new BABYLON.HemisphericLight("rimLight", new BABYLON.Vector3(0, -1, -1), scene);
        rimLight.intensity = 0.5;
        rimLight.diffuse = new BABYLON.Color3(0.6, 0.8, 1.0);

        // -- The Log (Procedural) --
        const log = BABYLON.MeshBuilder.CreateCylinder("log", { height: 2.8, diameter: 2.5, tessellation: 64 }, scene);
        log.rotation.x = Math.PI / 2; // Rotate so cylinder flat face is toward camera (wait, usually knife hits the side)
        log.rotation.x = 0;
        log.rotation.z = Math.PI / 2; // Log is horizontal
        log.position.y = 1.5;
        
        const logMat = new BABYLON.StandardMaterial("logMat", scene);
        logMat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1);
        logMat.roughness = 0.8;
        log.material = logMat;

        // -- Phase 4: Post Processing Stack --
        const defaultPipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera]);
        
        // ACES Tonemapping
        defaultPipeline.imageProcessing.toneMappingEnabled = true;
        defaultPipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        defaultPipeline.imageProcessing.exposure = 1.2;

        // Bloom for specular highlights
        defaultPipeline.bloomEnabled = true;
        defaultPipeline.bloomThreshold = 0.8;
        defaultPipeline.bloomWeight = 0.5;

        // Vignette
        defaultPipeline.imageProcessing.vignetteEnabled = true;
        defaultPipeline.imageProcessing.vignetteWeight = 1.5;
        defaultPipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0, 1);
        defaultPipeline.imageProcessing.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

        // -- The Knife (Procedural Factory) --
        const createKnife = (name: string) => {
            const knifeNode = new BABYLON.TransformNode(name, scene);
            
            // Blade
            const blade = BABYLON.MeshBuilder.CreateBox(name + "_blade", { width: 0.2, height: 1.5, depth: 0.05 }, scene);
            const bladeMat = new BABYLON.StandardMaterial("bladeMat", scene);
            bladeMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.85);
            bladeMat.specularColor = new BABYLON.Color3(2.0, 2.0, 2.0); // Boosted for bloom
            bladeMat.specularPower = 256; // Extremely tight specular lobe
            blade.material = bladeMat;
            blade.position.y = 0.75;
            blade.parent = knifeNode;

            // Idle Animation (Subtle hover/shimmer)
            gsap.to(knifeNode.rotation, {
                y: 0.1,
                duration: 2,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut"
            });

            // Handle
            const handle = BABYLON.MeshBuilder.CreateBox(name + "_handle", { width: 0.3, height: 0.8, depth: 0.2 }, scene);
            const handleMat = new BABYLON.StandardMaterial("handleMat", scene);
            handleMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            handle.material = handleMat;
            handle.position.y = -0.4;
            handle.parent = knifeNode;

            return knifeNode;
        };

        // Active knife waiting to be thrown
        let activeKnife = createKnife("activeKnife");
        activeKnife.position = new BABYLON.Vector3(0, -3.5, 0);

        // State variables
        let isThrowing = false;
        let logRotationSpeed = 1.5; // radians per second
        let lastThrowTime = 0;

        // Render Loop
        engine.runRenderLoop(() => {
            const dt = engine.getDeltaTime() / 1000.0;

            // Sentinel Micro-Loop Check
            sentinel.update();

            // Rotate Log
            log.rotation.y += logRotationSpeed * dt;

            // Handle Throw
            if (isThrowing) {
                // If it's the very first frame of the throw, do the anticipation squash
                if (activeKnife.position.y === -3.5) {
                    gsap.to(activeKnife.position, {
                        y: "-=0.2", 
                        duration: 0.05, 
                        yoyo: true, 
                        repeat: 1,
                        onComplete: () => {
                            // Actual throw logic starts after anticipation
                        }
                    });
                }
                
                activeKnife.position.y += 30 * dt; // Throw speed

                // Simple raycast impact detection
                if (activeKnife.position.y > log.position.y - 1.25) { // 1.25 is radius of log
                    isThrowing = false;
                    
                    // Embed into log
                    activeKnife.position.y = log.position.y - 1.25 + 0.4; // Embed depth
                    activeKnife.setParent(log);
                    
                    // Embed Wobble Animation (Spring oscillation)
                    gsap.fromTo(activeKnife.rotation, 
                        { z: 0.15 },
                        { 
                            z: 0, 
                            duration: 0.4, 
                            ease: "elastic.out(1, 0.3)" 
                        }
                    );

                    // Spawn new knife
                    activeKnife = createKnife("activeKnife_" + Date.now());
                    activeKnife.position = new BABYLON.Vector3(0, -3.5, 0);
                }
            }

            scene.render();
        });

        // Input
        const throwKnife = () => {
            const now = performance.now();
            if (!isThrowing && now - lastThrowTime > 300) {
                isThrowing = true;
                lastThrowTime = now;
            }
        };

        const onPointerDown = () => throwKnife();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') throwKnife();
        };

        canvasRef.current.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);

        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            if (canvasRef.current) canvasRef.current.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', handleResize);
            engine.dispose();
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', outline: 'none' }} touch-action="none" />
            <div style={{
                position: 'absolute', top: 20, left: 20, color: 'white', 
                fontFamily: 'monospace', fontSize: '18px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px'
            }}>
                Knife Hit - Phase 1<br/>
                Tap or Space to throw
            </div>
        </div>
    );
};
