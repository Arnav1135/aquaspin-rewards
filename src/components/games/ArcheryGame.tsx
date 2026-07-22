import { useEffect, useRef, useState } from 'react';
import { 
    Engine, Scene, Vector3, HemisphericLight, MeshBuilder, FreeCamera, 
    StandardMaterial, Color3, DirectionalLight, ShadowGenerator,
    DefaultRenderingPipeline
} from '@babylonjs/core';
import { PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { GameFrame } from './GameFrame';
import { StabilityManager } from '../../games/archery/StabilityManager';
import { ECSEngine } from '../../games/archery/ecs/ECSEngine';
import { Entity } from '../../games/archery/ecs/Entity';
import { InputControllerComponent } from '../../games/archery/ecs/components';

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
  const arrowRef = useRef<any>(null);
  const cameraRef = useRef<FreeCamera | null>(null);
  const inputState = useRef(new InputControllerComponent());
  
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
    let ecs: ECSEngine;
    
    const initEngine = async () => {
      if (!canvasRef.current) return;
      
      engine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
      scene = new Scene(engine);
      sceneRef.current = scene;
      
      stabilityManager = new StabilityManager(engine, scene, (err) => {
         console.error("Critical Failure in Archery3D", err);
      });

      // Physics
      try {
          const havokInstance = await HavokPhysics();
          const hkPlugin = new HavokPlugin(true, havokInstance);
          scene.enablePhysics(new Vector3(0, -9.81, 0), hkPlugin);
      } catch (e) {
          console.error("Failed to init physics", e);
      }

      // Camera
      const camera = new FreeCamera("camera1", new Vector3(0, 1.8, -10), scene);
      camera.setTarget(new Vector3(0, 1.5, 70));
      cameraRef.current = camera;

      // Lighting
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.4;
      
      const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
      dirLight.position = new Vector3(20, 40, 20);
      dirLight.intensity = 0.8;
      
      const shadowGenerator = new ShadowGenerator(1024, dirLight);

      // Materials
      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new Color3(0.1, 0.4, 0.1);

      const targetMatRed = new StandardMaterial("red", scene);
      targetMatRed.diffuseColor = new Color3(0.8, 0.1, 0.1);
      const targetMatWhite = new StandardMaterial("white", scene);
      targetMatWhite.diffuseColor = new Color3(0.9, 0.9, 0.9);
      const targetMatBlue = new StandardMaterial("blue", scene);
      targetMatBlue.diffuseColor = new Color3(0.1, 0.3, 0.8);
      const targetMatGold = new StandardMaterial("gold", scene);
      targetMatGold.diffuseColor = new Color3(0.9, 0.8, 0.1);

      // Ground
      const ground = MeshBuilder.CreateGround("ground", {width: 200, height: 200}, scene);
      ground.material = groundMat;
      ground.receiveShadows = true;
      new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.1 }, scene);

      // Target Setup (70m distance)
      const targetDist = 70;
      const targetGroup = MeshBuilder.CreateCylinder("targetBase", {height: 0.2, diameter: 2.4}, scene);
      targetGroup.rotation.x = Math.PI / 2;
      targetGroup.position.set(0, 1.5, targetDist);
      targetGroup.material = targetMatWhite;
      shadowGenerator.addShadowCaster(targetGroup);
      
      // Target physics
      new PhysicsAggregate(targetGroup, PhysicsShapeType.CYLINDER, { mass: 0, restitution: 0.05 }, scene);

      // Inner rings
      const ring1 = MeshBuilder.CreateCylinder("r1", {height: 0.22, diameter: 1.6}, scene);
      ring1.parent = targetGroup;
      ring1.material = targetMatBlue;
      
      const ring2 = MeshBuilder.CreateCylinder("r2", {height: 0.24, diameter: 0.8}, scene);
      ring2.parent = targetGroup;
      ring2.material = targetMatRed;
      
      const ring3 = MeshBuilder.CreateCylinder("r3", {height: 0.26, diameter: 0.4}, scene);
      ring3.parent = targetGroup;
      ring3.material = targetMatGold;

      // Post Processing Pipeline
      const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
      pipeline.samples = 4;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.8;
      pipeline.bloomWeight = 0.5;
      pipeline.depthOfFieldEnabled = true;
      pipeline.depthOfField.focusDistance = 7000;
      pipeline.depthOfField.focalLength = 50;
      pipeline.depthOfField.fStop = 1.4;

      // Setup ECS
      ecs = new ECSEngine();
      const playerEntity = new Entity('player');
      playerEntity.addComponent('InputControllerComponent', inputState.current);
      ecs.addEntity(playerEntity);

      // Wind
      const wX = (Math.random() - 0.5) * 8; // m/s
      setWind(parseFloat(wX.toFixed(1)));

      setLoading(false);
      
      // Update logic via observable instead of custom render loop
      scene.onBeforeRenderObservable.add(() => {
          const dt = engine.getDeltaTime();
          ecs.update(dt);
          
          // Arrow Camera Follow
          if (arrowRef.current && inputState.current.state === 'released') {
              const arrPos = arrowRef.current.position;
              // Lerp camera behind arrow
              const targetCamPos = new Vector3(arrPos.x, arrPos.y + 0.5, arrPos.z - 3);
              camera.position = Vector3.Lerp(camera.position, targetCamPos, 0.1);
              camera.setTarget(arrPos);
              
              // Apply wind
              const body = arrowRef.current.physicsBody;
              if (body) {
                  body.applyForce(new Vector3(wX * 0.05, 0, 0), arrPos);
              }
              
              // Collision / stuck check
              if (arrPos.z >= targetDist - 0.2 || arrPos.y <= 0.1) {
                  inputState.current.state = 'idle';
                  setGameState('result');
                  
                  // Calculate score
                  const dx = arrPos.x - targetGroup.position.x;
                  const dy = arrPos.y - targetGroup.position.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  
                  let points = 0;
                  if (arrPos.y <= 0.1) {
                      setResultMessage("Missed! (Hit the ground)");
                  } else if (dist <= 0.2) {
                      setResultMessage("Bullseye! 10 Points");
                      points = 10;
                  } else if (dist <= 0.4) {
                      setResultMessage("9 Points");
                      points = 9;
                  } else if (dist <= 0.8) {
                      setResultMessage("7 Points");
                      points = 7;
                  } else if (dist <= 1.2) {
                      setResultMessage("5 Points");
                      points = 5;
                  } else {
                      setResultMessage("Missed the target!");
                  }
                  
                  if (matchState.current.currentPlayer === 1) {
                      matchState.current.p1Score += points;
                      setP1Score(matchState.current.p1Score);
                  } else {
                      matchState.current.p2Score += points;
                      setP2Score(matchState.current.p2Score);
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

  const handlePointerDown = () => {
      if (gameState !== 'idle') return;
      setGameState('drawing');
      setResultMessage('');
      inputState.current.state = 'drawing';
      inputState.current.drawPower = 0;
      
      // Power bar incrementer
      const interval = setInterval(() => {
          if (inputState.current.state === 'drawing') {
             let p = inputState.current.drawPower + 0.02;
             if (p > 1) p = 1;
             inputState.current.drawPower = p;
             setPower(Math.floor(p * 100));
          } else {
             clearInterval(interval);
          }
      }, 16);
  };

  const handlePointerUp = () => {
      if (gameState !== 'drawing') return;
      setGameState('flying');
      inputState.current.state = 'released';
      
      // Spawn and shoot arrow
      if (sceneRef.current && cameraRef.current) {
          const scene = sceneRef.current;
          
          // Clean up old arrow if exists
          if (arrowRef.current) {
              arrowRef.current.dispose();
          }
          
          const arrow = MeshBuilder.CreateCylinder("arrow", {height: 0.8, diameter: 0.02}, scene);
          arrow.rotation.x = Math.PI / 2;
          arrow.position = cameraRef.current.position.clone();
          arrow.position.y -= 0.2;
          arrow.position.z += 0.5;
          
          const mat = new StandardMaterial("arrMat", scene);
          mat.diffuseColor = new Color3(0.2, 0.2, 0.2);
          arrow.material = mat;
          
          const agg = new PhysicsAggregate(arrow, PhysicsShapeType.CYLINDER, { mass: 0.05, restitution: 0.1 }, scene);
          arrowRef.current = arrow;
          
          // Apply impulse based on power
          const force = 100 + (inputState.current.drawPower * 100);
          const forward = cameraRef.current.getDirection(new Vector3(0, 0, 1));
          
          // Adjust for gravity drop by aiming slightly up
          forward.y += 0.05; 
          
          agg.body.applyImpulse(forward.scale(force), arrow.position);
      }
  };
  
  const resetShot = () => {
      setGameState('idle');
      setPower(0);
      setResultMessage('');
      inputState.current.state = 'idle';
      
      // Advance turns
      if (mode !== 'solo') {
          if (matchState.current.currentPlayer === 1) {
              matchState.current.currentPlayer = 2;
              setCurrentPlayer(2);
              
              if (mode === 'vs-ai') {
                  // AI Turn Simulation
                  setTimeout(() => simulateAITurn(), 1500);
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
      
      if (cameraRef.current) {
          cameraRef.current.position = new Vector3(0, 1.8, -10);
          cameraRef.current.setTarget(new Vector3(0, 1.5, 70));
      }
      
      if (arrowRef.current) {
          arrowRef.current.dispose();
          arrowRef.current = null;
      }
  };

  const simulateAITurn = () => {
      if (matchState.current.currentPlayer !== 2 || mode !== 'vs-ai') return;
      
      // AI "draws" bow
      setGameState('drawing');
      inputState.current.state = 'drawing';
      inputState.current.drawPower = 0.8 + Math.random() * 0.15; // AI is pretty good
      setPower(Math.floor(inputState.current.drawPower * 100));
      
      setTimeout(() => {
          handlePointerUp(); // AI releases
      }, 1000);
  };

  return (
    <GameFrame 
      title="Archery 3D" 
      onClose={onClose} 
      score={Math.max(p1Score, p2Score)} 
      level={round}
    >
      <div 
        className="relative w-full h-full flex flex-col bg-black overflow-hidden select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80">
            <span className="text-4xl animate-bounce mb-4">🏹</span>
            <p className="text-cyan-400 font-bold animate-pulse">Initializing Babylon WebGPU & Havok...</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full flex-1 outline-none cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
        
        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur border border-white/10 p-4 rounded-xl">
                <p className="text-white text-sm">Mode: {mode.toUpperCase()}</p>
                <p className="text-white text-sm">Round: {round}/{maxRounds}</p>
                <div className="flex gap-4 mt-2">
                    <div>
                        <p className={`font-bold ${currentPlayer === 1 ? 'text-cyan-400' : 'text-gray-400'}`}>P1: {p1Score}</p>
                    </div>
                    {mode !== 'solo' && (
                    <div>
                        <p className={`font-bold ${currentPlayer === 2 ? 'text-cyan-400' : 'text-gray-400'}`}>
                            {mode === 'vs-ai' ? 'AI' : 'P2'}: {p2Score}
                        </p>
                    </div>
                    )}
                </div>
                <p className="text-gray-300 text-sm mt-2">Wind: {wind} m/s {wind > 0 ? '→' : '←'}</p>
            </div>
        </div>

        {gameState === 'idle' && !loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                {round === 1 && currentPlayer === 1 && (
                    <div className="flex gap-4 mb-8 pointer-events-auto">
                        <button onClick={() => { setMode('solo'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-4 py-2 rounded-lg font-bold ${mode === 'solo' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-white'}`}>Solo</button>
                        <button onClick={() => { setMode('pass-and-play'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-4 py-2 rounded-lg font-bold ${mode === 'pass-and-play' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-white'}`}>Pass & Play</button>
                        <button onClick={() => { setMode('vs-ai'); matchState.current.p1Score = 0; matchState.current.p2Score = 0; setP1Score(0); setP2Score(0); }} className={`px-4 py-2 rounded-lg font-bold ${mode === 'vs-ai' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-white'}`}>Vs AI</button>
                    </div>
                )}
                <p className="text-white font-bold bg-black/50 px-6 py-3 rounded-full text-lg border border-white/20 pointer-events-none">
                    {mode !== 'solo' && `Player ${currentPlayer}'s Turn: `}Hold Click to Draw, Release to Shoot
                </p>
            </div>
        )}

        {gameState === 'drawing' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-64 pointer-events-none">
                <p className="text-center text-white font-bold mb-2 text-sm shadow-sm">DRAW POWER</p>
                <div className="w-full h-4 bg-black/50 rounded-full border border-white/20 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-75"
                        style={{ width: `${power}%` }}
                    />
                </div>
            </div>
        )}
        
        {gameState === 'result' && (
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                <h2 className="text-4xl font-black text-white drop-shadow-lg mb-4">{resultMessage}</h2>
                <button 
                    onClick={resetShot}
                    className="pointer-events-auto px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-transform active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                    Next Arrow
                </button>
            </div>
        )}
        
        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-50">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white -translate-x-1/2" />
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white -translate-y-1/2" />
            <div className="absolute inset-2 border border-white rounded-full" />
        </div>
      </div>
    </GameFrame>
  );
}
