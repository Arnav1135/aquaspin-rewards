import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Bot,
  Users,
  Lightbulb,
  ShieldAlert,
  Headphones,
  X,
  List,
  Gamepad2,
  Repeat,
  Activity,
  Globe,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { AIDifficulty, AmbientMode, CameraPreset, CapturedPieces, GameMode, MaterialTheme, MoveRecord, PieceColor, PieceType } from '../types';
import { soundFx } from '../audio/sound';

interface UIOverlayProps {
  turn: 'w' | 'b';
  isCheck: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  moveHistory: MoveRecord[];
  capturedPieces: CapturedPieces;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  userColor?: PieceColor;
  materialTheme: MaterialTheme;
  ambientMode: AmbientMode;
  soundEnabled: boolean;
  qualityTier?: string;
  fps?: number;
  handoffToast?: string | null;
  aiThinking?: boolean;
  onlineRoomCode?: string | null;
  onlineStatus?: string | null;
  showModeModal: boolean;
  onCloseModeModal: () => void;
  onOpenModeModal: () => void;
  onSetGameMode: (mode: GameMode, diff?: AIDifficulty, color?: PieceColor) => void;
  onSetAiDifficulty?: (diff: AIDifficulty) => void;
  onJoinOnlineRoom: (code: string) => void;
  onCreateOnlineRoom: () => void;
  onSetTheme: (theme: MaterialTheme) => void;
  onSetAmbientMode: (mode: AmbientMode) => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  onRotateCameraLeft?: () => void;
  onRotateCameraRight?: () => void;
  onResetCamera?: () => void;
  onFlipBoard?: () => void;
  onToggleSound: () => void;
  onNewGame: () => void;
  onUndoMove: () => void;
  onHint: () => void;
  promotionModal: { from: string; to: string; callback: (promo: string) => void } | null;
  onClose?: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  turn,
  isCheck,
  isGameOver,
  gameOverReason,
  moveHistory,
  capturedPieces,
  gameMode,
  aiDifficulty,
  userColor = 'w',
  materialTheme,
  ambientMode,
  soundEnabled,
  qualityTier = 'high',
  fps = 60,
  handoffToast,
  aiThinking,
  onlineRoomCode,
  onlineStatus,
  showModeModal,
  onCloseModeModal,
  onOpenModeModal,
  onSetGameMode,
  onSetAiDifficulty,
  onJoinOnlineRoom,
  onCreateOnlineRoom,
  onSetTheme,
  onSetAmbientMode,
  onSetCameraPreset,
  onRotateCameraLeft,
  onRotateCameraRight,
  onResetCamera,
  onFlipBoard,
  onToggleSound,
  onNewGame,
  onUndoMove,
  onHint,
  promotionModal,
  onClose,
}) => {
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'mode' | 'moves'>('none');
  const [showFPS, setShowFPS] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [selectedAiDiff, setSelectedAiDiff] = useState<AIDifficulty>(aiDifficulty);
  const [selectedUserColor, setSelectedUserColor] = useState<PieceColor>(userColor);
  const [copiedCode, setCopiedCode] = useState(false);

  // GSAP Animation Refs
  const modeModalBackdropRef = useRef<HTMLDivElement>(null);
  const modeModalBoxRef = useRef<HTMLDivElement>(null);
  const gameOverBoxRef = useRef<HTMLDivElement>(null);
  const promotionBoxRef = useRef<HTMLDivElement>(null);
  const handoffToastRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // GSAP Mode Selection Modal Transition
  useEffect(() => {
    if (showModeModal) {
      if (modeModalBackdropRef.current) {
        gsap.fromTo(modeModalBackdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      }
      if (modeModalBoxRef.current) {
        gsap.fromTo(
          modeModalBoxRef.current,
          { opacity: 0, scale: 0.88, y: 30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' }
        );
      }
    }
  }, [showModeModal]);

  // GSAP Game Over Modal Transition
  useEffect(() => {
    if (isGameOver && gameOverBoxRef.current) {
      gsap.fromTo(
        gameOverBoxRef.current,
        { opacity: 0, scale: 0.85, y: 25 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.4)' }
      );
    }
  }, [isGameOver]);

  // GSAP Pawn Promotion Modal Transition
  useEffect(() => {
    if (promotionModal && promotionBoxRef.current) {
      gsap.fromTo(
        promotionBoxRef.current,
        { opacity: 0, scale: 0.82, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' }
      );
    }
  }, [promotionModal]);

  // GSAP Handoff Toast Transition
  useEffect(() => {
    if (handoffToast && handoffToastRef.current) {
      gsap.fromTo(
        handoffToastRef.current,
        { opacity: 0, y: -20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }
      );
    }
  }, [handoffToast]);

  // GSAP Mobile Drawer Transition
  useEffect(() => {
    if (mobileDrawer !== 'none' && mobileSheetRef.current) {
      gsap.fromTo(
        mobileSheetRef.current,
        { y: '100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [mobileDrawer]);

  // Material advantage score calculation
  const getPieceVal = (p: PieceType) => {
    switch (p) {
      case 'p': return 1;
      case 'n': return 3;
      case 'b': return 3;
      case 'r': return 5;
      case 'q': return 9;
      default: return 0;
    }
  };

  const whiteVal = capturedPieces.w.reduce((acc, p) => acc + getPieceVal(p), 0);
  const blackVal = capturedPieces.b.reduce((acc, p) => acc + getPieceVal(p), 0);
  const advScore = whiteVal - blackVal;

  const copyRoomCode = () => {
    if (onlineRoomCode) {
      navigator.clipboard.writeText(onlineRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-4 font-sans select-none overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
      {/* TOP BAR */}
      <header className="pointer-events-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-white/20 bg-slate-900/90 p-2.5 sm:p-3 shadow-2xl backdrop-blur-md">
        {/* Title & Status Bar Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 font-bold text-white shadow-lg text-sm sm:text-base">
              ♚
            </div>
            <div>
              <h1 className="text-xs sm:text-base font-black tracking-wider text-white flex items-center gap-2">
                3D CHESS
                {onClose && (
                  <button
                    onClick={onClose}
                    className="flex shrink-0 items-center justify-center rounded-md bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-2 py-0.5 text-[10px] font-bold uppercase transition"
                    title="Exit Game"
                  >
                    Exit
                  </button>
                )}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-300/90 font-medium">
                <span className="capitalize">{gameMode === 'pvp' ? 'Pass & Play' : gameMode === 'online' ? 'Online' : 'vs AI'}</span>
                {gameMode === 'ai' && (
                  <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/90 p-0.5 border border-emerald-500/30">
                    {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          soundFx.playClick();
                          if (onSetAiDifficulty) onSetAiDifficulty(d);
                          else onSetGameMode('ai', d, userColor);
                        }}
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold capitalize transition ${
                          aiDifficulty === d
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                        }`}
                        title={`Set AI Difficulty to ${d}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {showFPS && (
                  <span className="font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {fps} FPS ({qualityTier.toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Turn & Check Status */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] sm:text-xs font-semibold shadow-inner ${
                turn === 'w'
                  ? 'bg-amber-100 text-slate-900 border border-amber-300'
                  : 'bg-slate-800 text-amber-200 border border-slate-700'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${turn === 'w' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}
              />
              {turn === 'w' ? 'WHITE' : 'BLACK'}
            </div>

            {aiThinking && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-950/80 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-lg animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            )}

            {isCheck && (
              <div className="flex items-center gap-1 rounded-xl border border-red-500/50 bg-red-950/80 px-2 py-1 text-[11px] font-bold text-red-400 shadow-lg animate-bounce">
                <ShieldAlert className="h-3.5 w-3.5" />
                CHECK!
              </div>
            )}
          </div>
        </div>

        {/* Right Tools - Scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 sm:pb-0 no-scrollbar">
          {/* Change Mode Modal Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenModeModal();
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">Change Mode</span>
          </button>

          {/* Flip Board Button */}
          {onFlipBoard && (
            <button
              onClick={() => {
                soundFx.playClick();
                onFlipBoard();
              }}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
              title="Flip Board 180°"
            >
              <Repeat className="h-3 w-3 text-amber-400" />
              <span className="whitespace-nowrap">Flip</span>
            </button>
          )}

          {/* FPS Monitor Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              setShowFPS(!showFPS);
            }}
            className={`flex shrink-0 items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-medium transition ${
              showFPS
                ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-300'
                : 'border-white/10 bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
            title="Toggle Live FPS Counter"
          >
            <Activity className="h-3 w-3" />
            <span className="whitespace-nowrap">FPS</span>
          </button>

          {/* Ambient Soundscape Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              const nextMode: Record<AmbientMode, AmbientMode> = {
                'none': 'quiet-study',
                'quiet-study': 'tournament-hall',
                'tournament-hall': 'none',
              };
              onSetAmbientMode(nextMode[ambientMode]);
            }}
            className={`flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition ${
              ambientMode !== 'none'
                ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                : 'border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Toggle Ambient Background Soundscape"
          >
            <Headphones className={`h-3 w-3 ${ambientMode !== 'none' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">
              {ambientMode === 'none' && 'Ambient'}
              {ambientMode === 'quiet-study' && 'Study'}
              {ambientMode === 'tournament-hall' && 'Hall'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              onSetTheme(materialTheme === 'wood-bronze' ? 'marble-onyx' : 'wood-bronze');
            }}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
            title="Switch Material Theme"
          >
            <Layers className="h-3 w-3 text-amber-400" />
            <span className="whitespace-nowrap">{materialTheme === 'wood-bronze' ? 'Wood' : 'Marble'}</span>
          </button>

          {/* Camera Angles */}
          <div className="flex shrink-0 items-center rounded-xl border border-white/10 bg-slate-800/80 p-0.5">
            <button
              onClick={() => onSetCameraPreset('standard')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Standard Play View"
            >
              Std
            </button>
            <button
              onClick={() => onSetCameraPreset('close')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Close-Up Tactical View"
            >
              Close
            </button>
            <button
              onClick={() => onSetCameraPreset('overhead')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Overhead View"
            >
              Top
            </button>
            <button
              onClick={() => onSetCameraPreset('isometric')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Isometric 3/4 View"
            >
              Iso
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="shrink-0 rounded-xl border border-white/10 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Toggle Audio"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* HANDOFF TOAST BANNER FOR PASS & PLAY */}
      {handoffToast && (
        <div ref={handoffToastRef} className="pointer-events-auto mx-auto my-2 max-w-sm rounded-2xl border border-amber-500/50 bg-slate-900/95 p-3 text-center text-xs font-extrabold text-amber-300 shadow-2xl backdrop-blur-md">
          {handoffToast}
        </div>
      )}

      {/* ONLINE ROOM STATUS BADGE */}
      {gameMode === 'online' && onlineRoomCode && (
        <div className="pointer-events-auto mx-auto my-2 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md">
          <Globe className="h-4 w-4 text-emerald-400" />
          <span>Room Code: <strong className="font-mono text-amber-300">{onlineRoomCode}</strong></span>
          <button
            onClick={copyRoomCode}
            className="rounded-lg bg-slate-800 p-1 text-slate-300 hover:text-white"
            title="Copy Room Code"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onlineStatus && <span className="text-[10px] text-slate-400 font-normal">({onlineStatus})</span>}
        </div>
      )}

      {/* MOBILE COMPACT FLOATING DOCK (BELOW TOP HEADER - NON OBSTRUCTIVE) */}
      <div className="pointer-events-auto fixed top-[108px] left-2.5 z-30 flex sm:hidden items-center gap-1.5 rounded-2xl border border-white/20 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
        <button
          onClick={onUndoMove}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-amber-300 active:scale-95 transition"
          title="Undo Last Move"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {onResetCamera && (
          <button
            onClick={onResetCamera}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-amber-400 active:scale-95 transition"
            title="Reset Camera View to 45°"
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
        )}

        {onRotateCameraLeft && (
          <button
            onClick={onRotateCameraLeft}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 active:scale-95 transition"
            title="Rotate Left"
          >
            <span className="text-xs font-bold">↶</span>
          </button>
        )}

        {onRotateCameraRight && (
          <button
            onClick={onRotateCameraRight}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 active:scale-95 transition"
            title="Rotate Right"
          >
            <span className="text-xs font-bold">↷</span>
          </button>
        )}
      </div>

      {/* TABLET FLOATING QUICK DOCK ON LEFT EDGE (HIDDEN ON DESKTOP WHERE SIDEBAR IS VISIBLE) */}
      <div className="pointer-events-auto fixed left-3 bottom-8 z-30 hidden sm:flex md:hidden flex-col items-center gap-2">
        <button
          onClick={onUndoMove}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-amber-300 shadow-xl backdrop-blur-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition"
          title="Undo Last Move"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {onResetCamera && (
          <button
            onClick={onResetCamera}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-amber-400 shadow-xl backdrop-blur-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition"
            title="Reset Camera View to 45°"
          >
            <Repeat className="h-4 w-4" />
          </button>
        )}

        {onRotateCameraLeft && (
          <button
            onClick={onRotateCameraLeft}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-slate-200 shadow-lg backdrop-blur-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition"
            title="Rotate Board 45° Left"
          >
            <span className="text-sm font-bold">↶</span>
          </button>
        )}

        {onRotateCameraRight && (
          <button
            onClick={onRotateCameraRight}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-slate-200 shadow-lg backdrop-blur-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition"
            title="Rotate Board 45° Right"
          >
            <span className="text-sm font-bold">↷</span>
          </button>
        )}

        <button
          onClick={onOpenModeModal}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-white shadow-xl backdrop-blur-md hover:bg-slate-800 hover:scale-105 active:scale-95 transition"
          title="Game Menu & Modes"
        >
          <span className="text-xs font-bold font-mono">||</span>
        </button>
      </div>

      {/* DESKTOP MIDDLE SECTION: SIDEBARS */}
      <div className="hidden md:flex justify-between gap-4 py-4 overflow-hidden pointer-events-none">
        {/* LEFT SIDE: MODE & ACTIONS */}
        <div className="pointer-events-auto flex flex-col gap-2 w-48">
          <div className="rounded-2xl border border-white/15 bg-slate-900/85 p-3 backdrop-blur-md">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Game Mode</p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onSetGameMode('pvp')}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  gameMode === 'pvp' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Pass & Play
              </button>

              <button
                onClick={() => onSetGameMode('online')}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  gameMode === 'online' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                Multiplayer
              </button>

              <button
                onClick={() => onSetGameMode('ai', aiDifficulty, userColor)}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  gameMode === 'ai' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Bot className="h-3.5 w-3.5 text-emerald-400" />
                vs AI
              </button>

              {gameMode === 'ai' && (
                <div className="mt-1 flex flex-col gap-1 rounded-xl bg-slate-800/80 p-1.5 border border-emerald-500/20">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</span>
                    <span className="text-[10px] font-extrabold text-emerald-400 capitalize">{aiDifficulty}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          soundFx.playClick();
                          if (onSetAiDifficulty) onSetAiDifficulty(d);
                          else onSetGameMode('ai', d, userColor);
                        }}
                        className={`rounded-lg py-1 text-[10px] font-bold capitalize transition ${
                          aiDifficulty === d
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-300 bg-slate-900/60 hover:bg-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rounded-2xl border border-white/15 bg-slate-900/85 p-3 backdrop-blur-md flex flex-col gap-2">
            <button
              onClick={onNewGame}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Game
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onUndoMove}
                className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Undo
              </button>
              <button
                onClick={onHint}
                className="flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
              >
                <Lightbulb className="h-3 w-3" />
                Hint
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: MOVE HISTORY & CAPTURED PIECES */}
        <div className="pointer-events-auto flex flex-col gap-2 w-56">
          {/* Captured Pieces Bar */}
          <div className="rounded-2xl border border-white/15 bg-slate-900/85 p-2.5 backdrop-blur-md">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 mb-1">
              <span>Captured</span>
              {advScore !== 0 && (
                <span className={advScore > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  {advScore > 0 ? `White +${advScore}` : `Black +${Math.abs(advScore)}`}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1 min-h-[20px] text-amber-200">
                <span className="text-[10px] text-slate-500 w-3">W:</span>
                <div className="flex flex-wrap gap-0.5">
                  {capturedPieces.w.map((p, i) => (
                    <span key={i} className="text-sm">
                      {p === 'p' ? '♟' : p === 'n' ? '♞' : p === 'b' ? '♝' : p === 'r' ? '♜' : '♛'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 min-h-[20px] text-slate-400">
                <span className="text-[10px] text-slate-500 w-3">B:</span>
                <div className="flex flex-wrap gap-0.5">
                  {capturedPieces.b.map((p, i) => (
                    <span key={i} className="text-sm">
                      {p === 'p' ? '♙' : p === 'n' ? '♘' : p === 'b' ? '♗' : p === 'r' ? '♖' : '♕'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Move History Table */}
          <div className="flex-1 flex flex-col rounded-2xl border border-white/15 bg-slate-900/85 p-3 backdrop-blur-md max-h-60 overflow-hidden">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Move Log</p>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-xs text-slate-300 font-mono">
              {moveHistory.length === 0 ? (
                <p className="text-slate-500 italic text-[11px] text-center py-4">No moves played yet</p>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                  const whiteMove = moveHistory[idx * 2];
                  const blackMove = moveHistory[idx * 2 + 1];
                  return (
                    <div key={idx} className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-slate-500 w-6 text-right mr-2">{idx + 1}.</span>
                      <span className="w-16 font-semibold text-amber-200">{whiteMove?.san || ''}</span>
                      <span className="w-16 text-slate-400">{blackMove?.san || ''}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING BOTTOM DOCK */}
      <div className="md:hidden pointer-events-auto mt-auto flex items-center justify-between gap-1.5 rounded-2xl border border-white/20 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-lg">
        <button
          onClick={onUndoMove}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-slate-800/80 py-2 text-[10px] font-semibold text-slate-200 active:scale-95 transition"
        >
          <span className="text-xs">↩</span>
          Undo
        </button>

        <button
          onClick={onHint}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-[10px] font-semibold text-amber-300 active:scale-95 transition"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Hint
        </button>

        <button
          onClick={onNewGame}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-[10px] font-bold text-slate-950 active:scale-95 transition shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New
        </button>

        <button
          onClick={() => setMobileDrawer(mobileDrawer === 'moves' ? 'none' : 'moves')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 text-[10px] font-bold active:scale-95 transition ${
            mobileDrawer === 'moves'
              ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-sm'
              : 'border-white/10 bg-slate-800/80 text-slate-200'
          }`}
        >
          <List className="h-3.5 w-3.5" />
          Log
        </button>

        <button
          onClick={onOpenModeModal}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-400 bg-amber-500/20 py-2 text-[10px] font-bold text-amber-300 active:scale-95 transition"
        >
          <Gamepad2 className="h-3.5 w-3.5" />
          Mode
        </button>
      </div>

      {/* MOBILE MOVE HISTORY BOTTOM SHEET DRAWER */}
      {mobileDrawer === 'moves' && (
        <div className="md:hidden pointer-events-auto fixed inset-x-0 bottom-0 z-40 p-3 pt-0">
          <div
            ref={mobileSheetRef}
            className="rounded-3xl border border-amber-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 max-h-[50vh]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <List className="h-4 w-4" /> Move History & Captured
              </span>
              <button
                onClick={() => setMobileDrawer('none')}
                className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Captured Pieces Bar */}
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 bg-slate-800/60 p-2 rounded-xl">
              <div className="flex items-center gap-1 min-h-[18px] text-amber-200">
                <span className="text-slate-500">W:</span>
                {capturedPieces.w.map((p, i) => (
                  <span key={i} className="text-xs">
                    {p === 'p' ? '♟' : p === 'n' ? '♞' : p === 'b' ? '♝' : p === 'r' ? '♜' : '♛'}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 min-h-[18px] text-slate-400">
                <span className="text-slate-500">B:</span>
                {capturedPieces.b.map((p, i) => (
                  <span key={i} className="text-xs">
                    {p === 'p' ? '♙' : p === 'n' ? '♘' : p === 'b' ? '♗' : p === 'r' ? '♖' : '♕'}
                  </span>
                ))}
              </div>
            </div>

            {/* Move Log Table */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-xs text-slate-300 font-mono">
              {moveHistory.length === 0 ? (
                <p className="text-slate-500 italic text-[11px] text-center py-3">No moves played yet</p>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                  const whiteMove = moveHistory[idx * 2];
                  const blackMove = moveHistory[idx * 2 + 1];
                  return (
                    <div key={idx} className="flex items-center justify-between border-b border-white/5 py-1">
                      <span className="text-slate-500 w-6 text-right mr-2">{idx + 1}.</span>
                      <span className="w-16 font-semibold text-amber-200">{whiteMove?.san || ''}</span>
                      <span className="w-16 text-slate-400">{blackMove?.san || ''}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE SELECTION MODAL (3 FULLY FUNCTIONAL MODES) */}
      {showModeModal && (
        <div ref={modeModalBackdropRef} className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-lg p-4">
          <div ref={modeModalBoxRef} className="rounded-3xl border border-amber-500/30 bg-slate-900 p-4 sm:p-6 shadow-2xl max-w-lg w-[92vw] max-h-[88vh] overflow-y-auto flex flex-col gap-4 sm:gap-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-amber-400" />
                  Select Game Mode
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Choose your preferred play style to begin</p>
              </div>
              <button
                onClick={onCloseModeModal}
                className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Pass & Play */}
              <button
                onClick={() => {
                  soundFx.playClick();
                  onSetGameMode('pvp');
                  onCloseModeModal();
                }}
                className={`flex flex-col text-left p-4 rounded-2xl border transition active:scale-95 ${
                  gameMode === 'pvp'
                    ? 'border-amber-400 bg-amber-500/20 shadow-lg'
                    : 'border-white/10 bg-slate-800/80 hover:bg-slate-800 hover:border-amber-500/40'
                }`}
              >
                <Users className="h-6 w-6 text-amber-400 mb-2" />
                <h3 className="font-bold text-sm text-white">Pass & Play</h3>
                <p className="text-[11px] text-slate-400 mt-1">Local 1v1 on single device with auto 180° camera board flips.</p>
              </button>

              {/* Card 2: Online Multiplayer */}
              <button
                onClick={() => {
                  soundFx.playClick();
                  onCreateOnlineRoom();
                  onCloseModeModal();
                }}
                className={`flex flex-col text-left p-4 rounded-2xl border transition active:scale-95 ${
                  gameMode === 'online'
                    ? 'border-amber-400 bg-amber-500/20 shadow-lg'
                    : 'border-white/10 bg-slate-800/80 hover:bg-slate-800 hover:border-amber-500/40'
                }`}
              >
                <Globe className="h-6 w-6 text-blue-400 mb-2" />
                <h3 className="font-bold text-sm text-white">Multiplayer</h3>
                <p className="text-[11px] text-slate-400 mt-1">Real-time match room code broadcast across tabs / browser sessions.</p>
              </button>

              {/* Card 3: User vs AI */}
              <button
                onClick={() => {
                  soundFx.playClick();
                  onSetGameMode('ai', selectedAiDiff, selectedUserColor);
                  onCloseModeModal();
                }}
                className={`flex flex-col text-left p-4 rounded-2xl border transition active:scale-95 ${
                  gameMode === 'ai'
                    ? 'border-amber-400 bg-amber-500/20 shadow-lg'
                    : 'border-white/10 bg-slate-800/80 hover:bg-slate-800 hover:border-amber-500/40'
                }`}
              >
                <Bot className="h-6 w-6 text-emerald-400 mb-2" />
                <h3 className="font-bold text-sm text-white">User vs AI</h3>
                <p className="text-[11px] text-slate-400 mt-1">Play against in-browser AI engine with difficulty presets.</p>
              </button>
            </div>

            {/* SECONDARY SELECTOR FOR USER VS AI MODE */}
            <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Options & Piece Color</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Difficulty Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Difficulty:</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['easy', 'medium', 'hard'] as AIDifficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          setSelectedAiDiff(d);
                          if (gameMode === 'ai' && onSetAiDifficulty) {
                            onSetAiDifficulty(d);
                          }
                        }}
                        className={`py-1.5 text-[11px] font-bold rounded-lg capitalize border transition ${
                          selectedAiDiff === d
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Your Side:</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setSelectedUserColor('w')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                        selectedUserColor === 'w'
                          ? 'bg-amber-100 text-slate-950 border-amber-300'
                          : 'bg-slate-800 text-slate-300 border-white/10'
                      }`}
                    >
                      White ♔
                    </button>
                    <button
                      onClick={() => setSelectedUserColor('b')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                        selectedUserColor === 'b'
                          ? 'bg-slate-800 text-amber-200 border-amber-500/50'
                          : 'bg-slate-800 text-slate-300 border-white/10'
                      }`}
                    >
                      Black ♚
                    </button>
                  </div>
                </div>
              </div>

              {/* Join Existing Online Room Input */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. 8A3X)"
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white uppercase tracking-wider font-mono focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => {
                    if (joinCodeInput.trim()) {
                      soundFx.playClick();
                      onJoinOnlineRoom(joinCodeInput.trim());
                      onCloseModeModal();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 text-xs rounded-xl transition"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAWN PROMOTION MODAL */}
      {promotionModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div ref={promotionBoxRef} className="rounded-3xl border border-amber-500/30 bg-slate-900 p-6 text-center shadow-2xl max-w-xs w-full">
            <h3 className="text-lg font-bold text-white mb-1">Pawn Promotion</h3>
            <p className="text-xs text-slate-400 mb-4">Choose a piece to promote your pawn:</p>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { type: 'q', label: 'Queen', icon: '♛' },
                { type: 'r', label: 'Rook', icon: '♜' },
                { type: 'b', label: 'Bishop', icon: '♝' },
                { type: 'n', label: 'Knight', icon: '♞' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => promotionModal.callback(item.type)}
                  className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-800 p-2.5 hover:border-amber-400 hover:bg-slate-700 transition active:scale-95"
                >
                  <span className="text-2xl text-amber-300">{item.icon}</span>
                  <span className="text-[10px] font-semibold text-slate-300 mt-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div ref={gameOverBoxRef} className="rounded-3xl border border-amber-500/40 bg-slate-900/90 p-6 sm:p-8 text-center shadow-2xl max-w-sm w-full">
            <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5">GAME OVER</h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-300 mb-6">{gameOverReason}</p>

            <button
              onClick={onNewGame}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
