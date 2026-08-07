import { Filter, GlProgram } from 'pixi.js';

// A custom WebGL fragment shader to give liquid a refractive / wobbly edge look
const fragment = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  
  uniform sampler2D uTexture;
  uniform float uTime;

  void main() {
    vec2 coord = vTextureCoord;
    
    // Add subtle wave distortion based on time and y coordinate
    coord.x += sin(coord.y * 20.0 + uTime) * 0.005;
    
    vec4 color = texture(uTexture, coord);
    
    // Slight chromatic aberration on edges
    float r = texture(uTexture, coord + vec2(0.002, 0)).r;
    float b = texture(uTexture, coord - vec2(0.002, 0)).b;
    
    finalColor = vec4(r, color.g, b, color.a);
  }
`;

const vertex = `
  in vec2 aPosition;
  out vec2 vTextureCoord;
  
  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;

  void main() {
    vec3 position = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    
    // Pass texture coordinates (simplified for local filter)
    vTextureCoord = aPosition; 
  }
`;

export class LiquidFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: 'liquid-filter'
    });
    
    super({
      glProgram,
      resources: {
        liquidUniforms: {
          uTime: { value: 0, type: 'f32' },
        }
      }
    });
  }

  updateTime(delta: number) {
    this.resources.liquidUniforms.uniforms.uTime += delta * 0.05;
  }
}
