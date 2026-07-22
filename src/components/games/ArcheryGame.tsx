import { useEffect, useRef, useState } from 'react';
import { 
    Engine, Scene, Vector3, HemisphericLight, MeshBuilder, FreeCamera, 
    Color3, DirectionalLight, ShadowGenerator,
    DefaultRenderingPipeline, PBRMaterial, Texture,
    ParticleSystem, Ray, TransformNode, Animation, BezierCurveEase, EasingFunction,
    Mesh
} from '@babylonjs/core';
import { GameFrame } from './GameFrame';
import { StabilityManager } from '../../games/archery/StabilityManager';

interface Props {
  onClose: () => void;
}

export function ArcheryGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [power, setPower] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'drawing' | 'flying' | 'result'>('idle');
  const [mode, setMode] = useState<'solo' | 'pass-and-play' | 'vs-ai'>('solo');
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [round, setRound] = useState(1);
  const maxRounds = 3;
  const [wind, setWind] = useState(0);
  const [resultMessage, setResultMessage] = useState('');

  // Refs for Babylon interactions
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<FreeCamera | null>(null);
  const bowRef = useRef<TransformNode | null>(null);
  const bowStringRef = useRef<Mesh | null>(null);
  
  // Game state refs
  const drawPowerRef = useRef(0);
  const isDrawingRef = useRef(false);
  const activeArrowRef = useRef<{mesh: Mesh, velocity: Vector3, trail: ParticleSystem, isStuck: boolean} | null>(null);
  
  const targetDist = 70;
  const targetNodeRef = useRef<TransformNode | null>(null);

  const matchState = useRef({
      currentPlayer: 1,
      round: 1,
      p1Score: 0,
      p2Score: 0
  });

  useEffect(() => {
    let engine: Engine;
    let scene: Scene;
    let stabilityManager: StabilityManager;
    
    const initEngine = async () => {
      if (!canvasRef.current) return;
      
      engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
      engineRef.current = engine;
      scene = new Scene(engine);
      sceneRef.current = scene;
      
      // Better rendering
      scene.clearColor = new Color3(0.5, 0.7, 0.9).toColor4(1);
      
      stabilityManager = new StabilityManager(engine, scene, (err) => {
         console.error("Critical Failure in Archery3D", err);
      });

      // Camera
      const camera = new FreeCamera("camera1", new Vector3(0, 1.8, -10), scene);
      camera.setTarget(new Vector3(0, 1.5, targetDist));
      camera.minZ = 0.1;
      cameraRef.current = camera;

      // Lighting - HDR / PBR setup
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.6;
      hemiLight.specular = new Color3(0.1, 0.1, 0.1);
      hemiLight.groundColor = new Color3(0.2, 0.3, 0.2);
      
      const dirLight = new DirectionalLight("dirLight", new Vector3(-0.5, -1, -0.5), scene);
      dirLight.position = new Vector3(20, 40, 20);
      dirLight.intensity = 1.5;
      
      const shadowGenerator = new ShadowGenerator(2048, dirLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;

      // Environment (Skybox & Ground)
      const envHelper = scene.createDefaultEnvironment({
          createSkybox: true,
          skyboxSize: 1000,
          skyboxColor: new Color3(0.3, 0.6, 0.9),
          createGround: true,
          groundSize: 1000,
          groundColor: new Color3(0.15, 0.4, 0.15),
          enableGroundShadow: true,
      });
      if (envHelper?.ground) {
          envHelper.ground.receiveShadows = true;
          const groundMat = new PBRMaterial("groundPBR", scene);
          groundMat.albedoColor = new Color3(0.15, 0.4, 0.15);
          groundMat.roughness = 0.9;
          groundMat.metallic = 0.05;
          envHelper.ground.material = groundMat;
      }

      // Materials (PBR)
      const createPBR = (name: string, color: Color3, roughness = 0.5, metallic = 0.1) => {
          const mat = new PBRMaterial(name, scene);
          mat.albedoColor = color;
          mat.roughness = roughness;
          mat.metallic = metallic;
          return mat;
      };

      const targetMatRed = createPBR("red", new Color3(0.8, 0.1, 0.1), 0.4, 0.1);
      const targetMatWhite = createPBR("white", new Color3(0.9, 0.9, 0.9), 0.4, 0.1);
      const targetMatBlue = createPBR("blue", new Color3(0.1, 0.3, 0.8), 0.4, 0.1);
      const targetMatGold = createPBR("gold", new Color3(0.9, 0.8, 0.1), 0.3, 0.8);
      const woodMat = createPBR("wood", new Color3(0.4, 0.2, 0.05), 0.8, 0.0);
      
      // Target Setup
      const targetGroup = new TransformNode("targetGroup", scene);
      targetGroup.position.set(0, 1.5, targetDist);
      targetNodeRef.current = targetGroup;

      const stand = MeshBuilder.CreateCylinder("stand", {height: 2, diameter: 0.2}, scene);
      stand.position.y = -1;
      stand.material = woodMat;
      stand.parent = targetGroup;
      shadowGenerator.addShadowCaster(stand);

      const targetBase = MeshBuilder.CreateCylinder("targetBase", {height: 0.2, diameter: 2.4}, scene);
      targetBase.rotation.x = Math.PI / 2;
      targetBase.material = targetMatWhite;
      targetBase.parent = targetGroup;
      shadowGenerator.addShadowCaster(targetBase);
      
      const ring1 = MeshBuilder.CreateCylinder("r1", {height: 0.22, diameter: 1.6}, scene);
      ring1.rotation.x = Math.PI / 2;
      ring1.parent = targetGroup;
      ring1.material = targetMatBlue;
      
      const ring2 = MeshBuilder.CreateCylinder("r2", {height: 0.24, diameter: 0.8}, scene);
      ring2.rotation.x = Math.PI / 2;
      ring2.parent = targetGroup;
      ring2.material = targetMatRed;
      
      const ring3 = MeshBuilder.CreateCylinder("r3", {height: 0.26, diameter: 0.4}, scene);
      ring3.rotation.x = Math.PI / 2;
      ring3.parent = targetGroup;
      ring3.material = targetMatGold;

      // Post Processing Pipeline
      const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
      pipeline.samples = 4;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.7;
      pipeline.bloomWeight = 0.8;
      pipeline.depthOfFieldEnabled = true;
      pipeline.depthOfField.focusDistance = 7000;
      pipeline.depthOfField.focalLength = 100;
      pipeline.depthOfField.fStop = 1.4;
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.contrast = 1.2;
      pipeline.imageProcessing.exposure = 1.1;

      // Procedural Bow
      const bowNode = new TransformNode("bow", scene);
      bowNode.position = new Vector3(0.5, -0.5, 1.5);
      bowNode.parent = camera;
      bowRef.current = bowNode;

      const topLimb = MeshBuilder.CreateCylinder("topLimb", {height: 0.7, diameterTop: 0.02, diameterBottom: 0.06}, scene);
      topLimb.position.y = 0.35;
      topLimb.rotation.z = -0.2;
      topLimb.material = woodMat;
      topLimb.parent = bowNode;

      const bottomLimb = MeshBuilder.CreateCylinder("bottomLimb", {height: 0.7, diameterTop: 0.06, diameterBottom: 0.02}, scene);
      bottomLimb.position.y = -0.35;
      bottomLimb.rotation.z = 0.2;
      bottomLimb.material = woodMat;
      bottomLimb.parent = bowNode;
      
      const handle = MeshBuilder.CreateCylinder("handle", {height: 0.2, diameter: 0.08}, scene);
      handle.material = createPBR("leather", new Color3(0.2, 0.1, 0.05), 0.9, 0.1);
      handle.parent = bowNode;

      // Bow string
      const string = MeshBuilder.CreateCylinder("string", {height: 1.35, diameter: 0.005}, scene);
      string.position.z = -0.15;
      string.material = createPBR("stringMat", new Color3(0.9, 0.9, 0.9));
      string.parent = bowNode;
      bowStringRef.current = string;

      // Wind
      const wX = (Math.random() - 0.5) * 8; // m/s
      setWind(parseFloat(wX.toFixed(1)));

      setLoading(false);
      
      // Update logic via observable instead of custom render loop
      scene.onBeforeRenderObservable.add(() => {
          const dt = engine.getDeltaTime() / 1000;
          
          // Animate Bow Draw
          if (bowNode && bowStringRef.current) {
              const targetZ = isDrawingRef.current ? -0.5 - (drawPowerRef.current * 0.5) : -0.15;
              string.position.z += (targetZ - string.position.z) * 10 * dt;
              
              // Bend limbs
              const bend = isDrawingRef.current ? drawPowerRef.current * 0.3 : 0;
              topLimb.rotation.z = -0.2 - bend;
              bottomLimb.rotation.z = 0.2 + bend;
              
              // Add slight camera shake when drawing hard
              if (isDrawingRef.current && drawPowerRef.current > 0.8) {
                  const shake = (drawPowerRef.current - 0.8) * 0.05;
                  bowNode.position.x = 0.5 + (Math.random() - 0.5) * shake;
                  bowNode.position.y = -0.5 + (Math.random() - 0.5) * shake;
              } else {
                  bowNode.position.x = 0.5;
                  bowNode.position.y = -0.5;
              }
          }
          
          // Physics Update for Arrow (Custom Raycast integration)
          if (activeArrowRef.current && !activeArrowRef.current.isStuck) {
              const arr = activeArrowRef.current;
              
              // Apply Gravity & Wind
              arr.velocity.y -= 9.81 * dt; // Gravity
              arr.velocity.x += (wind * 0.5) * dt; // Wind drag
              
              const startPos = arr.mesh.position.clone();
              const displacement = arr.velocity.scale(dt);
              const nextPos = startPos.add(displacement);
              
              // Raycast from start to next
              const ray = new Ray(startPos, displacement.normalizeToNew(), displacement.length());
              const hit = scene.pickWithRay(ray, (mesh) => mesh.name.startsWith("r") || mesh.name === "targetBase" || mesh.name === "ground");
              
              if (hit && hit.hit && hit.pickedPoint) {
                  // STUCK!
                  arr.mesh.position = hit.pickedPoint;
                  arr.isStuck = true;
                  arr.trail.stop();
                  
                  // Score calc
                  if (hit.pickedMesh && hit.pickedMesh.name === "ground") {
                      finishShot(0, "Missed! (Hit the ground)");
                  } else {
                      // Hit the target
                      const dx = hit.pickedPoint.x - targetGroup.position.x;
                      const dy = hit.pickedPoint.y - targetGroup.position.y;
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      
                      let points = 0;
                      if (dist <= 0.2) {
                          points = 10;
                          finishShot(points, "Bullseye! 10 Points");
                      } else if (dist <= 0.4) {
                          points = 9;
                          finishShot(points, "9 Points");
                      } else if (dist <= 0.8) {
                          points = 7;
                          finishShot(points, "7 Points");
                      } else if (dist <= 1.2) {
                          points = 5;
                          finishShot(points, "5 Points");
                      } else {
                          finishShot(0, "Missed the target!");
                      }
                  }
              } else {
                  // Move arrow
                  arr.mesh.position = nextPos;
                  // Orient arrow to velocity
                  if (arr.velocity.lengthSquared() > 0.1) {
                      arr.mesh.lookAt(arr.mesh.position.add(arr.velocity));
                      arr.mesh.rotate(new Vector3(1, 0, 0), Math.PI / 2); // Cylinder alignment
                  }
                  
                  // Follow camera smoothly
                  if (cameraRef.current) {
                      const targetCamPos = new Vector3(arr.mesh.position.x, arr.mesh.position.y + 0.5, arr.mesh.position.z - 3);
                      cameraRef.current.position = Vector3.Lerp(cameraRef.current.position, targetCamPos, 0.15);
                      cameraRef.current.setTarget(arr.mesh.position);
                      
                      // Check out of bounds
                      if (arr.mesh.position.y < -5 || arr.mesh.position.z > targetDist + 20) {
                          arr.isStuck = true;
                          arr.trail.stop();
                          finishShot(0, "Missed completely!");
                      }
                  }
              }
          }
      });
      
      // Start guarded render loop via StabilityManager
      stabilityManager.startGuardedRenderLoop();
      
      window.addEventListener('resize', () => engine.resize());
    };

    initEngine();

    return () => {
      if (engine) engine.dispose();
    };
  }, []);
  
  const finishShot = (points: number, message: string) => {
      setGameState('result');
      setResultMessage(message);
      
      if (matchState.current.currentPlayer === 1) {
          matchState.current.p1Score += points;
          setP1Score(matchState.current.p1Score);
      } else {
          matchState.current.p2Score += points;
          setP2Score(matchState.current.p2Score);
      }
  };

  const handlePointerDown = () => {
      if (gameState !== 'idle') return;
      setGameState('drawing');
      setResultMessage('');
      isDrawingRef.current = true;
      drawPowerRef.current = 0;
      
      // Power bar incrementer
      const interval = setInterval(() => {
          if (isDrawingRef.current) {
             let p = drawPowerRef.current + 0.02;
             if (p > 1) p = 1;
             drawPowerRef.current = p;
             setPower(Math.floor(p * 100));
          } else {
             clearInterval(interval);
          }
      }, 16);
  };

  const handlePointerUp = () => {
      if (gameState !== 'drawing') return;
      setGameState('flying');
      isDrawingRef.current = false;
      
      // Spawn and shoot arrow
      if (sceneRef.current && cameraRef.current) {
          const scene = sceneRef.current;
          
          if (activeArrowRef.current) {
              activeArrowRef.current.mesh.dispose();
              activeArrowRef.current.trail.dispose();
          }
          
          const arrowNode = MeshBuilder.CreateCylinder("arrow", {height: 1.2, diameter: 0.02}, scene);
          arrowNode.position = cameraRef.current.position.clone();
          arrowNode.position.y -= 0.2;
          arrowNode.position.z += 0.5;
          
          // Fletching (feathers)
          const fletch1 = MeshBuilder.CreatePlane("fletch", {width: 0.05, height: 0.15}, scene);
          fletch1.parent = arrowNode;
          fletch1.position.y = -0.55;
          fletch1.position.x = 0.02;
          fletch1.rotation.y = Math.PI/2;
          fletch1.material = new PBRMaterial("redFeather", scene);
          (fletch1.material as PBRMaterial).albedoColor = Color3.Red();
          (fletch1.material as PBRMaterial).roughness = 0.8;
          
          const fletch2 = fletch1.clone("fletch2");
          fletch2.position.x = -0.02;
          fletch2.rotation.y = -Math.PI/2;
          
          const mat = new PBRMaterial("arrMat", scene);
          mat.albedoColor = new Color3(0.1, 0.1, 0.1);
          mat.roughness = 0.4;
          mat.metallic = 0.6;
          arrowNode.material = mat;
          
          // Particle Trail
          const trail = new ParticleSystem("trail", 200, scene);
          // We can't guarantee external URL texture loads, so we use a base64 or basic particle
          // Wait, Babylon has default particle textures if we don't supply one? Actually we can supply a tiny generic texture or use the same URL. 
          // I'll stick to a default.
          trail.particleTexture = new Texture("https://models.babylonjs.com/Demos/WeaponsSystem/flare.png", scene);
          trail.emitter = arrowNode;
          trail.minEmitBox = new Vector3(-0.01, -0.6, -0.01);
          trail.maxEmitBox = new Vector3(0.01, -0.6, 0.01);
          trail.color1 = new Color3(1, 1, 1).toColor4(0.8);
          trail.color2 = new Color3(0.8, 0.8, 0.8).toColor4(0.2);
          trail.colorDead = new Color3(0, 0, 0).toColor4(0);
          trail.minSize = 0.05;
          trail.maxSize = 0.15;
          trail.minLifeTime = 0.1;
          trail.maxLifeTime = 0.3;
          trail.emitRate = 150;
          trail.blendMode = ParticleSystem.BLENDMODE_ADD;
          trail.start();
          
          // Initial Velocity
          const force = 30 + (drawPowerRef.current * 40); // m/s
          const forward = cameraRef.current.getDirection(new Vector3(0, 0, 1));
          
          // Adjust for gravity drop by aiming slightly up
          forward.y += 0.05; 
          
          activeArrowRef.current = {
              mesh: arrowNode,
              velocity: forward.scale(force),
              trail,
              isStuck: false
          };
      }
  };
  
  const resetShot = () => {
      setGameState('idle');
      setPower(0);
      setResultMessage('');
      isDrawingRef.current = false;
      drawPowerRef.current = 0;
      
      // Advance turns
      if (mode !== 'solo') {
          if (matchState.current.currentPlayer === 1) {
              matchState.current.currentPlayer = 2;
              setCurrentPlayer(2);
              
              if (mode === 'vs-ai') {
                  setTimeout(() => simulateAITurn(), 1000);
              }
          } else {
              matchState.current.currentPlayer = 1;
              setCurrentPlayer(1);
              matchState.current.round++;
              setRound(matchState.current.round);
              if (matchState.current.round > maxRounds) {
                  setGameState('result');
                  const w = matchState.current.p1Score >= matchState.current.p2Score ? 'Player 1' : (mode === 'vs-ai' ? 'AI' : 'Player 2');
                  setResultMessage(`Match Over! ${w} Wins!`);
                  return;
              }
          }
      }
      
      // Reset Wind
      const wX = (Math.random() - 0.5) * 8;
      setWind(parseFloat(wX.toFixed(1)));
      
      // Reset Camera with smooth animation
      if (cameraRef.current && sceneRef.current) {
          const cam = cameraRef.current;
          
          // Create smooth transition back using Bezier Ease
          const ease = new BezierCurveEase(0.2, 0.8, 0.2, 1);
          ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
          Animation.CreateAndStartAnimation("camReset", cam, "position", 60, 30, cam.position, new Vector3(0, 1.8, -10), 2, ease);
          
          setTimeout(() => {
              cam.setTarget(new Vector3(0, 1.5, targetDist));
          }, 500);
      }
      
      if (activeArrowRef.current) {
          // Fade out old arrow instead of instant delete
          const arr = activeArrowRef.current;
          setTimeout(() => {
              arr.mesh.dispose();
              arr.trail.dispose();
          }, 2000);
          activeArrowRef.current = null;
      }
  };

  const simulateAITurn = () => {
      if (matchState.current.currentPlayer !== 2 || mode !== 'vs-ai') return;
      
      setGameState('drawing');
      isDrawingRef.current = true;
      drawPowerRef.current = 0;
      
      // AI "draws" bow
      const aiPower = 0.8 + Math.random() * 0.15;
      const drawInt = setInterval(() => {
          if (drawPowerRef.current >= aiPower) {
              clearInterval(drawInt);
              handlePointerUp(); // AI releases
          } else {
              drawPowerRef.current += 0.05;
              setPower(Math.floor(drawPowerRef.current * 100));
          }
      }, 50);
  };

  return (
    <GameFrame 
      title="Archery 3D Master" 
      onClose={onClose} 
      score={Math.max(p1Score, p2Score)} 
      level={round}
    >
      <div 
        className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-cyan-400 font-bold animate-pulse text-xl">Loading Next-Gen Graphics...</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full flex-1 outline-none cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
        
        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl">
                <p className="text-white text-sm font-medium tracking-wide">MODE: {mode.toUpperCase()}</p>
                <p className="text-white text-sm font-medium tracking-wide">ROUND: {round}/{maxRounds}</p>
                <div className="flex gap-6 mt-3">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-400">P1 SCORE</span>
                        <p className={`text-2xl font-black ${currentPlayer === 1 ? 'text-cyan-400' : 'text-gray-300'}`}>{p1Score}</p>
                    </div>
                    {mode !== 'solo' && (
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-400">{mode === 'vs-ai' ? 'AI' : 'P2'} SCORE</span>
                        <p className={`text-2xl font-black ${currentPlayer === 2 ? 'text-red-400' : 'text-gray-300'}`}>
                            {p2Score}
                        </p>
                    </div>
                    )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <div className="text-gray-300 text-sm font-semibold">WIND:</div>
                    <div className="flex items-center gap-1">
                        <span className="text-white font-bold">{Math.abs(wind)} m/s</span>
                        <span className="text-xl">{wind > 0 ? '➡️' : wind < 0 ? '⬅️' : '➖'}</span>
                    </div>
                </div>
            </div>
        </div>

        {gameState === 'idle' && !loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-black/80 pointer-events-none">
                {round === 1 && currentPlayer === 1 && (
                    <div className="flex gap-4 mb-8 pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); setMode('solo'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-6 py-3 rounded-xl font-black tracking-wider transition-transform active:scale-95 ${mode === 'solo' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>SOLO</button>
                        <button onClick={(e) => { e.stopPropagation(); setMode('pass-and-play'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-6 py-3 rounded-xl font-black tracking-wider transition-transform active:scale-95 ${mode === 'pass-and-play' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>PASS & PLAY</button>
                        <button onClick={(e) => { e.stopPropagation(); setMode('vs-ai'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-6 py-3 rounded-xl font-black tracking-wider transition-transform active:scale-95 ${mode === 'vs-ai' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>VS AI</button>
                    </div>
                )}
                <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 shadow-2xl animate-pulse">
                    <p className="text-white font-bold text-xl text-center">
                        {mode !== 'solo' && <span className="block text-cyan-400 mb-2">Player {currentPlayer}'s Turn</span>}
                        Hold Click to Draw • Release to Shoot
                    </p>
                </div>
            </div>
        )}

        {gameState === 'drawing' && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 w-80 pointer-events-none">
                <p className="text-center text-white font-black tracking-widest mb-3 text-lg drop-shadow-md">DRAW POWER</p>
                <div className="w-full h-6 bg-black/60 backdrop-blur rounded-full border-2 border-white/30 overflow-hidden p-1 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div 
                        className="h-full rounded-full transition-all duration-75 relative overflow-hidden"
                        style={{ 
                            width: `${power}%`,
                            background: `linear-gradient(90deg, #4ade80, #facc15, #ef4444)`
                        }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite_linear] bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full" />
                    </div>
                </div>
            </div>
        )}
        
        {gameState === 'result' && (
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-black/80 p-10 rounded-3xl border border-white/10 flex flex-col items-center transform transition-all animate-[popIn_0.3s_ease-out]">
                    <h2 className={`text-6xl font-black drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] mb-8 text-center ${resultMessage.includes('Bullseye') ? 'text-yellow-400' : 'text-white'}`}>
                        {resultMessage}
                    </h2>
                    {!resultMessage.includes('Match Over') && (
                        <button 
                            onClick={resetShot}
                            className="pointer-events-auto px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black text-xl rounded-2xl transition-all active:scale-95 shadow-[0_0_40px_rgba(6,182,212,0.6)]"
                        >
                            NEXT ARROW
                        </button>
                    )}
                </div>
            </div>
        )}
        
        {/* Advanced Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none opacity-70 mix-blend-difference transition-transform duration-200" style={{ transform: `translate(-50%, -50%) scale(${gameState === 'drawing' ? 1 - power/200 : 1})` }}>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white -translate-x-1/2" />
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white -translate-y-1/2" />
            <div className="absolute inset-3 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </GameFrame>
  );
}
