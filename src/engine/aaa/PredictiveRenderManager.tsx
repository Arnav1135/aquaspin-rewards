import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, useTexture } from '@react-three/drei';

interface PredictiveRenderManagerProps {
  assetsToPrefetch?: {
    models?: string[];
    textures?: string[];
  };
}

export const PredictiveRenderManager: React.FC<PredictiveRenderManagerProps> = ({ assetsToPrefetch }) => {
  const { gl } = useThree();

  useEffect(() => {
    // Background idle prefetching logic
    const prefetchAssets = async () => {
      if (assetsToPrefetch?.models) {
        assetsToPrefetch.models.forEach((url) => {
          useGLTF.preload(url);
        });
      }
      if (assetsToPrefetch?.textures) {
        assetsToPrefetch.textures.forEach((url) => {
          useTexture.preload(url);
        });
      }
    };

    // Use requestIdleCallback if available, else setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => prefetchAssets());
    } else {
      setTimeout(prefetchAssets, 1000);
    }
  }, [assetsToPrefetch]);

  return null;
};
