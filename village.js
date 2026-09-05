// village.js — one continuous winter road.
// Everything is constructed geometry (no GLB): wood, snow, glass, brass.
// Exports the scene, the camera rig path, and the interactive props.

import * as THREE from './vendor/three.module.min.js';

// ————— palette —————
const C = {
  night: 0x070b14,
  snowFresh: 0xdfe2e0,
  snowPack: 0xaab6cc,
  woodDark: 0x33241a,
  woodMid: 0x4a3524,
  woodWarm: 0x5b422c,
  green: 0x142c26,
  greenDark: 0x0d1f1b,
  gold: 0xc9a36a,
  goldSoft: 0xe8d3a4,
  berry: 0x9a2c3a,
  windowWarm: 0xffd9a0,
  sky: 0x0a1220,
};

const lam = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const bas = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, ...opts });

// ————— camera path: non-uniform keyframes through the stops —————
// t values follow the brief's village map.
export const STOP_T = { approach: 0, gate: 0.08, lane: 0.22, cottages: 0.34, stall: 0.48, clocks: 0.62, gallery: 0.76, desk: 0.88, tree: 0.965 };

const KEYS = [
  { t: 0.00, pos: [0.0, 2.15, 15.5], look: [0, 2.1, 8.0] },
  { t: 0.04, pos: [0.0, 2.15, 11.0], look: [0, 2.0, 4.0] },
  { t: 0.08, pos: [0.15, 2.05, 8.6], look: [0.7, 1.25, 2.9] },   // gate + envelope
  { t: 0.13, pos: [0.35, 2.15, 2.4], look: [-0.3, 2.4, -5.0] },  // push through
  { t: 0.17, pos: [-0.45, 2.15, -2.6], look: [0, 2.5, -10.0] },
  { t: 0.22, pos: [-0.4, 2.15, -6.6], look: [0.2, 2.4, -13.0] }, // lantern lane
  { t: 0.28, pos: [0.2, 2.15, -13.6], look: [0, 2.0, -22.0] },
  { t: 0.34, pos: [0.0, 2.15, -22.2], look: [0, 1.5, -29.7] },   // two cottages
  { t: 0.40, pos: [0.0, 2.15, -30.9], look: [0.7, 1.8, -38.0] },
  { t: 0.44, pos: [0.45, 2.15, -35.4], look: [1.3, 1.6, -43.0] },
  { t: 0.48, pos: [0.35, 2.15, -39.2], look: [1.3, 1.45, -44.6] }, // the stall
  { t: 0.54, pos: [0.1, 2.15, -46.2], look: [-0.8, 2.2, -53.0] },
  { t: 0.58, pos: [-0.3, 2.15, -50.2], look: [-0.7, 2.1, -58.0] },
  { t: 0.62, pos: [-0.3, 2.15, -52.2], look: [-0.5, 2.0, -59.5] }, // clockmaker
  { t: 0.68, pos: [0.0, 2.15, -60.6], look: [0, 2.4, -68.0] },
  { t: 0.72, pos: [0.0, 2.15, -65.0], look: [0, 2.5, -72.0] },
  { t: 0.76, pos: [0.0, 2.15, -67.6], look: [0, 2.5, -74.0] },   // gallery of places
  { t: 0.82, pos: [0.0, 2.15, -75.0], look: [0.4, 1.9, -82.0] },
  { t: 0.85, pos: [0.2, 2.15, -78.6], look: [0.6, 1.5, -86.0] },
  { t: 0.88, pos: [0.15, 2.15, -81.6], look: [0.55, 1.35, -86.4] }, // the desk
  { t: 0.93, pos: [0.0, 2.3, -88.6], look: [0, 3.6, -99.0] },
  { t: 0.97, pos: [0.0, 2.5, -94.6], look: [0, 4.6, -106.3] },
  { t: 1.00, pos: [0.0, 2.55, -96.4], look: [0, 4.4, -106.3] },  // the tree
];

function cr(a, b, c, d, s) {
  const s2 = s * s, s3 = s2 * s;
  return 0.5 * ((2 * b) + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
}

function sampleKeys(t, field) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
  const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const span = Math.max(1e-5, k2.t - k1.t);
  const s = THREE.MathUtils.clamp((t - k1.t) / span, 0, 1);
  return [
    cr(k0[field][0], k1[field][0], k2[field][0], k3[field][0], s),
    cr(k0[field][1], k1[field][1], k2[field][1], k3[field][1], s),
    cr(k0[field][2], k1[field][2], k2[field][2], k3[field][2], s),
  ];
}

export function cameraPose(t, outPos, outLook) {
  const p = sampleKeys(t, 'pos'), l = sampleKeys(t, 'look');
  outPos.set(p[0], p[1], p[2]);
  outLook.set(l[0], l[1], l[2]);
}

// road centerline x at a given z (interpolated from the camera keyframes)
export function roadX(z) {
  const zs = KEYS.map((k) => k.pos[2]).reverse();
  const xs = KEYS.map((k) => k.pos[0]).reverse();
  for (let i = 0; i < zs.length - 1; i++) {
    if (z <= zs[i] && z >= zs[i + 1]) {
      const s = (zs[i] - z) / Math.max(1e-5, zs[i] - zs[i + 1]);
      return xs[i] + (xs[i + 1] - xs[i]) * s;
    }
  }
  return 0;
}

// ————— anchors for HTML overlays (world space) —————
export const ANCHORS = {
  envelope: new THREE.Vector3(0.95, 1.22, 2.9),
  laneAir: new THREE.Vector3(0.3, 2.7, -11),
  doorL: new THREE.Vector3(-1.62, 1.35, -29.62),
  doorR: new THREE.Vector3(1.62, 1.35, -29.62),
  cottageSign: new THREE.Vector3(0, 3.05, -29.6),
  unsurePlaque: new THREE.Vector3(0, 0.75, -30.2),
  benchBusy: new THREE.Vector3(-3.2, 1.15, -28.4),
  stallSign: new THREE.Vector3(1.3, 3.0, -45.2),
  yesToken: new THREE.Vector3(0.85, 1.38, -44.7),
  noOrnament: new THREE.Vector3(1.7, 1.35, -44.7),
  stallA: new THREE.Vector3(0.25, 1.0, -44.5),
  stallB: new THREE.Vector3(2.5, 1.0, -44.5),
  watches: [
    new THREE.Vector3(-1.7, 1.95, -59.5),
    new THREE.Vector3(-0.6, 2.3, -59.5),
    new THREE.Vector3(0.6, 2.3, -59.5),
    new THREE.Vector3(1.7, 1.95, -59.5),
  ],
  globes: [
    new THREE.Vector3(-1.65, 2.25, -70.2),
    new THREE.Vector3(1.65, 2.65, -72.1),
    new THREE.Vector3(-1.65, 2.2, -74.0),
    new THREE.Vector3(1.65, 2.6, -75.9),
    new THREE.Vector3(-1.65, 2.25, -77.8),
    new THREE.Vector3(1.65, 2.65, -79.7),
    new THREE.Vector3(-1.65, 2.25, -81.6),
  ],
  deskNote: new THREE.Vector3(0.55, 1.3, -86.3),
  treeCard: new THREE.Vector3(0, 7.0, -105.6),
  letterBench: new THREE.Vector3(-2.7, 1.05, -103.6),
  star: new THREE.Vector3(0, 9.45, -106.3),
};

