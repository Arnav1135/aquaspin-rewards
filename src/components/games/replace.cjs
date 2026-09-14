const fs = require('fs');

const filePath = 'd:/Web App - Aqua Blue/src/components/games/LudoGame.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const constantsCode = `
const GEO = {
  trayBase: new THREE.BoxGeometry(2.0, 0.04, 2.0),
  trayWallZ: new THREE.BoxGeometry(0.08, 0.2, 2.08),
  trayWallX: new THREE.BoxGeometry(2.08, 0.2, 0.08),
  diceBox: new THREE.BoxGeometry(0.24, 0.24, 0.24),
  dicePipCenter: new THREE.SphereGeometry(0.024, 8, 8),
  dicePip: new THREE.SphereGeometry(0.02, 8, 8),
  boardOuter: new THREE.BoxGeometry(7.7, 0.1, 7.7),
  boardBase: new THREE.BoxGeometry(7.5, 0.01, 7.5),
  yardOverlay: new THREE.BoxGeometry(2.9, 0.005, 2.9),
  trackTile: new THREE.BoxGeometry(0.46, 0.006, 0.46),
  safeStar: new THREE.TorusGeometry(0.1, 0.02, 8, 24),
  homeCenter: new THREE.BoxGeometry(1.4, 0.006, 1.4),
  ring: new THREE.RingGeometry(0.18, 0.24, 32),
  pawnBase: new THREE.CylinderGeometry(0.11, 0.16, 0.08, 16),
  pawnSkirt: new THREE.CylinderGeometry(0.07, 0.11, 0.16, 16),
  pawnCollar: new THREE.TorusGeometry(0.065, 0.02, 8, 16),
  pawnHead: new THREE.SphereGeometry(0.09, 16, 16)
};

const MATS = {
  dicePip: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#1a1a1a', roughness: 0.9 }),
  trayBorder: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#4e2f1d', roughness: 0.3 }),
  diceBoxNeon: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#00e5ff', roughness: 0.1, metalness: 0.8, emissive: '#003c4a' }),
  diceBoxNormal: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#fafafa', roughness: 0.1, metalness: 0.0, emissive: '#000000' }),
  boardOuterNeon: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#060914', roughness: 0.4, metalness: 0.4 }),
  boardOuterMarble: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#3e2723', roughness: 0.05, metalness: 0.0 }),
  boardOuterClassic: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#4e2f1d', roughness: 0.4, metalness: 0.0 }),
  boardBaseNeon: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#0f172a', roughness: 0.25, metalness: 0.15 }),
  boardBaseMarble: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#f5f5f5', roughness: 0.02, metalness: 0.0 }),
  boardBaseClassic: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#ffffff', roughness: 0.25, metalness: 0.0 }),
  homeCenterNeon: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#0f172a', roughness: 0.1, metalness: 0.4 }),
  homeCenterNormal: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#1e1e1e', roughness: 0.1, metalness: 0.4 }),
  safeStar: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#ffd700', metalness: 0.9, roughness: 0.1 }),
  ring: new THREE.MeshBasicMaterial({ color: '#ffe066', side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  trayBaseNeon: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#101a35', roughness: 0.8, metalness: 0.1 }),
  trayBaseMarble: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#d7e2e8', roughness: 0.8, metalness: 0.1 }),
  trayBaseClassic: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#2e7d32', roughness: 0.8, metalness: 0.1 }),
};
const YARD_MATS = {
  neon: {
    red: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.red, transparent: true, opacity: 0.35, roughness: 0.1 }),
    blue: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.blue, transparent: true, opacity: 0.35, roughness: 0.1 }),
    green: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.green, transparent: true, opacity: 0.35, roughness: 0.1 }),
    yellow: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.yellow, transparent: true, opacity: 0.35, roughness: 0.1 }),
  },
  normal: {
    red: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.red, transparent: true, opacity: 0.2, roughness: 0.1 }),
    blue: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.blue, transparent: true, opacity: 0.2, roughness: 0.1 }),
    green: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.green, transparent: true, opacity: 0.2, roughness: 0.1 }),
    yellow: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.yellow, transparent: true, opacity: 0.2, roughness: 0.1 }),
  }
};
const PAWN_MATS = {
  red: {
    base: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.red, roughness: 0.15, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1 }),
    skirt: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.red, roughness: 0.15, metalness: 0.1, clearcoat: 1.0 }),
    collar: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.red, roughness: 0.15, metalness: 0.1 }),
    head: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.red, roughness: 0.1, metalness: 0.15, clearcoat: 1.0 }),
    col: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.red, roughness: 0.15, metalness: 0.2 })
  },
  blue: {
    base: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.blue, roughness: 0.15, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1 }),
    skirt: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.blue, roughness: 0.15, metalness: 0.1, clearcoat: 1.0 }),
    collar: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.blue, roughness: 0.15, metalness: 0.1 }),
    head: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.blue, roughness: 0.1, metalness: 0.15, clearcoat: 1.0 }),
    col: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.blue, roughness: 0.15, metalness: 0.2 })
  },
  green: {
    base: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.green, roughness: 0.15, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1 }),
    skirt: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.green, roughness: 0.15, metalness: 0.1, clearcoat: 1.0 }),
    collar: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.green, roughness: 0.15, metalness: 0.1 }),
    head: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.green, roughness: 0.1, metalness: 0.15, clearcoat: 1.0 }),
    col: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.green, roughness: 0.15, metalness: 0.2 })
  },
  yellow: {
    base: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.yellow, roughness: 0.15, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.1 }),
    skirt: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.yellow, roughness: 0.15, metalness: 0.1, clearcoat: 1.0 }),
    collar: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.yellow, roughness: 0.15, metalness: 0.1 }),
    head: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.yellow, roughness: 0.1, metalness: 0.15, clearcoat: 1.0 }),
    col: new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: COLOR_HEX.yellow, roughness: 0.15, metalness: 0.2 })
  }
};

