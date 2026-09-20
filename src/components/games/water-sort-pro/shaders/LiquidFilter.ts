import { Filter, GlProgram } from 'pixi.js';

// Hyper-realistic fluid shader with refraction, meniscus, bubbles, and dynamic pouring
const fragment = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uPouring; // 0.0 to 1.0 indicating if pouring is active
  
  float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  void main() {
    vec2 coord = vTextureCoord;
    
    // Dynamic physics: ripples and waves
    float wave = sin(coord.y * 30.0 + uTime * 3.0) * 0.002;
    if (uPouring > 0.0) {
      // Turbulance during pouring
      wave += sin(coord.y * 60.0 - uTime * 15.0) * 0.008 * uPouring;
    }
    
    vec2 distortedCoord = coord + vec2(wave, 0.0);
    
    // Sample texture with chromatic aberration (Refraction)
    float r = texture(uTexture, distortedCoord + vec2(0.003, 0.0)).r;
    vec4 baseColor = texture(uTexture, distortedCoord);
    float b = texture(uTexture, distortedCoord - vec2(0.003, 0.0)).b;
    
    vec4 color = vec4(r, baseColor.g, b, baseColor.a);
    
    // Meniscus effect: brighten the top edge of the fluid
    float alphaUp = texture(uTexture, distortedCoord - vec2(0.0, 0.015)).a;
    float meniscus = (1.0 - alphaUp) * color.a * 0.6;
    
    // Bubbles effect during pouring
    float bNoise = noise(coord * 80.0 + vec2(0.0, -uTime * 8.0));
    float bubbleMask = smoothstep(0.85, 1.0, bNoise) * uPouring * color.a;
    
    color.rgb += vec3(bubbleMask);
    color.rgb += vec3(meniscus);
    
    finalColor = color;
  }
`;

const vertex = `
  in vec2 aPosition;
  out vec2 vTextureCoord;
  uniform mat3 uFilterMatrix;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTextureCoord = (uFilterMatrix * vec3(aPosition, 1.0)).xy;
  }
`;

export class LiquidFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      fragment,
      name: 'liquid-filter'
    });
    
    super({
      glProgram,
      resources: {
        liquidUniforms: {
          uTime: { value: 0, type: 'f32' },
          uPouring: { value: 0, type: 'f32' },
        }
      }
    });
  }

  updateTime(delta: number) {
    this.resources.liquidUniforms.uniforms.uTime += delta * 0.05;
  }

  setPouring(isPouring: boolean) {
    // Smoothly transition pouring uniform
    const current = this.resources.liquidUniforms.uniforms.uPouring;
    const target = isPouring ? 1.0 : 0.0;
    this.resources.liquidUniforms.uniforms.uPouring += (target - current) * 0.1;
  }
}