// ————— geometry builders —————

function mergeGeometries(geos) {
  let totalVerts = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const indices = [];
  let vOffset = 0;
  for (const g of geos) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    pos.set(p, vOffset * 3);
    norm.set(n, vOffset * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices.push(g.index.array[i] + vOffset);
      }
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) {
        indices.push(i + vOffset);
      }
    }
    vOffset += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setIndex(indices);
  return merged;
}

function buildGableRoof(W, D, H, roofH, roofMat, snowMat, wallMat, overX = 0.22, overZ = 0.25) {
  const g = new THREE.Group();

  // Triangular gable pediments (front & back walls closing the attic)
  const gableGeo = new THREE.BufferGeometry();
  const gablePositions = new Float32Array([
    // Front triangle (facing +Z)
    -W / 2, H, D / 2,
     W / 2, H, D / 2,
     0, H + roofH, D / 2,
    // Back triangle (facing -Z)
     W / 2, H, -D / 2,
    -W / 2, H, -D / 2,
     0, H + roofH, -D / 2,
  ]);
  gableGeo.setAttribute('position', new THREE.BufferAttribute(gablePositions, 3));
  gableGeo.computeVertexNormals();
  const gableMesh = new THREE.Mesh(gableGeo, wallMat);
  g.add(gableMesh);

  // Sloped roof slabs with eaves
  const hw = W / 2 + overX;
  const L = Math.hypot(hw, roofH);
  const pitch = Math.atan2(roofH, hw);
  const totalD = D + overZ * 2;

  // Left slope
  const leftGroup = new THREE.Group();
  leftGroup.position.set(-hw / 2, H + roofH / 2, 0);
  leftGroup.rotation.z = pitch;
  const leftWood = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, totalD), roofMat);
  leftGroup.add(leftWood);
  const leftSnow = new THREE.Mesh(new THREE.BoxGeometry(L + 0.04, 0.12, totalD + 0.04), snowMat);
  leftSnow.position.y = 0.10;
  leftGroup.add(leftSnow);
  g.add(leftGroup);

  // Right slope
  const rightGroup = new THREE.Group();
  rightGroup.position.set(hw / 2, H + roofH / 2, 0);
  rightGroup.rotation.z = -pitch;
  const rightWood = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, totalD), roofMat);
  rightGroup.add(rightWood);
  const rightSnow = new THREE.Mesh(new THREE.BoxGeometry(L + 0.04, 0.12, totalD + 0.04), snowMat);
  rightSnow.position.y = 0.10;
  rightGroup.add(rightSnow);
  g.add(rightGroup);

  // Snow ridge cap along the peak
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, totalD + 0.06, 12), snowMat);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(0, H + roofH + 0.03, 0);
  g.add(ridge);

  return g;
}

// ————— world builder —————

