import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RecoveryCoordinator } from './RecoveryCoordinator';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onSoftReset?: () => void;
}

interface State {
  hasError: boolean;
  recoveryAttempts: number;
}

export class LayerA_ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, recoveryAttempts: 0 };
  }

  static getDerivedStateFromError(_: Error): State {
    // We just return hasError: true so the next render shows fallback if needed
    // The actual recovery logic runs in componentDidCatch
    return { hasError: true, recoveryAttempts: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Increment recovery attempts
    this.setState(prev => {
      const attempts = prev.recoveryAttempts + 1;
      
      if (attempts === 1) {
        // Tier 3: Soft Scene Reset
        RecoveryCoordinator.reportIncident(
          'Layer A',
          'Frame-level Render Exception',
          error.message,
          3 // Soft scene reset
        );
        
        // Trigger soft reset after a brief delay
        setTimeout(() => {
          if (this.props.onSoftReset) {
            this.props.onSoftReset();
          }
          this.setState({ hasError: false }); // Retry render
        }, 500);
      } else if (attempts >= 2) {
        // Escalation: Tier 4 (Full Reload)
        RecoveryCoordinator.reportIncident(
          'Layer A',
          'Repeated Frame Exception (Tier 3 Failed)',
          error.message,
          4 // Full reload
        );
        
        // Tier 4 logic: Save to local storage and reload
        // We'll let the parent app handle the actual location.reload() 
        // to ensure state is serialized first, but we can trigger it here as a last resort
        setTimeout(() => {
           window.location.reload();
        }, 2000);
      }
      
      return { recoveryAttempts: attempts };
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.state.recoveryAttempts >= 2) {
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-500 mb-4">Critical Error (Tier 4 Recovery)</h1>
              <p>The stability engine is serializing match state and reloading the client to preserve your game.</p>
              <div className="mt-8 animate-pulse text-xl">Restoring...</div>
            </div>
          </div>
        );
      }
      
      // Tier 3 visual transition
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white p-8 transition-opacity">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#ffe066] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#ffe066]">Stability Engine</h2>
            <p className="text-sm opacity-70">Recovering 3D Scene Context (Tier 3)...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
