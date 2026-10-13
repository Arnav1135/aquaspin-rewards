import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useAuthStore } from '@/features/authStore';
import { secureRecordGameResult } from '@/lib/secureEconomy';
import { Maximize, Minimize, X } from "lucide-react";
import { fullscreenManager, exitGameExperience } from "@/lib/gameLifecycle";

export interface GameLifecycle {
  onClose: () => void;
}

interface GameShellProps extends GameLifecycle {
  children: React.ReactNode;
}

interface ErrorBoundaryProps { children: React.ReactNode; onClose?: () => void; }
class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("GameShell ErrorBoundary caught error:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-navy-950 text-white p-8 select-none">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center text-3xl mb-4">
              ??
            </div>
            <h2 className="text-xl font-black text-white mb-2">Graphics Renderer Interrupted</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">The WebGL graphics pipeline encountered an unexpected exception or device context pause.</p>
            <div className="flex gap-3">
              <button onClick={() => this.setState({ hasError: false })} className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white shadow-lg transition-transform active:scale-95">Restart Game</button>
              {this.props.onClose && (
                <button onClick={this.props.onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 transition-colors">Exit to Lobby</button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const GameShell: React.FC<GameShellProps> = ({ children, onClose }) => {
  const [viewportHeight, setViewportHeight] = useState("100dvh");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { profile, updateProfile } = useAuthStore();
  useEffect(() => {
    let rewarded = false;
    const timer = setTimeout(() => {
      if (!rewarded && profile && !profile.id.startsWith('guest')) {
        rewarded = true;
        secureRecordGameResult({
          userId: profile.id,
          betAmount: 0,
          earnedAmount: 15,
          xpEarned: 50
        }).then(res => {
          if (res.data) updateProfile({ tokens: res.data });
        }).catch(() => {});
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [profile?.id]);

  // Synchronize state with real browser fullscreen
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(fullscreenManager.isFullscreen());
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    const updateHeight = () => setViewportHeight(`${window.innerHeight}px`);
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(document.body);
    window.addEventListener("resize", updateHeight);
    
    // Keyboard bindings (Escape)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreenManager.isFullscreen()) {
          fullscreenManager.exitFullscreen();
        } else {
          exitGameExperience(onClose);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleExit = useCallback(() => {
    exitGameExperience(onClose);
  }, [onClose]);

  return (
    <div 
      className="game-shell-root"
      style={{ 
        width: "100%", 
        height: viewportHeight, 
        overflow: "hidden", 
        position: "relative",
        backgroundColor: "#0a0f1d",
        zIndex: 1
      }}
    >
      {/* 
        CRITICAL: Z-Index 999999 
        Never allow the Exit button to disappear behind renderer content.
      */}
      <div 
        style={{
          position: "fixed",
          top: "max(0.75rem, env(safe-area-inset-top, 1rem))",
          right: "max(0.75rem, env(safe-area-inset-right, 1rem))",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          zIndex: 999999,
          pointerEvents: "auto"
        }}
      >
        <button
          type="button"
          onClick={() => fullscreenManager.toggleFullscreen()}
          style={{
            padding: "0.5rem",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "0.75rem",
            backdropFilter: "blur(12px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
            transition: "all 0.2s ease"
          }}
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        <button
          type="button"
          onClick={handleExit}
          style={{
            padding: "0.55rem 1.1rem",
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "white",
            border: "1px solid rgba(254, 202, 202, 0.4)",
            borderRadius: "0.85rem",
            fontWeight: 800,
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(220, 38, 38, 0.45)",
            backdropFilter: "blur(12px)",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            transition: "all 0.2s ease"
          }}
          title="Exit Game (ESC)"
          aria-label="Exit Game"
        >
          <X size={16} strokeWidth={3} /> Exit
        </button>
      </div>

      <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 10 }}>
        <ErrorBoundary onClose={handleExit}>
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white">Loading Engine...</div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