export function createVillage(preset, photoUrls) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.night, 0.021);
  scene.background = new THREE.Color(C.night);

  const props = { interactive: [] };

  // ————— lights —————
  const hemi = new THREE.HemisphereLight(0x5a6a90, 0x1c1610, 0.6);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb3d4, 0.5);
  moon.position.set(-30, 44, -8);
  scene.add(moon);
  const pathFill = new THREE.DirectionalLight(0xffd9b8, 0.22);
  pathFill.position.set(6, 14, 10);
  scene.add(pathFill);

  const addPoint = (color, intensity, dist, pos) => {
    const l = new THREE.PointLight(color, intensity, dist, 1.8);
    l.position.copy(pos);
    scene.add(l);
    return l;
  };
  const gateLight = addPoint(0xffb066, 6, 20, new THREE.Vector3(0.85, 2.7, 3.0));
  const stallLight = addPoint(0xff9a4d, 5, 16, new THREE.Vector3(1.3, 2.7, -44.6));
  const treeLight = addPoint(0xffd28f, 8, 26, new THREE.Vector3(0, 5.0, -105.4));
  const candleLight = addPoint(0xff9a4d, 1.8, 7, new THREE.Vector3(0.95, 1.45, -86.1));
  addPoint(0xffc37a, 3, 16, new THREE.Vector3(0, 3.2, -11));
  addPoint(0xffb066, 3.5, 16, new THREE.Vector3(0, 3.0, -31));
  props.flickerLights = [gateLight, stallLight, treeLight, candleLight];
  props.stallLight = stallLight;

  // ————— sky —————
  const skyGeo = new THREE.SphereGeometry(210, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.016, 0.024, 0.055);
        vec3 mid = vec3(0.043, 0.070, 0.125);
        vec3 hor = vec3(0.075, 0.090, 0.145);
        vec3 col = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.9, h))
                            : mix(hor, mid, smoothstep(-0.05, 0.25, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // stars
  {
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = 0.12 + Math.random() * 0.85;
      const r = 195;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd0ee, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.75 })));
  }

  // moon + halo
  const glowTex = makeGlowTexture();
  if (preset.glow) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcfe0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(46, 46, 1);
    halo.position.set(-64, 58, -150);
    scene.add(halo);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf4f7ff, transparent: true, opacity: 0.95, depthWrite: false }));
    disc.scale.set(7, 7, 1);
    disc.position.copy(halo.position);
    scene.add(disc);
  }

  // ————— ground —————
  {
    const W = 260, D = 300, seg = 60;
    const geo = new THREE.PlaneGeometry(W, D, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const posA = geo.attributes.position;
    const colors = new Float32Array(posA.count * 3);
    const fresh = new THREE.Color(C.snowFresh);
    const dip = new THREE.Color(0xc7d2e6);
    const tmp = new THREE.Color();
    for (let i = 0; i < posA.count; i++) {
      const x = posA.getX(i), z = posA.getZ(i);
      const dRoad = Math.abs(x - roadX(z));
      const bank = THREE.MathUtils.smoothstep(dRoad, 2.2, 12.0);
      const n = pseudoNoise(x * 0.09, z * 0.09) * 0.55 + pseudoNoise(x * 0.23, z * 0.23) * 0.2;
      const y = bank * (0.7 + n * 1.5) - 0.06 + n * 0.08 * (1 - bank);
      posA.setY(i, y);
      tmp.lerpColors(dip, fresh, THREE.MathUtils.clamp(0.45 + y * 0.5 + n * 0.25, 0, 1));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  }

  // ————— packed-snow path ribbon —————
  {
    const pts = [];
    const half = 0.95;
    for (let z = 22; z >= -112; z -= 1.2) {
      const x = roadX(z);
      pts.push(x - half, 0.03, z, x + half, 0.03, z);
    }
    const idx = [];
    const cols = pts.length / 6;
    for (let i = 0; i < cols - 1; i++) {
      const a = i * 2, b = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, c2, b, b, c2, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: C.snowPack })));
  }

  // ————— distant forest (instanced) + mountains —————
  {
    const t1 = new THREE.ConeGeometry(1.05, 1.35, 6);
    t1.translate(0, 0.65, 0);
    const t2 = new THREE.ConeGeometry(0.80, 1.15, 6);
    t2.translate(0, 1.45, 0);
    const t3 = new THREE.ConeGeometry(0.52, 0.95, 6);
    t3.translate(0, 2.15, 0);
    const treeGeo = mergeGeometries([t1, t2, t3]);
    const mat = lam(C.greenDark);
    const n = preset.extraMeshes ? 64 : 34;
    const inst = new THREE.InstancedMesh(treeGeo, mat, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const nearApproach = i < n * 0.3;
      const z = nearApproach ? 8 + Math.random() * 26 : -8 - Math.random() * 130;
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = roadX(z) + side * (5.5 + Math.random() * 26);
      const s = 0.7 + Math.random() * 1.7;
      m.makeScale(s, s * (0.8 + Math.random() * 0.7), s);
      m.setPosition(x, s * 1.4 * 0.8, z);
      inst.setMatrixAt(i, m);
    }
    scene.add(inst);
    if (preset.extraMeshes) {
      [[-55, -160, 30, 20], [15, -175, 38, 24], [70, -155, 26, 17]].forEach(([x, z, r, h]) => {
        const mt = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), lam(0x0d1526));
        mt.position.set(x, h / 2 - 2, z);
        scene.add(mt);
      });
    }
  }

  // ————— the gate (Scene 0) —————
  const gate = new THREE.Group();
  {
    const postGeo = new THREE.CylinderGeometry(0.14, 0.17, 3.4, 8);
    [-1.3, 1.3].forEach((x) => {
      const post = new THREE.Mesh(postGeo, lam(C.woodMid));
      post.position.set(x, 1.7, 3.0);
      gate.add(post);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 8), lam(C.woodDark));
      cap.position.set(x, 3.55, 3.0);
      gate.add(cap);
      const capSnow = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.16, 8), lam(C.snowFresh));
      capSnow.position.set(x, 3.68, 3.0);
      gate.add(capSnow);
      const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6), lam(C.woodDark));
      lampPost.position.set(x * 0.72, 0.55, 3.6);
      gate.add(lampPost);
    });
    // arch beam + fresh snow layer
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.22, 0.24), lam(C.woodMid));
    beam.position.set(0, 3.28, 3.0);
    gate.add(beam);
    const beamSnow = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.08, 0.26), lam(C.snowFresh));
    beamSnow.position.set(0, 3.42, 3.0);
    gate.add(beamSnow);
    // wreath
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 8, 20), lam(C.green));
    wreath.position.set(0, 3.28, 3.13);
    gate.add(wreath);
    for (let i = 0; i < 9; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), lam(C.berry));
      const a = (i / 9) * Math.PI * 2;
      berry.position.set(Math.cos(a) * 0.42, 3.28 + Math.sin(a) * 0.42, 3.24);
      gate.add(berry);
    }
    // bell
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.3 }));
    bell.position.set(0, 3.02, 3.05);
    bell.rotation.x = Math.PI;
    gate.add(bell);
    bell.userData.kind = 'bell';
    props.interactive.push(bell);
    props.bell = bell;

    // post table + envelope
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.5), lam(C.woodWarm));
    top.position.y = 0.92;
    table.add(top);
    [[-0.34, -0.16], [0.34, -0.16], [-0.34, 0.16], [0.34, 0.16]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.92, 6), lam(C.woodDark));
      leg.position.set(x, 0.46, z);
      table.add(leg);
    });
    table.position.set(0.95, 0, 2.9);
    table.rotation.y = -0.28;
    gate.add(table);

    const envelope = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.23), lam(0xf3ead8));
    envelope.add(body);
    const flap = new THREE.Group();
    const flapGeo = new THREE.BufferGeometry();
    flapGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.17, 0, -0.115, 0.17, 0, -0.115, 0, 0, 0.12,
    ]), 3));
    flapGeo.computeVertexNormals();
    const flapMesh = new THREE.Mesh(flapGeo, lam(0xead9c1, { side: THREE.DoubleSide }));
    flap.add(flapMesh);
    flap.position.set(0, 0.028, -0.115);
    envelope.add(flap);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.018, 12), lam(0x8e1f2c));
    seal.position.set(0, 0.04, -0.02);
    envelope.add(seal);
    envelope.position.set(0.95, 0.99, 2.9);
    envelope.rotation.y = -0.28;
    gate.add(envelope);
    props.envelope = envelope;
    props.envelopeFlap = flap;
    props.envelopeSeal = seal;

    if (preset.glow) {
      const g1 = sprite(glowTex, 0xffb066, 2.6, 0.5);
      g1.position.set(0.85, 2.75, 3.0);
      gate.add(g1);
      const g2 = sprite(glowTex, 0xffc37a, 1.5, 0.35);
      g2.position.set(0.95, 1.15, 2.88);
      gate.add(g2);
    }
    // the one lantern seen from the dark approach
    const farLantern = sprite(glowTex, 0xffb066, 3.4, 0.5);
    farLantern.position.set(0.85, 2.75, 3.0);
    scene.add(farLantern);
  }
  scene.add(gate);

  // ————— cottages (Scene 1) —————
  props.doors = {};
  function cottage(x, z, rotY, warm) {
    const g = new THREE.Group();
    const W = 2.6, D = 2.4, H = 1.8;
    const bodyMat = lam(warm ? 0x4a3220 : 0x37414f);
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bodyMat);
    body.position.y = H / 2;
    g.add(body);

    // Single cohesive alpine gable roof with deep eaves, snow mantle and ridge cap
    const roofMat = lam(warm ? 0x241a12 : 0x1c2430);
    const snowMat = lam(0xf4f1e8);
    const roof = buildGableRoof(W, D, H, 1.15, roofMat, snowMat, bodyMat, 0.22, 0.25);
    g.add(roof);

    // Corner timber framing posts
    const postMat = lam(C.woodDark);
    [
      [-W / 2 + 0.05, -D / 2 + 0.05],
      [ W / 2 - 0.05, -D / 2 + 0.05],
      [-W / 2 + 0.05,  D / 2 - 0.05],
      [ W / 2 - 0.05,  D / 2 - 0.05],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.12), postMat);
      post.position.set(px, H / 2, pz);
      g.add(post);
    });

    // Masonry stone chimney + smoke emitter
    const chGroup = new THREE.Group();
    const chBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.34), lam(0x3e352e));
    chBody.position.set(0.65, H + 0.85, 0.35);
    chGroup.add(chBody);
    const chRim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), lam(0x28221c));
    chRim.position.set(0.65, H + 1.32, 0.35);
    chGroup.add(chRim);
    const chSnow = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.40), snowMat);
    chSnow.position.set(0.65, H + 1.38, 0.35);
    chGroup.add(chSnow);
    g.add(chGroup);

    if (preset.smoke) {
      const chPos = new THREE.Vector3(0.65, H + 1.45, 0.35)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
        .add(new THREE.Vector3(x, 0, z));
      props.smokeEmitters.push({ pos: chPos, next: 0 });
    }

    // windows with mullions and snow sills
    const winMat = bas(warm ? 0xffd9a0 : 0x9fb6d8);
    [[-0.62, 1.15, D / 2 + 0.01], [0.62, 1.15, D / 2 + 0.01]].forEach(([wx, wy, wz]) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.4), winMat);
      win.position.set(wx, wy, wz);
      g.add(win);
      const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.035, 0.02), lam(C.woodDark));
      mullionH.position.set(wx, wy, wz + 0.005);
      g.add(mullionH);
      const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.02), lam(C.woodDark));
      mullionV.position.set(wx, wy, wz + 0.005);
      g.add(mullionV);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.08), lam(C.woodDark));
      sill.position.set(wx, wy - 0.22, wz + 0.03);
      g.add(sill);
      const sillSnow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.07), snowMat);
      sillSnow.position.set(wx, wy - 0.19, wz + 0.03);
      g.add(sillSnow);
    });
    g.userData.windowMat = winMat;
    if (preset.glow) {
      const wg = sprite(glowTex, warm ? 0xffc37a : 0xa8c0e8, 2.2, 0.3);
      wg.position.set(0, 1.2, D / 2 + 0.3);
      g.add(wg);
    }
    // porch canopy with snow overhang above door
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.04, 0.42), lam(C.woodDark));
    canopy.position.set(0, 1.76, D / 2 + 0.20);
    canopy.rotation.x = 0.16;
    g.add(canopy);
    const canopySnow = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.08, 0.44), snowMat);
    canopySnow.position.set(0, 1.81, D / 2 + 0.20);
    canopySnow.rotation.x = 0.16;
    g.add(canopySnow);

    // porch light
    const porch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), bas(0xffd9a0));
    porch.position.set(0, 1.62, D / 2 + 0.18);
    g.add(porch);

    // the door — hinged
    const doorPivot = new THREE.Group();
    const dw = 0.78, dh = 1.52;
    const door = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, 0.06), lam(warm ? 0x5b422c : 0x44506a));
    door.position.set(dw / 2, dh / 2, 0);
    doorPivot.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.35 }));
    knob.position.set(dw - 0.1, dh * 0.52, 0.05);
    doorPivot.add(knob);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.14, dh + 0.1, 0.08), lam(C.woodDark));
    frame.position.set(dw / 2, dh / 2, -0.02);
    doorPivot.add(frame);
    doorPivot.position.set(-dw / 2, 0, D / 2 + 0.03);
    g.add(doorPivot);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
    return { group: g, doorPivot, winMat };
  }
  props.smokeEmitters = [];
  const cottageL = cottage(-3.6, -31.2, 0.5, true);
  const cottageR = cottage(3.7, -31.2, -0.5, false);
  // doors face the road; the tap labels sit at ANCHORS.doorL/doorR
  props.doors.left = cottageL;
  props.doors.right = cottageR;

  // busy-ending bench near the cottages (hidden until needed)
  {
    const bench = makeBench();
    bench.position.set(-3.2, 0, -28.6);
    bench.rotation.y = 0.9;
    bench.visible = false;
    scene.add(bench);
    props.benchBusy = bench;
  }

  // ————— shops along the lane —————
  props.shopWindows = [];
  [
    { x: 3.4, z: -5.5, rot: -0.5 },
    { x: -3.6, z: -9.5, rot: 0.5 },
    { x: 3.5, z: -13.5, rot: -0.45 },
  ].forEach((s, i) => {
    const g = new THREE.Group();
    const W = 2.6, H = 2.3, D = 2.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), lam(0x2e2118));
    body.position.y = H / 2;
    g.add(body);

    // Single cohesive alpine gable roof
    const roofMat = lam(0x1a130d);
    const snowMat = lam(0xf4f1e8);
    const roof = buildGableRoof(W, D, H, 1.15, roofMat, snowMat, lam(0x2e2118), 0.22, 0.22);
    g.add(roof);

    // Corner timber framing posts
    const postMat = lam(C.woodDark);
    [
      [-W / 2 + 0.05, -D / 2 + 0.05],
      [ W / 2 - 0.05, -D / 2 + 0.05],
      [-W / 2 + 0.05,  D / 2 - 0.05],
      [ W / 2 - 0.05,  D / 2 - 0.05],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.12), postMat);
      post.position.set(px, H / 2, pz);
      g.add(post);
    });

    // Shop window
    const winMat = bas(0x241a12);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.95), winMat);
    win.position.set(0, 1.05, 1.11);
    g.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.08, 0.05), lam(C.woodDark));
    frame.position.set(0, 1.05, 1.09);
    g.add(frame);

    // Window pane mullions
    const mullH = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.035, 0.02), lam(C.woodDark));
    mullH.position.set(0, 1.05, 1.115);
    g.add(mullH);
    [-0.34, 0.34].forEach((mx) => {
      const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.95, 0.02), lam(C.woodDark));
      mullV.position.set(mx, 1.05, 1.115);
      g.add(mullV);
    });

    // Window sill with snow
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.05, 0.08), lam(C.woodDark));
    sill.position.set(0, 0.54, 1.13);
    g.add(sill);
    const sillSnow = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.03, 0.07), snowMat);
    sillSnow.position.set(0, 0.58, 1.13);
    g.add(sillSnow);

    // Shop signboard above window
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 0.05), lam(C.woodWarm));
    sign.position.set(0, 1.82, 1.13);
    g.add(sign);
    const signSnow = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 0.07), snowMat);
    signSnow.position.set(0, 2.0, 1.13);
    g.add(signSnow);

    // Chimney with snow and smoke
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), lam(0x352b22));
    ch.position.set(0.65, H + 0.45, -0.2);
    g.add(ch);
    const chSnow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), snowMat);
    chSnow.position.set(0.65, H + 0.87, -0.2);
    g.add(chSnow);
    if (preset.smoke) {
      const chPos = new THREE.Vector3(0.65, H + 0.95, -0.2)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot)
        .add(new THREE.Vector3(s.x, 0, s.z));
      props.smokeEmitters.push({ pos: chPos, next: i * 0.35 });
    }

    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.rot;
    scene.add(g);
    props.shopWindows.push({ mat: winMat, lit: false, litT: 0.08 + i * 0.045, glow: null, mesh: win });
    win.userData.kind = 'shopWindow';
    win.userData.idx = i;
    props.interactive.push(win);
  });

  // ————— lantern lane —————
  props.lanterns = [];
  {
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.7, 6);
    for (let i = 0; i < 9; i++) {
      const z = -1.5 - i * 1.85;
      const x = (i % 2 === 0 ? 1 : -1) * (2.0 + (i % 3) * 0.25);
      const pole = new THREE.Mesh(poleGeo, lam(C.woodDark));
      pole.position.set(x, 1.35, z);
      scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), lam(C.woodDark));
      arm.position.set(x - Math.sign(x) * 0.25, 2.66, z);
      scene.add(arm);
      const lamp = new THREE.Group();
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.17), lam(C.woodDark));
      lamp.add(cage);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.19), lam(C.snowFresh));
      cap.position.y = 0.13;
      lamp.add(cap);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), bas(0xffd9a0));
      lamp.add(glass);
      lamp.position.set(x - Math.sign(x) * 0.48, 2.52, z);
      scene.add(lamp);
      const glow = preset.glow ? sprite(glowTex, 0xffb066, 1.7, 0.5) : null;
      if (glow) { glow.position.copy(lamp.position); scene.add(glow); }
      props.lanterns.push({ mesh: lamp, glow, phase: Math.random() * 7 });
      lamp.userData.kind = 'lantern';
      lamp.userData.idx = i;
      props.interactive.push(lamp);
    }
  }

  // ————— frozen rivulet —————
  props.rivuletTex = null;
  {
    const shape = [];
    for (let z = -12; z >= -48; z -= 2) {
      const x = 3.4 + Math.sin(z * 0.16) * 0.9 + roadX(z) * 0.4;
      shape.push([x, z]);
    }
    const verts = [], idx = [];
    const w = 1.1;
    shape.forEach(([x, z], i) => {
      verts.push(x - w, 0.06, z, x + w, 0.06, z);
      if (i < shape.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const tex = makeNoiseTexture();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 10);
    props.rivuletTex = tex;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const ice = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9fb8d8, map: tex, transparent: true, opacity: 0.85 }));
    scene.add(ice);
    // sparkle points on the ice
    const n = 26;
    const pos = new Float32Array(n * 3);
    shape.forEach(([x, z], i) => {
      if (i >= n) return;
      pos[i * 3] = x + (Math.random() - 0.5) * 1.6;
      pos[i * 3 + 1] = 0.09;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 1.6;
    });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe9ff, size: 0.05, transparent: true, opacity: 0.8 })));
  }

  // ————— the stall (Scene 2) —————
  props.stall = new THREE.Group();
  {
    const st = props.stall;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 0.9), lam(C.woodWarm));
    counter.position.set(1.3, 0.45, -44.7);
    st.add(counter);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 1.0), lam(C.woodDark));
    counterTop.position.set(1.3, 0.93, -44.7);
    st.add(counterTop);
    // posts + awning
    [[0.25, -44.25], [2.35, -44.25], [0.25, -45.15], [2.35, -45.15]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.3, 6), lam(C.woodDark));
      post.position.set(x, 1.15, z);
      st.add(post);
    });
    const awningTex = makeStripeTexture();
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.35), new THREE.MeshLambertMaterial({ map: awningTex, side: THREE.DoubleSide }));
    awning.position.set(1.3, 2.42, -44.66);
    awning.rotation.x = -0.32;
    st.add(awning);
    // fresh snow ridge along top of awning
    const awningSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.74, 8), lam(C.snowFresh));
    awningSnow.rotation.z = Math.PI / 2;
    awningSnow.position.set(1.3, 2.63, -45.15);
    st.add(awningSnow);
    // pot with steam
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.3, 12), lam(0x2a2118));
    pot.position.set(0.75, 1.11, -44.6);
    st.add(pot);
    if (preset.smoke) props.steamEmitters = [{ pos: new THREE.Vector3(0.75, 1.3, -44.6), next: 0 }];
    // sign board
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.06), lam(C.woodMid));
    sign.position.set(1.3, 3.0, -45.05);
    sign.rotation.x = -0.06;
    st.add(sign);
    const signSnow = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.05, 0.09), lam(C.snowFresh));
    signSnow.position.set(1.3, 3.26, -45.05);
    st.add(signSnow);
    // crates
    [[2.75, 0, -44.4, 0.5], [-0.15, 0, -44.3, 0.38]].forEach(([x, y, z, s]) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), lam(C.woodMid));
      crate.position.set(x, s / 2, z);
      crate.rotation.y = Math.random();
      st.add(crate);
      const crateSnow = new THREE.Mesh(new THREE.BoxGeometry(s * 0.92, 0.04, s * 0.92), lam(C.snowFresh));
      crateSnow.position.set(x, s + 0.02, z);
      crateSnow.rotation.y = crate.rotation.y;
      st.add(crateSnow);
    });
    // yes token (brass) and the ornament (3d until it flees)
    const yes3d = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.75, roughness: 0.3 }));
    yes3d.position.set(0.85, 0.98, -44.7);
    st.add(yes3d);
    const no3d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), new THREE.MeshStandardMaterial({ color: 0xb32a38, metalness: 0.15, roughness: 0.15 }));
    no3d.position.set(1.78, 1.05, -44.7);
    st.add(no3d);
    props.yes3d = yes3d;
    props.no3d = no3d;
    // string lights
    const bulbPts = [];
    for (let i = 0; i <= 12; i++) {
      const s = i / 12;
      bulbPts.push(0.2 + s * 2.2, 2.28 - Math.sin(s * Math.PI) * 0.3, -44.24);
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bulbPts), 3));
    props.stallBulbs = new THREE.Points(bgeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.055, transparent: true, opacity: 0.95 }));
    st.add(props.stallBulbs);
    if (preset.glow) {
      const sg = sprite(glowTex, 0xffb066, 2.4, 0.4);
      sg.position.set(1.3, 2.3, -44.5);
      st.add(sg);
    }
    scene.add(st);
  }

  // ————— the clockmaker (Scene 3) —————
  props.watches = [];
  {
    const beamZ = -59.5;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 0.14), lam(C.woodMid));
    beam.position.set(0, 2.85, beamZ);
    scene.add(beam);
    const beamSnow = new THREE.Mesh(new THREE.BoxGeometry(4.44, 0.06, 0.16), lam(C.snowFresh));
    beamSnow.position.set(0, 2.94, beamZ);
    scene.add(beamSnow);
    [[-2.2], [2.2]].forEach(([x]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.9, 8), lam(C.woodDark));
      post.position.set(x, 1.45, beamZ);
      scene.add(post);
    });
    ANCHORS.watches.forEach((p, i) => {
      const w = new THREE.Group();
      // chain from the top of the watch up to the beam at y 2.85
      const chainLen = Math.max(0.05, 2.85 - p.y - 0.27);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, chainLen, 4), bas(0x8a6b34));
      chain.position.set(0, 0.27 + chainLen / 2, 0);
      w.add(chain);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 24), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.35 }));
      w.add(ring);
      const faceMat = bas(0xf6efe2);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.245, 24), faceMat);
      face.position.z = 0.006;
      w.add(face);
      const faceTex = makeWatchFaceTexture();
      const faceDetail = new THREE.Mesh(new THREE.CircleGeometry(0.245, 24), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }));
      faceDetail.position.z = 0.008;
      w.add(faceDetail);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.3 }));
      crown.position.set(0, 0.29, 0);
      w.add(crown);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.016, 6, 28), bas(0xffe2a8, { transparent: true, opacity: 0 }));
      glowRing.position.z = 0.01;
      w.add(glowRing);
      w.position.copy(p);
      scene.add(w);
      props.watches.push({ group: w, ring: glowRing, phase: i * 1.7, selected: false });
    });
  }

  // ————— the gallery of places (Scene 4) —————
  props.globes = [];
  {
    // covered walk: two wooden rails running along the path the globes hang from
    [-1.3, 1.3].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 13.5), lam(C.woodMid));
      rail.position.set(rx, 3.9, -75.4);
      scene.add(rail);
      [-6.7, 6.7].forEach((dz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.95, 8), lam(C.woodDark));
        post.position.set(rx + Math.sign(rx) * 0.55, 1.97, -75.4 + dz);
        scene.add(post);
      });
    });
    // cross beams every few meters
    for (let z = -70; z >= -81; z -= 2.75) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.09, 0.09), lam(C.woodDark));
      beam.position.set(0, 3.86, z);
      scene.add(beam);
    }
    photoUrls.forEach((url, i) => {
      const p = ANCHORS.globes[i];
      const g = new THREE.Group();
      const ribbonLen = Math.max(0.05, 3.86 - p.y - 0.46);
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, ribbonLen, 4), bas(0x6b5a40));
      ribbon.position.set(0, 0.46 + ribbonLen / 2, 0);
      g.add(ribbon);
      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 20, 16),
        new THREE.MeshPhongMaterial({ color: 0x8fa8cc, transparent: true, opacity: 0.16, shininess: 90, specular: 0x99aabb, depthWrite: false })
      );
      g.add(glass);
      const photoTex = new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image;
        if (img && img.width && img.height) {
          const aspect = img.width / img.height;
          if (aspect > 1) {
            tex.repeat.set(1 / aspect, 1);
            tex.offset.set((1 - 1 / aspect) / 2, 0);
          } else {
            tex.repeat.set(1, aspect);
            tex.offset.set(0, (1 - aspect) / 2);
          }
        }
      });
      // the camera walks down -z, so the photo's +z face looks back up the path
      const photo = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshBasicMaterial({ map: photoTex, toneMapped: false }));
      photo.position.z = 0.06;
      g.add(photo);
      const base = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 26), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.7, roughness: 0.35 }));
      base.rotation.x = Math.PI / 2;
      base.position.y = -0.44;
      g.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 6, 30), bas(0xffe2a8, { transparent: true, opacity: 0 }));
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      g.position.copy(p);
      scene.add(g);
      props.globes.push({ group: g, ring, baseY: p.y, selected: false, idx: i });
    });
  }

  // ————— the desk (Scene 5) —————
  {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 0.16), lam(0x33261a));
    back.position.set(0.55, 1.5, -88.1);
    g.add(back);
    [[-1.1], [2.2]].forEach(([x]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 2.4), lam(0x3d2e1f));
      wall.position.set(0.55 + x, 1.5, -87.0);
      g.add(wall);
    });
    // window with night inside
    const nightWin = bas(0x0a1526);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), nightWin);
    win.position.set(0.55, 1.9, -88.0);
    g.add(win);
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.16, 0.06), lam(C.woodDark));
    winFrame.position.set(0.55, 1.9, -88.0);
    g.add(winFrame);
    const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.07), lam(C.woodDark));
    mullV.position.set(0.55, 1.9, -88.0);
    g.add(mullV);
    const mullH = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 0.07), lam(C.woodDark));
    mullH.position.set(0.55, 1.9, -88.0);
    g.add(mullH);
    const winGlow = preset.glow ? sprite(glowTex, 0x33456a, 2.6, 0.25) : null;
    if (winGlow) { winGlow.position.set(0.55, 1.9, -87.8); g.add(winGlow); }
    // desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), lam(C.woodWarm));
    desk.position.set(0.55, 0.88, -86.3);
    g.add(desk);
    [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.88, 6), lam(C.woodDark));
      leg.position.set(0.55 + dx, 0.44, -86.3 + dz);
      g.add(leg);
    });
    // paper + wax seal
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), lam(0xf3ead8));
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.18;
    paper.position.set(0.45, 0.925, -86.25);
    g.add(paper);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.02, 14), lam(0x8e1f2c));
    wax.position.set(0.45, 0.94, -86.25);
    wax.scale.set(0.01, 1, 0.01); // poured on "Seal the letter"
    g.add(wax);
    props.deskWax = wax;
    // candle
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.14, 8), lam(0xf3ead8));
    candle.position.set(0.95, 0.99, -86.1);
    g.add(candle);
    const flame = sprite(glowTex, 0xffc37a, 0.5, 0.9);
    flame.position.set(0.95, 1.12, -86.1);
    g.add(flame);
    scene.add(g);
  }

  // ————— the tree (Scene 6) —————
  props.treeOrnaments = [];
  {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.7, 8), lam(0x3a2a1c));
    trunk.position.set(0, 0.85, -106.3);
    g.add(trunk);
    // 5 tiered evergreen foliage layers with natural snow mantles and bough puffs
    const tiers = [
      [2.40, 2.7, 2.6],
      [1.95, 2.4, 4.3],
      [1.50, 2.1, 5.9],
      [1.05, 1.8, 7.3],
      [0.65, 1.5, 8.5],
    ];
    const foliageColors = [0x0f241a, 0x143324, 0x1a402e, 0x122e20, 0x183b2b];
    const snowMat = lam(0xf5f7f2);
    const puffGeo = new THREE.SphereGeometry(0.10, 6, 5);

    tiers.forEach(([r, h, y], i) => {
      // Main pine cone tier
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), lam(foliageColors[i]));
      cone.position.set(0, y, -106.3);
      g.add(cone);

      // Cohesive snow mantle matching the slope of the pine foliage
      const snowMantle = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, h * 0.60, 14), snowMat);
      snowMantle.position.set(0, y + h * 0.20, -106.3);
      g.add(snowMantle);

      // Soft snow puffs along the outer boughs
      const puffCount = Math.floor(r * 4.2);
      for (let p = 0; p < puffCount; p++) {
        const a = (p / puffCount) * Math.PI * 2 + (i * 0.6);
        const pr = r * 0.90;
        const puff = new THREE.Mesh(puffGeo, snowMat);
        puff.scale.set(1.2, 0.7, 1.0);
        puff.position.set(Math.cos(a) * pr, y - h * 0.44, -106.3 + Math.sin(a) * pr);
        g.add(puff);
      }
    });

    // Ornaments across all 5 tiers
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xdfb758, metalness: 0.75, roughness: 0.25 });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xaa2030, metalness: 0.45, roughness: 0.25 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd8e4f0, metalness: 0.75, roughness: 0.3 });
    const orbMats = [goldMat, berryMat, silverMat];

    for (let i = 0; i < 35; i++) {
      const tier = i % 5;
      const [r, h, y] = tiers[tier];
      const a = Math.random() * Math.PI * 2;
      const rr = r * (0.60 + Math.random() * 0.32);
      const oy = y - h * 0.38 + Math.random() * h * 0.48;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), orbMats[i % 3]);
      orb.position.set(Math.cos(a) * rr, oy, -106.3 + Math.sin(a) * rr);
      orb.userData.kind = 'treeOrnament';
      g.add(orb);
      props.treeOrnaments.push(orb);
      props.interactive.push(orb);
    }

    // Fairy light helix winding up the tree
    const n = 72;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const s = i / n;
      const y = 1.35 + s * 7.8;
      const tR = 2.25 * (1 - s * 0.80) + 0.12;
      const a = s * Math.PI * 15;
      pos[i * 3] = Math.cos(a) * tR;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = -106.3 + Math.sin(a) * tR;
    }
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    props.treeBulbs = new THREE.Points(lgeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.07, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(props.treeBulbs);

    // 8-pointed golden Bethlehem star
    const starGroup = new THREE.Group();
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a8,
      metalness: 0.55,
      roughness: 0.2,
      emissive: 0xbb8a24,
      emissiveIntensity: 0.75,
    });
    const starCore1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.44), starMat);
    starCore1.scale.set(0.55, 1.05, 0.55);
    starGroup.add(starCore1);
    const starCore2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), starMat);
    starCore2.rotation.z = Math.PI / 4;
    starCore2.scale.set(0.55, 0.95, 0.55);
    starGroup.add(starCore2);
    const starGem = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), starMat);
    starGroup.add(starGem);
    starGroup.position.copy(ANCHORS.star);
    starGroup.rotation.y = 0.4;
    g.add(starGroup);
    props.star = starGroup;
    if (preset.glow) {
      const sg = sprite(glowTex, 0xffd9a0, 4.6, 0.55);
      sg.position.copy(ANCHORS.star);
      g.add(sg);
      const tg = sprite(glowTex, 0xffc37a, 7.5, 0.22);
      tg.position.set(0, 4.4, -105.6);
      g.add(tg);
    }
    // mound + gifts
    const mound = new THREE.Mesh(new THREE.SphereGeometry(2.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xf1eee4));
    mound.scale.y = 0.28;
    mound.position.set(0, 0.02, -106.3);
    g.add(mound);
    [[-1.9, -104.6, 0.4, C.berry], [-2.6, -107.4, 0.32, C.gold], [1.9, -105.0, 0.36, 0x2e4a6b], [2.4, -107.6, 0.45, C.berry], [0.4, -104.1, 0.3, C.gold]].forEach(([x, z, s, col]) => {
      const gift = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.72, s), lam(col));
      gift.position.set(x, s * 0.36, z);
      gift.rotation.y = Math.random() * Math.PI;
      g.add(gift);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 0.74, s * 0.16), lam(0xf3ead8));
      rib.position.copy(gift.position);
      rib.rotation.y = gift.rotation.y;
      g.add(rib);
    });
    scene.add(g);
    // bench + the finished letter
    const bench = makeBench();
    bench.position.set(-2.7, 0, -103.6);
    bench.rotation.y = 0.7;
    scene.add(bench);
    const letter = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), lam(0xf6efe2));
    letter.position.set(-2.55, 0.56, -103.45);
    letter.rotation.y = 0.7;
    scene.add(letter);
  }

  // ————— lamp posts down the whole road —————
  if (preset.extraMeshes) {
    for (let i = 0; i < 9; i++) {
      const z = 1 - i * 11.5;
      const x = roadX(z) + (i % 2 ? 2.5 : -2.5);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.6, 6), lam(C.woodDark));
      pole.position.set(x, 1.3, z);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), lam(C.woodDark));
      head.position.set(x, 2.7, z);
      scene.add(head);
      const headSnow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), lam(C.snowFresh));
      headSnow.position.set(x, 2.82, z);
      scene.add(headSnow);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), bas(0xffd9a0));
      bulb.position.set(x, 2.68, z);
      scene.add(bulb);
      if (preset.glow) {
        const gl = sprite(glowTex, 0xffb066, 1.9, 0.4);
        gl.position.set(x, 2.68, z);
        scene.add(gl);
      }
    }
  }

  // smoke / steam sprite pools
  props.smokeSprites = [];
  props.steamSprites = [];
  if (preset.smoke) {
    const puffTex = makePuffTexture();
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xb9c2d4, transparent: true, opacity: 0, depthWrite: false }));
      scene.add(s);
      props.smokeSprites.push({ s, life: -1 });
    }
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf2ead9, transparent: true, opacity: 0, depthWrite: false }));
      scene.add(s);
      props.steamSprites.push({ s, life: -1 });
    }
  }

  return { scene, props, glowTex };
}

