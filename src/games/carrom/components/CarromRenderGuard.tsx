import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  contextLost: boolean;
  shaderError: boolean;
  textureError: boolean;
  postprocessFailed: boolean;
}

/**
 * System 49 & 50: Render Error Guard & WebGL Context Recovery
 */
export class CarromRenderGuard extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, contextLost: false, shaderError: false, textureError: false, postprocessFailed: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorString = error.toString().toLowerCase();
    const isPostprocess = errorString.includes('postprocessing') || errorString.includes('effectcomposer');
    if (isPostprocess) {
      console.error('[CarromRenderGuard] SEVERITY: HIGH - Postprocessing failure detected.');
    }
    return { hasError: true, contextLost: false, shaderError: false, textureError: false, postprocessFailed: isPostprocess };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CarromRenderGuard] Rendering error caught:', error, errorInfo);
  }

  componentDidMount() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', this.handleContextLost);
      canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    }
    window.addEventListener('error', this.handleGlobalError);
  }

  componentWillUnmount() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    window.removeEventListener('error', this.handleGlobalError);
  }

  handleGlobalError = (e: ErrorEvent) => {
    const msg = e.message.toLowerCase();
    if (msg.includes('shader')) {
      console.error('[CarromRenderGuard] SEVERITY: CRITICAL - Shader compilation error:', e.message);
      this.setState({ shaderError: true, hasError: true });
    } else if (msg.includes('texture') || msg.includes('image')) {
      console.error('[CarromRenderGuard] SEVERITY: MEDIUM - Texture load failure:', e.message);
      this.setState({ textureError: true });
    }
  };

  handleContextLost = (e: Event) => {
    e.preventDefault();
    console.warn('[CarromRenderGuard] WebGL Context Lost! Pausing gameplay.');
    this.setState({ contextLost: true });
    // TODO: Trigger game state pause via useCarromStore
  };

  handleContextRestored = () => {
    console.log('[CarromRenderGuard] WebGL Context Restored! Resuming.');
    this.setState({ contextLost: false, hasError: false });
    // TODO: Trigger game state resume via useCarromStore
  };

  render() {
    if (this.state.contextLost) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white z-50">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Graphics Context Lost</h2>
            <p className="text-sm opacity-80">Attempting to recover rendering hardware...</p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white z-50">
          <div className="text-center p-4 bg-black rounded shadow-lg max-w-sm">
            <h2 className="text-xl font-bold mb-2 text-red-500">Render Pipeline Failure</h2>
            <p className="text-sm mb-4">A critical shader or asset error occurred. Fallback initiated.</p>
            <button 
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
              onClick={() => this.setState({ hasError: false })}
            >
              Restart Engine
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
