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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("GameShell ErrorBoundary caught error:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-navy-900 text-white p-8">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Renderer Crashed</h2>
          <p className="text-white/60 mb-8 text-center max-w-md">The WebGL Context was lost or the game encountered a fatal exception.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-500 rounded-xl font-bold">Reload Engine</button>
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
          position: "absolute",
          top: "env(safe-area-inset-top, 1rem)",
          right: "env(safe-area-inset-right, 1rem)",
          display: "flex",
          gap: "0.5rem",
          zIndex: 999999 
        }}
      >
        <button
          onClick={() => fullscreenManager.toggleFullscreen()}
          style={{
            padding: "0.5rem",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "0.5rem",
            backdropFilter: "blur(4px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>

        <button
          onClick={handleExit}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(220, 38, 38, 0.9)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            backdropFilter: "blur(4px)",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <X size={18} /> Exit
        </button>
      </div>

      <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 10 }}>
        <ErrorBoundary>
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white">Loading Engine...</div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};