// ————— helpers —————

function sprite(tex, color, scale, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(scale, scale, 1);
  return s;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,240,210,0.55)');
  grd.addColorStop(0.6, 'rgba(255,220,160,0.16)');
  grd.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makePuffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeNoiseTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#aac2e2';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 340; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 10 + 2, 1.5);
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(40,70,120,${Math.random() * 0.25})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 14 + 3, 1);
  }
  return new THREE.CanvasTexture(c);
}

function makeStripeTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#f6efe2' : '#8e2f3a';
    g.fillRect(i * 16, 0, 16, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWatchFaceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f6efe2';
  g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8a6b34';
  g.lineWidth = 3;
  g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.lineWidth = i % 3 === 0 ? 4 : 2;
    g.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
    g.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54);
    g.stroke();
  }
  g.strokeStyle = '#3c2e1a';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 30, 64 - 18); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 8, 64 - 40); g.stroke();
  g.fillStyle = '#8e1f2c';
  g.beginPath(); g.arc(64, 64, 4, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBench() {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.44), lam(C.woodWarm));
  seat.position.y = 0.52;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.06), lam(C.woodWarm));
  back.position.set(0, 0.82, -0.2);
  g.add(back);
  [[-0.62], [0.62]].forEach(([x]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.4), lam(C.woodDark));
    leg.position.set(x, 0.26, 0);
    g.add(leg);
  });
  return g;
}

