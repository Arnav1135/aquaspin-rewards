const fs = require('fs');
let content = fs.readFileSync('src/components/games/water-sort-pro/shaders/LiquidFilter.ts', 'utf8');

content = content.replace(/const vertex = \[\s\S]*?\;\s*/g, '');

const vertexShader = 'const vertex = \n' +
'  in vec2 aPosition;\n' +
'  out vec2 vTextureCoord;\n' +
'  uniform mat3 uFilterMatrix;\n\n' +
'  void main() {\n' +
'    gl_Position = vec4(aPosition, 0.0, 1.0);\n' +
'    vTextureCoord = (uFilterMatrix * vec3(aPosition, 1.0)).xy;\n' +
'  }\n' +
';\n\n';

content = content.replace('export class LiquidFilter', vertexShader + 'export class LiquidFilter');
fs.writeFileSync('src/components/games/water-sort-pro/shaders/LiquidFilter.ts', content);

