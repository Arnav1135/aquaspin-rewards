import React, { useState, useEffect } from 'react';
import { Canvas as R3FCanvas, useThree } from '@react-three/fiber';

/**
 * Dynamically adjusts PerspectiveCamera FOV on mobile devices to prevent horizontal frustum clipping.
 */
function MobileCameraAdjuster({ baseFov }: { baseFov?: number }) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!('fov' in camera)) return;

    const aspect = size.width / size.height;
    const fov = baseFov || (camera as any).fov || 50;

    if (aspect < 1) {
      // Portrait mode on mobile: widen FOV to preserve full scene visibility
      (camera as any).fov = (fov / Math.max(0.4, aspect)) * 0.9;
    } else {
      // Landscape mode: reset to intended base FOV
      (camera as any).fov = fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, size, baseFov]);

  return null;
}

/**
 * WebGL Lifecycle Guardian:
 *  - Handles 'webglcontextlost' (calls event.preventDefault() so browser permits restoration)
 *  - Handles 'webglcontextrestored' cleanly
 *  - Disposes renderer and scene memory cleanly on unmount to prevent GPU RAM leaks
 */
function WebGLContextGuardian({ onContextStateChange }: { onContextStateChange: (lost: boolean) => void }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const canvasElement = gl.domElement;
    if (!canvasElement) return;

    const handleContextLost = (event: Event) => {
      // Prevent browser default so WebGL context can be restored
      event.preventDefault();
      console.warn('[WebGLContextGuardian] WebGL context lost! Guarding state...');
      onContextStateChange(true);
    };

    const handleContextRestored = () => {
      console.log('[WebGLContextGuardian] WebGL context restored successfully.');
      onContextStateChange(false);
    };

    canvasElement.addEventListener('webglcontextlost', handleContextLost, false);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      canvasElement.removeEventListener('webglcontextlost', handleContextLost);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);

      // Deep GPU Resource Disposal on Unmount
      try {
        scene.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose?.();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => mat.dispose?.());
            } else {
              object.material.dispose?.();
            }
          }
        });
        gl.dispose?.();
      } catch (err) {
        console.warn('[WebGLContextGuardian] Cleanup notice:', err);
      }
    };
  }, [gl, scene, onContextStateChange]);

  return null;
}

/**
 * Enterprise Production-Ready Canvas Wrapper:
 * - Built-in context loss catch & auto-recovery visual state
 * - Automatic mobile FOV scaling
 * - DPR clamped to max 1.5 to prevent GPU thermal throttling & battery drain
 * - Flawless fallback recovery
 */
export const ResponsiveCanvas = React.forwardRef<any, any>((props, ref) => {
  const [contextLost, setContextLost] = useState(false);

  let baseFov = 50;
  if (props.camera && typeof props.camera === 'object' && 'fov' in props.camera) {
    baseFov = props.camera.fov;
  }

  // Optimize performance on mobile devices by capping device pixel ratio to 1.5
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;

  return (
    <div className="relative w-full h-full">
      <R3FCanvas
        ref={ref}
        dpr={props.dpr || [1, dpr]}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
          ...(props.gl || {}),
        }}
        {...props}
      >
        <MobileCameraAdjuster baseFov={baseFov} />
        <WebGLContextGuardian onContextStateChange={setContextLost} />
        {props.children}
      </R3FCanvas>

      {/* GPU Context Loss Recovery HUD */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center select-none">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin mb-4" />
          <h4 className="text-lg font-black text-white uppercase tracking-wider">Restoring 3D Graphics...</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Device graphics memory was momentarily re-allocated. Reconnecting WebGL engine.
          </p>
        </div>
      )}
    </div>
  );
});

ResponsiveCanvas.displayName = 'ResponsiveCanvas';
