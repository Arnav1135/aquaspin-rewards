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
      shader.uniforms.uTime = { value: 0.0 };
      shader.uniforms.uWaveAmplitude = { value: 0.0 };
      shader.uniforms.uIsFrozen = { value: 0.0 }; // Phase 40-46 Frozen mechanics

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
        uniform float uTime;
        uniform float uWaveAmplitude;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
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
        
        // Phase 2: Multi-frequency surface waves
        float primaryWave = sin(position.x * 10.0 + uTime * 5.0) * cos(position.z * 8.0 + uTime * 4.0);
        float secondaryWave = sin(position.z * 15.0 - uTime * 6.0) * 0.5;
        float microRipple = sin((position.x + position.z) * 30.0 + uTime * 15.0) * 0.2;
        float wave = (primaryWave + secondaryWave + microRipple) * uWaveAmplitude;
        
        transformedPos.y += wave * topMask / uHeight;

        // Phase 19 & 3: Procedural Meniscus (Surface Tension)
        // Curve the edges upward slightly if this is the top layer
        float distFromCenter = length(position.xz);
        float meniscus = smoothstep(0.7, 1.0, distFromCenter / (0.85 - wave * 0.1)); 
        transformedPos.y += (meniscus * 0.1 * uIsTopLayer * topMask) / uHeight;

        vLocalPos = transformedPos;

        vec4 mvPosition = vec4( transformedPos, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        
        // Pass world position for depth shading
        vec4 worldPosition = modelMatrix * vec4(transformedPos, 1.0);
        #ifdef USE_INSTANCING
          worldPosition = instanceMatrix * worldPosition;
        #endif
        vWorldPos = worldPosition.xyz;

        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        uniform float uHeight;
        uniform float uIsFrozen;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        
        // Phase 5: Liquid Depth Fog (Absorption Approximation)
        // Darken base color linearly based on local depth (Y goes from ~0.5 top to -0.5 bottom of segment)
        float normalizedDepth = smoothstep(0.5, -0.5, vLocalPos.y); 
        vec3 depthColor = mix(diffuseColor.rgb, diffuseColor.rgb * 0.4, normalizedDepth);
        
        // Phase 6: Internal Liquid Lighting (Subsurface Scattering Approximation)
        // Light travels through liquid, creating a glow where rim meets view
        float viewFactor = max(0.0, dot(vNormal, normalize(vViewPosition)));
        float sssEffect = pow(1.0 - viewFactor, 3.0) * 0.5; // Rim glow representing internal light scatter
        
        diffuseColor.rgb = depthColor + sssEffect * diffuseColor.rgb;

        // Phase 40-46: Frozen Effect (Ice)
        // If it's a frozen segment, tint it white/cyan and increase subsurface glow significantly
        if (uIsFrozen > 0.5) {
           vec3 iceTint = mix(diffuseColor.rgb, vec3(0.8, 0.95, 1.0), 0.7);
           diffuseColor.rgb = iceTint + vec3(0.3) * viewFactor; // Specular rough sheen
        }
        `
      );
    };

    this.materials.set(hash, mat);
    return mat;
  }
}

export const liquidVisualEngine = new LiquidVisualEngine();
