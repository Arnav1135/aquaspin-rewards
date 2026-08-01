import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chess3DScene } from './chess/scene';
import { UIOverlay } from './components/UIOverlay';
import { AIDifficulty, AmbientMode, CameraPreset, CapturedPieces, GameMode, MaterialTheme, MoveRecord, PieceColor } from './types';
import { computeAIMove } from './chess/aiController';
import { OnlineMultiplayerManager } from './chess/onlineMultiplayer';
import { GameModeController } from './chess/gameModeController';
import { soundFx } from './audio/sound';

const modeCtrl = new GameModeController();

export default function App({ onClose }: { onClose?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const chessRef = useRef<Chess>(new Chess());
  const sceneRef = useRef<Chess3DScene | null>(null);
  const onlineRef = useRef<OnlineMultiplayerManager | null>(null);

  // Game state
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ w: [], b: [] });

  const [gameMode, setGameMode] = useState<GameMode>(modeCtrl.getMode());
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(modeCtrl.getDifficulty());
  const [userColor, setUserColor] = useState<PieceColor>(modeCtrl.getUserColor());

  const [materialTheme, setMaterialTheme] = useState<MaterialTheme>('wood-bronze');
  const [ambientMode, setAmbientMode] = useState<AmbientMode>('none');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [fps, setFps] = useState<number>(60);
  const [qualityTier, setQualityTier] = useState<string>('high');

  // Mode specific overlays & modals
  const [showModeModal, setShowModeModal] = useState<boolean>(true);
  const [handoffToast, setHandoffToast] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<string | null>(null);

  const [promotionModal, setPromotionModal] = useState<{
    from: string;
    to: string;
    callback: (promo: string) => void;
  } | null>(null);

  // Helper to sync state from chess engine
  const updateGameStateFromEngine = useCallback(() => {
    const chess = chessRef.current;
    const currentTurn = chess.turn();
    setTurn(currentTurn);
    setIsCheck(chess.inCheck());

    // Verify visual 3D scene piece positions align with internal chess.js engine state
    if (sceneRef.current) {
      sceneRef.current.verifyEngineSync();
    }

    if (chess.isGameOver()) {
      setIsGameOver(true);
      if (chess.isCheckmate()) {
        const winner = currentTurn === 'w' ? 'Black' : 'White';
        setGameOverReason(`Checkmate! ${winner} Wins`);
      } else if (chess.isDraw()) {
        setGameOverReason('Game Draw (Stalemate / Repetition)');
      } else {
        setGameOverReason('Game Over');
      }
    }
  }, []);

  // Initialize 3D Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const chess = chessRef.current;

    const scene = new Chess3DScene(mountRef.current, chess, {
      onMove: (moveRec: MoveRecord) => {
        setMoveHistory(prev => [...prev, moveRec]);

        if (moveRec.captured) {
          const victimColor = moveRec.color === 'w' ? 'b' : 'w';
          setCapturedPieces(prev => ({
            ...prev,
            [victimColor]: [...prev[victimColor], moveRec.captured!],
          }));
        }

        updateGameStateFromEngine();

        // Broadcast if in online mode
        if (onlineRef.current) {
          onlineRef.current.broadcastMove(moveRec);
        }

        // Pass & Play Handoff Banner
        if (sceneRef.current?.currentGameMode === 'pvp') {
          const nextTurnColor = chess.turn() === 'w' ? 'White' : 'Black';
          setHandoffToast(`Pass the device — ${nextTurnColor}'s turn`);
          setTimeout(() => setHandoffToast(null), 2500);
        }
      },
      onPromotion: (from, to, callback) => {
        setPromotionModal({
          from,
          to,
          callback: (promoChoice: string) => {
            setPromotionModal(null);
            callback(promoChoice);
          },
        });
      },
      onStateChange: () => {
        updateGameStateFromEngine();
      },
    });

    sceneRef.current = scene;
    scene.setGameMode(gameMode, userColor);
    setQualityTier(scene.getQualityTier());

    const fpsInterval = setInterval(() => {
      if (sceneRef.current) {
        setFps(sceneRef.current.getFPS());
      }
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
      scene.destroy();
      sceneRef.current = null;
    };
  }, [updateGameStateFromEngine]);

  // Screen Wake Lock API management
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && !isGameOver) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        } catch {
          // Wake lock request failed (e.g. battery saver or tab inactive)
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isGameOver) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isGameOver]);

  // Sync turn locking and game mode camera configuration
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setGameMode(gameMode, userColor);
  }, [gameMode, userColor]);

  // AI Move Loop Trigger
  useEffect(() => {
    if (isGameOver || gameMode !== 'ai') return;

    const isAITurn = turn !== userColor;

    if (isAITurn) {
      setAiThinking(true);
      const timer = setTimeout(async () => {
        const aiMove = await computeAIMove(chessRef.current, aiDifficulty);
        setAiThinking(false);
        if (aiMove && sceneRef.current) {
          sceneRef.current.executeMove(aiMove.from, aiMove.to, aiMove.promotion);
        }
      }, 600);

      return () => {
        clearTimeout(timer);
        setAiThinking(false);
      };
    }
  }, [turn, gameMode, aiDifficulty, userColor, isGameOver]);

  // Online Multiplayer Setup
  const handleCreateOnlineRoom = () => {
    if (onlineRef.current) onlineRef.current.disconnect();

    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const online = new OnlineMultiplayerManager({
      onMoveReceived: (moveRec: MoveRecord) => {
        if (sceneRef.current) {
          sceneRef.current.executeMove(moveRec.from, moveRec.to, moveRec.promotion);
        }
      },
      onStatusChange: (status: string) => {
        setOnlineStatus(status);
      },
    });

    const room = online.connectToRoom(code, true);
    onlineRef.current = online;
    setOnlineRoomCode(room);
    setGameMode('online');
    modeCtrl.setMode('online');
  };

  const handleJoinOnlineRoom = (code: string) => {
    if (onlineRef.current) onlineRef.current.disconnect();

    const online = new OnlineMultiplayerManager({
      onMoveReceived: (moveRec: MoveRecord) => {
        if (sceneRef.current) {
          sceneRef.current.executeMove(moveRec.from, moveRec.to, moveRec.promotion);
        }
      },
      onStatusChange: (status: string) => {
        setOnlineStatus(status);
      },
    });

    const room = online.connectToRoom(code, false);
    onlineRef.current = online;
    setOnlineRoomCode(room);
    setGameMode('online');
    modeCtrl.setMode('online');
  };

  // Actions
  const handleSetGameMode = (mode: GameMode, diff?: AIDifficulty, color: PieceColor = 'w') => {
    soundFx.playClick();
    setGameMode(mode);
    if (diff) setAiDifficulty(diff);
    setUserColor(color);
    modeCtrl.setMode(mode, diff, color);

    chessRef.current.reset();
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setIsGameOver(false);
    setGameOverReason('');
    setPromotionModal(null);
    setHandoffToast(null);

    if (sceneRef.current) {
      sceneRef.current.syncPiecesFromEngine();
      sceneRef.current.setGameMode(mode, color);
    }

    updateGameStateFromEngine();
  };

  const handleSetAiDifficulty = (diff: AIDifficulty) => {
    soundFx.playClick();
    setAiDifficulty(diff);
    modeCtrl.setMode(gameMode, diff, userColor);
  };

  const handleSetTheme = (theme: MaterialTheme) => {
    soundFx.playClick();
    setMaterialTheme(theme);
    if (sceneRef.current) {
      sceneRef.current.setTheme(theme);
    }
  };

  const handleSetAmbientMode = (mode: AmbientMode) => {
    soundFx.playClick();
    setAmbientMode(mode);
    soundFx.setAmbientMode(mode);
  };

  const handleSetCameraPreset = (preset: CameraPreset) => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(preset);
    }
  };

  const handleRotateCameraLeft = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.rotateCameraLeft();
    }
  };

  const handleRotateCameraRight = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.rotateCameraRight();
    }
  };

  const handleResetCamera = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  };

  const handleFlipBoard = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.flipBoard();
    }
  };

  const handleToggleSound = () => {
    const newState = soundFx.toggleSound();
    setSoundEnabled(newState);
  };

  const handleNewGame = () => {
    soundFx.playClick();
    chessRef.current.reset();
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setIsGameOver(false);
    setGameOverReason('');
    setPromotionModal(null);
    setHandoffToast(null);

    if (sceneRef.current) {
      sceneRef.current.syncPiecesFromEngine();
      sceneRef.current.setGameMode(gameMode, userColor);
    }

    updateGameStateFromEngine();
  };

  const handleUndoMove = () => {
    soundFx.playClick();
    const chess = chessRef.current;
    const undoCount = gameMode === 'ai' ? 2 : 1;

    for (let i = 0; i < undoCount; i++) {
      if (chess.history().length > 0) {
        chess.undo();
      }
    }

    setMoveHistory(prev => prev.slice(0, Math.max(0, prev.length - undoCount)));
    setIsGameOver(false);
    setGameOverReason('');

    if (sceneRef.current) {
      sceneRef.current.syncPiecesFromEngine();
      if (gameMode === 'pvp') {
        sceneRef.current.flipBoard(chess.turn());
      }
    }

    updateGameStateFromEngine();
  };

  const handleHint = () => {
    soundFx.playClick();
    computeAIMove(chessRef.current, 'hard').then(bestMove => {
      if (bestMove) {
        alert(`💡 Recommended Move: ${bestMove.from.toUpperCase()} ➔ ${bestMove.to.toUpperCase()}`);
      }
    });
  };

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-[#D2D1CD] font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing touch-none" />

      {/* HTML/CSS Interactive UI Overlays */}
      <UIOverlay
        turn={turn}
        isCheck={isCheck}
        isGameOver={isGameOver}
        gameOverReason={gameOverReason}
        moveHistory={moveHistory}
        capturedPieces={capturedPieces}
        gameMode={gameMode}
        aiDifficulty={aiDifficulty}
        userColor={userColor}
        materialTheme={materialTheme}
        ambientMode={ambientMode}
        soundEnabled={soundEnabled}
        qualityTier={qualityTier}
        fps={fps}
        handoffToast={handoffToast}
        aiThinking={aiThinking}
        onlineRoomCode={onlineRoomCode}
        onlineStatus={onlineStatus}
        showModeModal={showModeModal}
        onCloseModeModal={() => setShowModeModal(false)}
        onOpenModeModal={() => setShowModeModal(true)}
        onSetGameMode={handleSetGameMode}
        onSetAiDifficulty={handleSetAiDifficulty}
        onCreateOnlineRoom={handleCreateOnlineRoom}
        onJoinOnlineRoom={handleJoinOnlineRoom}
        onSetTheme={handleSetTheme}
        onSetAmbientMode={handleSetAmbientMode}
        onSetCameraPreset={handleSetCameraPreset}
        onRotateCameraLeft={handleRotateCameraLeft}
        onRotateCameraRight={handleRotateCameraRight}
        onResetCamera={handleResetCamera}
        onFlipBoard={handleFlipBoard}
        onToggleSound={handleToggleSound}
        onNewGame={handleNewGame}
        onUndoMove={handleUndoMove}
        onHint={handleHint}
        promotionModal={promotionModal}
        onClose={onClose}
      />
    </div>
  );
}
