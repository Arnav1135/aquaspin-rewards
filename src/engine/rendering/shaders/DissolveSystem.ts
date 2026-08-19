import * as THREE from 'three';

export type DissolveState = 'NORMAL' | 'DISSOLVING' | 'PARTICLE_EDGE' | 'DISAPPEARED';

export class DissolveSystem {
  // Phase 11: Dissolve System
  public static applyDissolveShader(material: THREE.Material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uDissolveProgress = { value: 0.0 };
      shader.uniforms.uEdgeWidth = { value: 0.05 };
      shader.uniforms.uEdgeColor = { value: new THREE.Color(0x00ffff) };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec2 vUv;
        `
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `
        #include <uv_vertex>
        vUv = uv;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec2 vUv;
        uniform float uDissolveProgress;
        uniform float uEdgeWidth;
        uniform vec3 uEdgeColor;

        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `
        #include <alphatest_fragment>
        float n = noise(vUv * 20.0);
        if (n < uDissolveProgress) discard;
        
        if (n < uDissolveProgress + uEdgeWidth) {
           gl_FragColor = vec4(uEdgeColor, 1.0);
           return;
        }
        `
      );
    };
  }

  public static setDissolveProgress(material: THREE.Material, progress: number) {
    if ((material as any).userData?.shader) {
      (material as any).userData.shader.uniforms.uDissolveProgress.value = progress;
    }
  }
}
