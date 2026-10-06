import React from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

function MobileCameraAdjuster({ baseFov }: { baseFov?: number }) {
  const { camera, size } = useThree();
  
  useEffect(() => {
    // We only adjust if camera has a fov property (PerspectiveCamera)
    if (!('fov' in camera)) return;

    const aspect = size.width / size.height;
    // The baseFov might be what was passed in camera props, or default 50
    const fov = baseFov || (camera as any).fov || 50;
    
    if (aspect < 1) {
      // Portrait mode on mobile: we need to widen the FOV so elements don't get cut off on the sides.
      // Scaling factor to keep the horizontal frustum width similar.
      (camera as any).fov = fov / Math.max(0.4, aspect) * 0.9;
    } else {
      // Landscape mode
      (camera as any).fov = fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, size, baseFov]);

  return null;
}

export const ResponsiveCanvas = React.forwardRef<any, any>((props, ref) => {
  let baseFov = 50;
  if (props.camera && typeof props.camera === 'object' && 'fov' in props.camera) {
    baseFov = props.camera.fov;
  }

  // Optimize performance on mobile by capping device pixel ratio
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  return (
    <R3FCanvas ref={ref} dpr={props.dpr || [1, dpr]} {...props}>
      <MobileCameraAdjuster baseFov={baseFov} />
      {props.children}
    </R3FCanvas>
  );
});

ResponsiveCanvas.displayName = 'ResponsiveCanvas';