const TRACK_MATS = new Map();
function getTrackMaterial(colorHex, isSafe, isNeon) {
  const key = colorHex + '-' + isSafe + '-' + isNeon;
  if (!TRACK_MATS.has(key)) {
    TRACK_MATS.set(key, new THREE.MeshPhysicalMaterial({
      clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0,
      color: colorHex,
      roughness: 0.15,
      metalness: isSafe ? 0.8 : 0.1,
      emissive: (isSafe && isNeon) ? '#3a3000' : undefined
    }));
  }
  return TRACK_MATS.get(key);
}
`;

content = content.replace(/(const COLOR_HEX: Record<Color, string> = [^\n]*\n)/, '$1\n' + constantsCode);

content = content.replace(/<mesh position={\[0, 0\.02, -4\.8\]} receiveShadow>[\s\S]*?<\/mesh>/, 
  '<mesh position={[0, 0.02, -4.8]} receiveShadow geometry={GEO.trayBase} material={neonStyle ? MATS.trayBaseNeon : marbleStyle ? MATS.trayBaseMarble : MATS.trayBaseClassic} />');

content = content.replace(/<mesh position={\[-1\.02, 0\.1, -4\.8\]} castShadow>[\s\S]*?<\/mesh>/, 
  '<mesh position={[-1.02, 0.1, -4.8]} castShadow geometry={GEO.trayWallZ} material={MATS.trayBorder} />');

content = content.replace(/<mesh position={\[1\.02, 0\.1, -4\.8\]} castShadow>[\s\S]*?<\/mesh>/, 
  '<mesh position={[1.02, 0.1, -4.8]} castShadow geometry={GEO.trayWallZ} material={MATS.trayBorder} />');

content = content.replace(/<mesh position={\[0, 0\.1, -5\.86\]} castShadow>[\s\S]*?<\/mesh>/, 
  '<mesh position={[0, 0.1, -5.86]} castShadow geometry={GEO.trayWallX} material={MATS.trayBorder} />');

content = content.replace(/<mesh position={\[0, 0\.1, -3\.74\]} castShadow>[\s\S]*?<\/mesh>/, 
  '<mesh position={[0, 0.1, -3.74]} castShadow geometry={GEO.trayWallX} material={MATS.trayBorder} />');

content = content.replace(/<mesh castShadow receiveShadow>[\s\S]*?<\/mesh>/, 
  '<mesh castShadow receiveShadow geometry={GEO.diceBox} material={neonStyle ? MATS.diceBoxNeon : MATS.diceBoxNormal} />');

content = content.replace(/<mesh position={\[0, 0\.121, 0\]}>[\s\S]*?<\/mesh>/, 
  '<mesh position={[0, 0.121, 0]} geometry={GEO.dicePipCenter} material={MATS.dicePip} />');

content = content.replace(/<mesh key=\{\`6-\$\{x\}-\$\{z\}\`\} position=\{\[x, -0\.121, z\]\}>[\s\S]*?<\/mesh>/g, 
  '<mesh key={`6-${x}-${z}`} position={[x, -0.121, z]} geometry={GEO.dicePip} material={MATS.dicePip} />');

content = content.replace(/<mesh position=\{\[([^\]]+)\]\}><sphereGeometry args=\{\[0\.02, 8, 8\]\} \/><meshPhysicalMaterial clearcoat=\{1\.0\} clearcoatRoughness=\{0\.1\} envMapIntensity=\{1\.5\} transmission=\{0\} thickness=\{0\} color="#1a1a1a" \/><\/mesh>/g, 
  '<mesh position={[$1]} geometry={GEO.dicePip} material={MATS.dicePip} />');

content = content.replace(/<mesh receiveShadow position=\{\[0, -0\.04, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh receiveShadow position={[0, -0.04, 0]} geometry={GEO.boardOuter} material={isNeon ? MATS.boardOuterNeon : isMarble ? MATS.boardOuterMarble : MATS.boardOuterClassic} />');

content = content.replace(/<mesh receiveShadow position=\{\[0, 0\.01, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh receiveShadow position={[0, 0.01, 0]} geometry={GEO.boardBase} material={isNeon ? MATS.boardBaseNeon : isMarble ? MATS.boardBaseMarble : MATS.boardBaseClassic} />');

content = content.replace(/<mesh key=\{colName\} position=\{\[offset\[0\], 0\.018, offset\[1\]\]\} receiveShadow>[\s\S]*?<\/mesh>/g, 
  '<mesh key={colName} position={[offset[0], 0.018, offset[1]]} receiveShadow geometry={GEO.yardOverlay} material={isNeon ? YARD_MATS.neon[colName] : YARD_MATS.normal[colName]} />');

content = content.replace(/<mesh receiveShadow>\s*<boxGeometry args=\{\[0\.46, 0\.006, 0\.46\]\} \/>\s*<meshPhysicalMaterial clearcoat=\{1\.0\} clearcoatRoughness=\{0\.1\} envMapIntensity=\{1\.5\} transmission=\{0\} thickness=\{0\}\s*color=\{color\}\s*roughness=\{0\.15\}\s*metalness=\{isSafe \? 0\.8 : 0\.1\}\s*emissive=\{isSafe && isNeon \? '#3a3000' : undefined\}\s*\/>\s*<\/mesh>/g, 
  '<mesh receiveShadow geometry={GEO.trackTile} material={getTrackMaterial(color, isSafe, isNeon)} />');

content = content.replace(/<mesh position=\{\[0, 0\.005, 0\]\}>\s*<torusGeometry args=\{\[0\.1, 0\.02, 8, 24\]\} \/>\s*<meshPhysicalMaterial clearcoat=\{1\.0\} clearcoatRoughness=\{0\.1\} envMapIntensity=\{1\.5\} transmission=\{0\} thickness=\{0\} color="#ffd700" metalness=\{0\.9\} roughness=\{0\.1\} \/>\s*<\/mesh>/g, 
  '<mesh position={[0, 0.005, 0]} geometry={GEO.safeStar} material={MATS.safeStar} />');

content = content.replace(/<mesh key=\{\`col-\$\{col\}-\$\{idx\}\`\} position=\{\[x, 0\.017, z\]\} receiveShadow>\s*<boxGeometry args=\{\[0\.46, 0\.006, 0\.46\]\} \/>\s*<meshPhysicalMaterial clearcoat=\{1\.0\} clearcoatRoughness=\{0\.1\} envMapIntensity=\{1\.5\} transmission=\{0\} thickness=\{0\}\s*color=\{COLOR_HEX\[col\]\}\s*roughness=\{0\.15\}\s*metalness=\{0\.2\}\s*\/>\s*<\/mesh>/g, 
  '<mesh key={`col-${col}-${idx}`} position={[x, 0.017, z]} receiveShadow geometry={GEO.trackTile} material={PAWN_MATS[col].col} />');

content = content.replace(/<mesh position=\{\[0, 0\.018, 0\]\} receiveShadow>\s*<boxGeometry args=\{\[1\.4, 0\.006, 1\.4\]\} \/>\s*<meshPhysicalMaterial clearcoat=\{1\.0\} clearcoatRoughness=\{0\.1\} envMapIntensity=\{1\.5\} transmission=\{0\} thickness=\{0\}\s*color=\{isNeon \? '#0f172a' : '#1e1e1e'\}\s*roughness=\{0\.1\}\s*metalness=\{0\.4\}\s*\/>\s*<\/mesh>/, 
  '<mesh position={[0, 0.018, 0]} receiveShadow geometry={GEO.homeCenter} material={isNeon ? MATS.homeCenterNeon : MATS.homeCenterNormal} />');

content = content.replace(/<mesh position=\{\[0, 0\.02, 0\]\} rotation=\{\[-Math\.PI \/ 2, 0, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={GEO.ring} material={MATS.ring} />');

content = content.replace(/<mesh castShadow position=\{\[0, 0\.05, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh castShadow position={[0, 0.05, 0]} geometry={GEO.pawnBase} material={PAWN_MATS[color].base} />');

content = content.replace(/<mesh castShadow position=\{\[0, 0\.15, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh castShadow position={[0, 0.15, 0]} geometry={GEO.pawnSkirt} material={PAWN_MATS[color].skirt} />');

content = content.replace(/<mesh castShadow position=\{\[0, 0\.23, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh castShadow position={[0, 0.23, 0]} geometry={GEO.pawnCollar} material={PAWN_MATS[color].collar} />');

content = content.replace(/<mesh castShadow position=\{\[0, 0\.3, 0\]\}>[\s\S]*?<\/mesh>/, 
  '<mesh castShadow position={[0, 0.3, 0]} geometry={GEO.pawnHead} material={PAWN_MATS[color].head} />');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacements completed successfully.');
