import * as THREE from 'three';

export interface SurfaceDetailParams {
  roughnessMap?: THREE.Texture;
  microNormalMap?: THREE.Texture;
  wetness: number; // 0-1
  wear: number; // 0-1
  dust: number; // 0-1
}

export class SurfaceDetailShader {
  // Phase 7: Reusable Procedural Surface Detail Shader Injection
  public static applyToMaterial(material: THREE.MeshPhysicalMaterial, params: SurfaceDetailParams) {
    material.onBeforeCompile = (shader) => {
      // Inject uniforms
      shader.uniforms.uWetness = { value: params.wetness };
      shader.uniforms.uWear = { value: params.wear };
      shader.uniforms.uDust = { value: params.dust };

      // Inject varying/uniforms into vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        `
      );

      // Inject logic into fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float uWetness;
        uniform float uWear;
        uniform float uDust;
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;

        // Simple hash function for procedural noise
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        `
      );

      // Modify roughness and specular before they are used in lighting
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `
        #include <roughnessmap_fragment>
        
        // Procedural wear (increases roughness)
        float noise = hash(floor(vWorldPosition.xy * 10.0));
        roughnessFactor = mix(roughnessFactor, 1.0, uWear * noise);

        // Procedural dust (up-facing surfaces get more dust and roughness)
        float upFactor = max(0.0, vWorldNormal.y);
        roughnessFactor = mix(roughnessFactor, 1.0, uDust * upFactor);

        // Procedural wetness (decreases roughness, adds specular clearcoat)
        roughnessFactor = mix(roughnessFactor, 0.05, uWetness);
        `
      );
      
      // Inject clearcoat modification for wetness
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clearcoat_normal_fragment_begin>',
        `
        #include <clearcoat_normal_fragment_begin>
        clearcoatFactor = mix(clearcoatFactor, 1.0, uWetness);
        clearcoatRoughnessFactor = mix(clearcoatRoughnessFactor, 0.0, uWetness);
        `
      );
    };
  }
}
