import * as THREE from 'three';

/**
 * High-Quality Subdivision-Ready 3D Geometry Generators for Chess Pieces
 * Uses high-density radial profiles (96 radial segments), smooth spline curves,
 * merged sub-features (Rook battlements, King cross), and computed vertex normals.
 */

const RADIAL_SEGMENTS = 96;

/**
 * Helper to generate smooth profile points from control points using CatmullRomCurve2
 */
function createSmoothProfile(controlPoints: THREE.Vector2[], samplesPerSegment: number = 8): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(controlPoints);
  const totalSamples = (controlPoints.length - 1) * samplesPerSegment;
  return curve.getPoints(totalSamples);
}

/**
 * Creates turned piece lathe geometry from an array of 2D profile points.
 */
function createTurnedGeometry(points: THREE.Vector2[]): THREE.BufferGeometry {
  const geo = new THREE.LatheGeometry(points, RADIAL_SEGMENTS);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to safely merge multiple BufferGeometries and compute continuous smooth normals.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexedGeos = geometries.map(g => (g.index ? g.toNonIndexed() : g.clone()));

  let totalCount = 0;
  nonIndexedGeos.forEach(g => {
    totalCount += g.attributes.position.count;
  });

  const positions = new Float32Array(totalCount * 3);
  const uvs = new Float32Array(totalCount * 2);

  let offsetPos = 0;
  let offsetUv = 0;

  nonIndexedGeos.forEach(g => {
    const pos = g.attributes.position.array;
    positions.set(pos, offsetPos);
    offsetPos += pos.length;

    if (g.attributes.uv) {
      uvs.set(g.attributes.uv.array, offsetUv);
      offsetUv += g.attributes.uv.array.length;
    } else {
      const numVerts = pos.length / 3;
      for (let i = 0; i < numVerts; i++) {
        uvs[offsetUv + i * 2] = 0;
        uvs[offsetUv + i * 2 + 1] = 0;
      }
      offsetUv += numVerts * 2;
    }
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.computeVertexNormals();
  return merged;
}

// 1. PAWN GEOMETRY
export function createPawnGeometry(): THREE.BufferGeometry {
  const ctrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.38, 0.0),
    new THREE.Vector2(0.38, 0.04),
    new THREE.Vector2(0.34, 0.08),
    new THREE.Vector2(0.36, 0.12),
    new THREE.Vector2(0.31, 0.16),
    new THREE.Vector2(0.18, 0.32),
    new THREE.Vector2(0.15, 0.48),
    new THREE.Vector2(0.17, 0.60),
    new THREE.Vector2(0.26, 0.64),
    new THREE.Vector2(0.24, 0.68),
    new THREE.Vector2(0.18, 0.70),
  ];

  const profile = createSmoothProfile(ctrlPoints, 6);

  // Head sphere points
  const headRadius = 0.22;
  const headCenterY = 0.88;
  for (let i = 0; i <= 20; i++) {
    const angle = (i / 20) * Math.PI * 0.85 - Math.PI * 0.4;
    const x = Math.cos(angle) * headRadius;
    const y = headCenterY + Math.sin(angle) * headRadius;
    if (x >= 0 && y >= 0.70) {
      profile.push(new THREE.Vector2(x, y));
    }
  }
  profile.push(new THREE.Vector2(0.0, headCenterY + headRadius));

  return createTurnedGeometry(profile);
}

// 2. ROOK GEOMETRY
export function createRookGeometry(): THREE.BufferGeometry {
  const ctrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.39, 0.0),
    new THREE.Vector2(0.39, 0.05),
    new THREE.Vector2(0.34, 0.09),
    new THREE.Vector2(0.36, 0.14),
    new THREE.Vector2(0.31, 0.18),
    new THREE.Vector2(0.24, 0.40),
    new THREE.Vector2(0.22, 0.65),
    new THREE.Vector2(0.30, 0.75),
    new THREE.Vector2(0.32, 0.82),
    new THREE.Vector2(0.32, 1.02),
    new THREE.Vector2(0.24, 1.02),
    new THREE.Vector2(0.24, 0.88),
    new THREE.Vector2(0.0, 0.88),
  ];

  const baseGeo = createTurnedGeometry(createSmoothProfile(ctrlPoints, 6));

  // 4 Top Crenelated Battlement Teeth
  const teethGeos: THREE.BufferGeometry[] = [baseGeo];
  const toothWidth = 0.11;
  const toothHeight = 0.16;
  const toothDepth = 0.12;

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const toothGeo = new THREE.BoxGeometry(toothWidth, toothHeight, toothDepth, 4, 4, 4);
    const radius = 0.26;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    toothGeo.translate(x, 0.96, z);
    toothGeo.rotateY(angle);
    teethGeos.push(toothGeo);
  }

  return mergeBufferGeometries(teethGeos);
}

// 3. BISHOP GEOMETRY
export function createBishopGeometry(): THREE.BufferGeometry {
  const ctrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.38, 0.0),
    new THREE.Vector2(0.38, 0.05),
    new THREE.Vector2(0.34, 0.09),
    new THREE.Vector2(0.36, 0.14),
    new THREE.Vector2(0.31, 0.18),
    new THREE.Vector2(0.18, 0.45),
    new THREE.Vector2(0.16, 0.72),
    new THREE.Vector2(0.26, 0.78),
    new THREE.Vector2(0.24, 0.82),
    new THREE.Vector2(0.17, 0.85),
  ];

  const profile = createSmoothProfile(ctrlPoints, 6);

  // Mitre oval head
  const headCenterY = 1.08;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const angle = t * Math.PI - Math.PI / 2;
    const rx = 0.24 * Math.cos(angle);
    const ry = 0.32 * Math.sin(angle) + headCenterY;
    if (rx >= 0) {
      profile.push(new THREE.Vector2(rx, ry));
    }
  }

  // Finial ball top
  profile.push(new THREE.Vector2(0.06, 1.42));
  profile.push(new THREE.Vector2(0.08, 1.46));
  profile.push(new THREE.Vector2(0.0, 1.50));

  return createTurnedGeometry(profile);
}