function pseudoNoise(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// ————— per-frame world animation —————
export function animateVillage(props, time, dt, scrollVel, still) {
  if (still) return;
  // window + lantern flicker
  props.flickerLights.forEach((l, i) => {
    l.intensity = l.userData.base || (l.userData.base = l.intensity);
    l.intensity = l.userData.base * (1 + Math.sin(time * 9 + i * 2.4) * 0.04 + Math.sin(time * 23 + i) * 0.02);
  });
  // lantern glow breathing
  if (props.lanterns) {
    props.lanterns.forEach(({ glow, phase }) => {
      if (glow) glow.material.opacity = 0.42 + Math.sin(time * 1.7 + phase) * 0.12;
    });
  }
  // watch swing
  if (props.watches) {
    props.watches.forEach((w) => {
      w.group.rotation.z = Math.sin(time * 0.8 + w.phase) * 0.07;
    });
  }
  // chimney smoke
  const emit = (pool, emitters, rise, spread, scaleTo, baseOpacity) => {
    if (!pool || !pool.length) return;
    emitters.forEach((em) => {
      em.next -= dt;
      if (em.next <= 0) {
        em.next = 0.5 + Math.random() * 0.4;
        const free = pool.find((p) => p.life <= 0);
        if (free) {
          free.life = 0;
          free.max = 2.6 + Math.random() * 1.2;
          free.origin = em.pos.clone();
          free.drift = (Math.random() - 0.5) * spread;
        }
      }
    });
    pool.forEach((p) => {
      if (p.life < 0) return;
      p.life += dt;
      const s = p.life / p.max;
      if (s >= 1) { p.life = -1; p.s.material.opacity = 0; return; }
      p.s.position.set(
        p.origin.x + Math.sin(p.life * 1.1) * p.drift + p.life * p.drift * 0.3,
        p.origin.y + p.life * rise,
        p.origin.z + Math.cos(p.life * 0.9) * p.drift * 0.5
      );
      const sc = 0.35 + s * scaleTo;
      p.s.scale.set(sc, sc, 1);
      p.s.material.opacity = baseOpacity * Math.sin(Math.min(1, s * 1.15) * Math.PI);
    });
  };
  emit(props.smokeSprites, props.smokeEmitters || [], 1.05, 0.5, 1.9, 0.34);
  emit(props.steamSprites, props.steamEmitters || [], 0.75, 0.22, 0.8, 0.5);
  // rivulet streaks with scroll speed
  if (props.rivuletTex) {
    props.rivuletTex.offset.y -= (0.02 + Math.min(0.25, Math.abs(scrollVel) * 2.2)) * dt * 2;
  }
  // star slow spin
  if (props.star) props.star.rotation.y = time * 0.25;
}
