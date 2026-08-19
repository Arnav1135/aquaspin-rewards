import * as THREE from 'three';

export interface LiquidProfile {
  density: number;
  baseColor: number;
  opacity: number;
  viscosity: number;
  surfaceTension: number;
  foamFactor: number;
  ior: number;
}

export class LiquidVisualEngine {
  private materials: Map<string, THREE.MeshPhysicalMaterial> = new Map();

  // Phase 1: Shared Liquid Engine
  public getLiquidMaterial(profile: LiquidProfile): THREE.MeshPhysicalMaterial {
    const hash = `${profile.baseColor}_${profile.opacity}_${profile.ior}`;
    
    if (this.materials.has(hash)) {
      return this.materials.get(hash)!;
    }

    const mat = new THREE.MeshPhysicalMaterial({
      color: profile.baseColor,
      transmission: profile.opacity, // How much light passes through
      opacity: 1.0,
      transparent: true,
      roughness: 0.0,
      ior: profile.ior,
      thickness: profile.density * 2.0, // Subsurface depth approximation
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.FrontSide,
    });

    // Phase 17: Liquid Depth Shading (Shader Injection)
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBaseColor = { value: new THREE.Color(profile.baseColor) };
      shader.uniforms.uDepthDarkening = { value: 0.5 };
      shader.uniforms.uSloshX = { value: 0.0 };
      shader.uniforms.uSloshZ = { value: 0.0 };
      shader.uniforms.uIsTopLayer = { value: 0.0 };
      shader.uniforms.uHeight = { value: 1.0 };

      // Link userData to uniforms so they can be updated per-mesh in R3F
      mat.userData.shader = shader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float uSloshX;
        uniform float uSloshZ;
        uniform float uIsTopLayer;
        uniform float uHeight;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        // Phase 4: Liquid Inertia (Sloshing)
        // Adjust the Y position of the top vertices based on slosh angles
        // For a unit cylinder (-0.5 to 0.5), position.y > 0 is the top half.
        float topMask = smoothstep(0.2, 0.5, position.y);
        
        vec3 transformedPos = position;
        
        // Apply slosh displacement
        transformedPos.y += (position.x * uSloshX + position.z * uSloshZ) * topMask / uHeight;
        
        // Phase 19: Procedural Meniscus (Surface Tension)
        // Curve the edges upward slightly if this is the top layer
        float distFromCenter = length(position.xz);
        float meniscus = smoothstep(0.7, 1.0, distFromCenter / 0.85); // 0.85 is approx radius
        transformedPos.y += (meniscus * 0.1 * uIsTopLayer * topMask) / uHeight;

        vec4 mvPosition = vec4( transformedPos, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Phase 17: Liquid Depth Shading
        float viewFactor = max(0.0, dot(vNormal, normalize(vViewPosition)));
        diffuseColor.rgb = mix(diffuseColor.rgb * uDepthDarkening, diffuseColor.rgb, viewFactor);
        `
      );
    };

    this.materials.set(hash, mat);
    return mat;
  }
}

export const liquidVisualEngine = new LiquidVisualEngine();
