// src/lib/reliability/autoRecovery.ts
import { Component, ErrorInfo, ReactNode } from 'react';
import { reliabilityCore } from './reliabilityCore';

interface Props {
  children: ReactNode;
  gameId: string;
  onRecover?: () => void;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0
  };

  private maxRetries = 2;

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, retryCount: 0 };
  }

  public componentDidMount() {
    window.addEventListener('webglcontextlost', this.handleContextLost as EventListener, true);
  }

  public componentWillUnmount() {
    window.removeEventListener('webglcontextlost', this.handleContextLost as EventListener, true);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault(); // Prevent default browser behavior
    
    reliabilityCore.logEvent({
      gameId: this.props.gameId,
      category: 'error',
      severity: 'high',
      details: 'WebGL Context Lost detected (GPU crashed or out of memory).',
      autoCorrected: false
    });

    this.setState({ hasError: true }, () => {
      this.attemptRecovery();
    });
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reliabilityCore.logEvent({
      gameId: this.props.gameId,
      category: 'error',
      severity: 'high',
      details: error.message,
      stackTrace: errorInfo.componentStack || undefined,
      autoCorrected: false
    });

    if (error.name === 'ChunkLoadError' || error.message.includes('dynamically imported module') || error.message.includes('Failed to fetch')) {
      window.location.reload();
      return;
    }

    this.attemptRecovery();
  }

  private attemptRecovery = () => {
    if (this.state.retryCount < this.maxRetries) {
      setTimeout(() => {
        reliabilityCore.logEvent({
          gameId: this.props.gameId,
          category: 'error',
          severity: 'medium',
          details: `Attempting auto-recovery (Retry ${this.state.retryCount + 1}/${this.maxRetries})`,
          autoCorrected: true,
          correctionApplied: 'Remounted Game Component'
        });

        this.setState(prevState => ({
          hasError: false,
          retryCount: prevState.retryCount + 1
        }));
        
        if (this.props.onRecover) {
          this.props.onRecover();
        }
      }, Math.pow(2, this.state.retryCount) * 500); // Exponential backoff: 500ms, 1000ms
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.retryCount >= this.maxRetries) {
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] w-full bg-slate-900/80 rounded-2xl p-6 text-center border border-rose-500/30">
             <h3 className="text-xl font-bold text-rose-400 mb-2">Game Temporarily Unavailable</h3>
             <p className="text-slate-400 text-sm mb-4">We encountered an issue running this game on your device. Our systems have logged the error for a quick fix.</p>
             <button 
               onClick={() => this.setState({ hasError: false, retryCount: 0 })}
               className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors border border-rose-500/50"
             >
               Force Restart
             </button>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center h-full min-h-[300px] w-full bg-slate-900/50 rounded-2xl animate-pulse">
          <p className="text-slate-400 text-sm">Recovering game state...</p>
        </div>
      );
    }

    return this.props.children;
  }
}