// 4. KNIGHT GEOMETRY
export function createKnightGeometry(): THREE.BufferGeometry {
  const baseCtrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.39, 0.0),
    new THREE.Vector2(0.39, 0.05),
    new THREE.Vector2(0.34, 0.09),
    new THREE.Vector2(0.36, 0.14),
    new THREE.Vector2(0.30, 0.18),
    new THREE.Vector2(0.26, 0.32),
    new THREE.Vector2(0.28, 0.36),
    new THREE.Vector2(0.0, 0.36),
  ];

  const baseGeo = createTurnedGeometry(createSmoothProfile(baseCtrlPoints, 6));

  // Horse Head Shape Profile
  const shape = new THREE.Shape();
  shape.moveTo(-0.18, 0.36);
  shape.lineTo(0.22, 0.36);
  shape.bezierCurveTo(0.30, 0.50, 0.28, 0.80, 0.20, 1.10);
  shape.lineTo(0.14, 1.25);
  shape.lineTo(0.08, 1.15);
  shape.bezierCurveTo(-0.02, 1.18, -0.12, 1.12, -0.22, 0.95);
  shape.bezierCurveTo(-0.28, 0.85, -0.26, 0.72, -0.16, 0.65);
  shape.bezierCurveTo(-0.08, 0.58, -0.10, 0.48, -0.18, 0.36);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 4,
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 6,
  };

  const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  headGeo.center();
  headGeo.translate(0, 0.78, 0);

  return mergeBufferGeometries([baseGeo, headGeo]);
}

// 5. QUEEN GEOMETRY
export function createQueenGeometry(): THREE.BufferGeometry {
  const ctrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.40, 0.0),
    new THREE.Vector2(0.40, 0.06),
    new THREE.Vector2(0.35, 0.10),
    new THREE.Vector2(0.37, 0.15),
    new THREE.Vector2(0.31, 0.20),
    new THREE.Vector2(0.19, 0.52),
    new THREE.Vector2(0.17, 0.85),
    new THREE.Vector2(0.28, 0.90),
    new THREE.Vector2(0.25, 0.95),
    new THREE.Vector2(0.19, 0.98),
    new THREE.Vector2(0.32, 1.25),
    new THREE.Vector2(0.34, 1.34),
    new THREE.Vector2(0.28, 1.36),
    new THREE.Vector2(0.12, 1.32),
  ];

  const profile = createSmoothProfile(ctrlPoints, 6);

  // Finial Orb on Queen crown
  const orbCenterY = 1.44;
  const orbRadius = 0.09;
  for (let i = 0; i <= 16; i++) {
    const angle = (i / 16) * Math.PI - Math.PI / 2;
    const x = Math.cos(angle) * orbRadius;
    const y = orbCenterY + Math.sin(angle) * orbRadius;
    if (x >= 0) {
      profile.push(new THREE.Vector2(x, y));
    }
  }

  return createTurnedGeometry(profile);
}

// 6. KING GEOMETRY
export function createKingGeometry(): THREE.BufferGeometry {
  const ctrlPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.42, 0.06),
    new THREE.Vector2(0.36, 0.10),
    new THREE.Vector2(0.38, 0.16),
    new THREE.Vector2(0.32, 0.22),
    new THREE.Vector2(0.20, 0.55),
    new THREE.Vector2(0.18, 0.92),
    new THREE.Vector2(0.30, 0.98),
    new THREE.Vector2(0.27, 1.03),
    new THREE.Vector2(0.20, 1.06),
    new THREE.Vector2(0.34, 1.36),
    new THREE.Vector2(0.35, 1.44),
    new THREE.Vector2(0.24, 1.46),
    new THREE.Vector2(0.10, 1.42),
    new THREE.Vector2(0.0, 1.46),
  ];

  const bodyGeo = createTurnedGeometry(createSmoothProfile(ctrlPoints, 6));

  // Regal 3D Cross Top Emblem
  const crossParts: THREE.BufferGeometry[] = [bodyGeo];

  // Vertical bar
  const vBar = new THREE.BoxGeometry(0.06, 0.22, 0.06, 2, 4, 2);
  vBar.translate(0, 1.57, 0);
  crossParts.push(vBar);

  // Horizontal bar
  const hBar = new THREE.BoxGeometry(0.16, 0.06, 0.06, 4, 2, 2);
  hBar.translate(0, 1.61, 0);
  crossParts.push(hBar);

  // Center orb node
  const orb = new THREE.SphereGeometry(0.05, 16, 16);
  orb.translate(0, 1.61, 0);
  crossParts.push(orb);

  return mergeBufferGeometries(crossParts);
}

// Factory dictionary for instant geometry retrieval
export const PIECE_GEOMETRIES: Record<string, () => THREE.BufferGeometry> = {
  p: createPawnGeometry,
  r: createRookGeometry,
  n: createKnightGeometry,
  b: createBishopGeometry,
  q: createQueenGeometry,
  k: createKingGeometry,
};

