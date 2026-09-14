const fs = require('fs');

function processFile(file, isDrei=false) {
  let content = fs.readFileSync(file, 'utf8');

  let geos = new Map();
  let mats = new Map();
  let i = 0;
  let j = 0;

  if (!isDrei) {
    const geoRegex = /<(cylinderGeometry|torusGeometry|octahedronGeometry|sphereGeometry|boxGeometry|planeGeometry)\s+args={([^}]+)}\s*\/>/g;
    content = content.replace(geoRegex, (match, tag, args) => {
      let name = tag.replace('Geometry', '').toUpperCase() + '_' + i++;
      geos.set(name, `const GEO_${name} = new THREE.${tag.charAt(0).toUpperCase() + tag.slice(1)}(...${args});`);
      return `geometry={GEO_${name}}`;
    });

    const matRegex = /<(meshPhysicalMaterial|meshStandardMaterial)([\s\S]*?)\/>/g;
    content = content.replace(matRegex, (match, tag, props) => {
      if (match.includes('material=')) return match; // Already processed
      let name = tag.replace('Material', '').toUpperCase() + '_' + j++;
      let propsObj = props
        .replace(/([a-zA-Z0-9_]+)={([^}]+)}/g, '$1: $2, ')
        .replace(/([a-zA-Z0-9_]+)="([^"]+)"/g, '$1: "$2", ')
        .replace(/\n/g, '')
        .trim();
      
      // Handle boolean flags like clearcoat={1.0} -> clearcoat: 1.0, which is handled by the first replace.
      // But standalone flags like 'receiveShadow' -> 'receiveShadow: true'
      // Only do this if we can safely split. Actually, three.js materials don't take `receiveShadow` in constructor, they take it on the object! But wait, standard mesh takes receiveShadow. Let's leave props as they are if they are just keys, or map them correctly.
      
      let cleanProps = propsObj.replace(/side={THREE.DoubleSide}/g, 'side: THREE.DoubleSide, ');
      
      mats.set(name, `const MAT_${name} = new THREE.${tag.charAt(0).toUpperCase() + tag.slice(1)}({ ${cleanProps} });`);
      return `material={MAT_${name}}`;
    });

    const meshFixRegex = /<mesh([^>]*)>\s*geometry={([^}]+)}\s*material={([^}]+)}\s*<\/mesh>/g;
    content = content.replace(meshFixRegex, '<mesh$1 geometry={$2} material={$3} />');

    const extraMeshFixRegex = /<mesh([^>]*)>\s*geometry={([^}]+)}\s*<\/mesh>/g;
    content = content.replace(extraMeshFixRegex, '<mesh$1 geometry={$2} />');
  }

  let imports = Array.from(geos.values()).join('\n') + '\n' + Array.from(mats.values()).join('\n');
  if (imports.trim().length > 0) {
    let lastImport = content.lastIndexOf('import ');
    let nextNewline = content.indexOf('\n', lastImport);
    content = content.slice(0, nextNewline + 1) + '\n' + imports + '\n' + content.slice(nextNewline + 1);
  }

  fs.writeFileSync(file, content);
}

processFile('d:/Web App - Aqua Blue/src/components/games/RouletteGame.tsx');
processFile('d:/Web App - Aqua Blue/src/components/games/Basketball3DGame.tsx');
