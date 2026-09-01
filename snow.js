// snow.js — 3D snow with depth, wind sway, and touch flurries.
// One THREE.Points cloud recycled around the camera + a small burst pool.

import * as THREE from './vendor/three.module.min.js';

function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,252,244,1)');
  grd.addColorStop(0.45, 'rgba(248,244,236,0.85)');
  grd.addColorStop(1, 'rgba(248,244,236,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Snow {
  constructor(scene, count) {
    this.count = count;
    this.range = { x: 34, y: 16, z: 34 };
    this.swayT = 0;

    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3); // per-flake fall speed
    this.phase = new Float32Array(count);
    this.size = new Float32Array(count);
    for (let i = 0; i < count; i++) this.spawn(i, true);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.16,
      map: flakeTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    // — burst pool for touch flurries / bell startles —
    this.burstN = 90;
    const bgeo = new THREE.BufferGeometry();
    this.burstPos = new Float32Array(this.burstN * 3);
    this.burstVel = new Float32Array(this.burstN * 3);
    this.burstLife = new Float32Array(this.burstN).fill(0);
    bgeo.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));
    this.burstMat = this.material.clone();
    this.burstMat.opacity = 0.95;
    this.burstMat.size = 0.12;
    this.burst = new THREE.Points(bgeo, this.burstMat);
    this.burst.frustumCulled = false;
    this.burst.visible = false;
    scene.add(this.burst);
  }

  spawn(i, scatter) {
    const r = this.range;
    this.pos[i * 3] = (Math.random() - 0.5) * r.x * 2;
    this.pos[i * 3 + 1] = scatter ? Math.random() * r.y : r.y + Math.random() * 4;
    this.pos[i * 3 + 2] = (Math.random() - 0.5) * r.z * 2;
    this.vel[i] = 0.35 + Math.random() * 0.75; // fall speed
    this.phase[i] = Math.random() * Math.PI * 2;
    this.size[i] = 0.5 + Math.random() * 0.9;
  }

  // follow the camera so snow is always around her
  follow(camera) {
    this.points.position.set(camera.position.x, 0, camera.position.z);
  }

  // shrink the flake count when the quality tier drops
  setCount(count) {
    if (count >= this.count) return;
    this.count = count;
    this.pos = this.pos.slice(0, count * 3);
    this.vel = this.vel.slice(0, count);
    this.phase = this.phase.slice(0, count);
    this.points.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  burstAt(worldPoint, n = 26, spread = 1.6, up = 1.2) {
    let spawned = 0;
    for (let i = 0; i < this.burstN && spawned < n; i++) {
      if (this.burstLife[i] > 0) continue;
      const k = i * 3;
      this.burstPos[k] = worldPoint.x + (Math.random() - 0.5) * 0.4;
      this.burstPos[k + 1] = worldPoint.y + (Math.random() - 0.5) * 0.3;
      this.burstPos[k + 2] = worldPoint.z + (Math.random() - 0.5) * 0.4;
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * spread;
      this.burstVel[k] = Math.cos(a) * s;
      this.burstVel[k + 1] = up * (0.6 + Math.random() * 0.8);
      this.burstVel[k + 2] = Math.sin(a) * s;
      this.burstLife[i] = 1.4 + Math.random() * 0.6;
      spawned++;
    }
    if (spawned) this.burst.visible = true;
  }

  update(dt, camera, still) {
    if (still) { this.follow(camera); return; }
    this.swayT += dt;
    const wind = Math.sin(this.swayT * 0.4) * 0.35 + Math.sin(this.swayT * 0.13) * 0.2;
    const r = this.range;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      this.pos[k + 1] -= this.vel[i] * dt;
      this.pos[k] += (wind + Math.sin(this.swayT * 1.3 + this.phase[i]) * 0.25) * dt;
      if (this.pos[k + 1] < -0.4) {
        this.pos[k + 1] = r.y + Math.random() * 3;
        this.pos[k] = (Math.random() - 0.5) * r.x * 2;
        this.pos[k + 2] = (Math.random() - 0.5) * r.z * 2;
      }
      // keep flakes inside the local window of the camera-following cloud
      if (this.pos[k] > r.x) this.pos[k] -= r.x * 2;
      if (this.pos[k] < -r.x) this.pos[k] += r.x * 2;
      if (this.pos[k + 2] > r.z) this.pos[k + 2] -= r.z * 2;
      if (this.pos[k + 2] < -r.z) this.pos[k + 2] += r.z * 2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    // bursts
    let alive = false;
    for (let i = 0; i < this.burstN; i++) {
      if (this.burstLife[i] <= 0) continue;
      alive = true;
      this.burstLife[i] -= dt;
      const k = i * 3;
      this.burstVel[k + 1] -= 1.6 * dt;
      this.burstPos[k] += this.burstVel[k] * dt;
      this.burstPos[k + 1] += this.burstVel[k + 1] * dt;
      this.burstPos[k + 2] += this.burstVel[k + 2] * dt;
      if (this.burstLife[i] <= 0) this.burstPos[k + 1] = -999;
    }
    if (alive) {
      this.burst.geometry.attributes.position.needsUpdate = true;
    } else {
      this.burst.visible = false;
    }
    this.follow(camera);
  }
}
