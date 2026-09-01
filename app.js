// app.js — the invitation inside the village.
// Scenes, state, copy, the runaway No, the D-day tree, and the letter.

import * as THREE from './vendor/three.module.min.js';
import { quality, watchFPS, onTierDrop } from './quality.js';
import { audio } from './audio.js';
import { Snow } from './snow.js';
import { createVillage, cameraPose, animateVillage, ANCHORS } from './village.js';
import { ScrollRig } from './scroll-rig.js';

const STORAGE_KEY = 'yera-christmas-2026';

// ————— state —————
const defaultState = {
  availability: null, // free | busy | unsure
  hangout: null,      // yes | no
  times: [],
  timeUnsure: false,
  places: [],
  customPlace: '',
  memo: '',
  noButtonEscapes: 0,
  letterOpened: false,
  completedAt: null,
  cameraT: 0,
};
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, times: [], places: [] };
    const s = JSON.parse(raw);
    return { ...defaultState, ...s };
  } catch (e) { return { ...defaultState, times: [], places: [] }; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

// ————— content —————
const SLOTS = [
  { id: 'eve-morning', title: 'Christmas Eve morning', when: 'Thu 24 Dec, morning', note: 'Quieter. Better photos.', around: '10:00' },
  { id: 'eve-lunch', title: 'Christmas Eve lunch', when: 'Thu 24 Dec, midday', note: 'Eat, then walk.', around: '12:30' },
  { id: 'eve-dinner', title: 'Christmas Eve dinner', when: 'Thu 24 Dec, evening', note: 'Lights at their best.', around: '18:00' },
  { id: 'xmas-after-church', title: 'Christmas Day after church', when: 'Fri 25 Dec, after service', note: 'After church, no rush.', around: '13:30' },
];

const PLACES = [
  { id: 'the-hyundai-yeouido', name: 'The Hyundai Seoul Christmas village', hangul: '더현대 서울', area: 'Yeouido · Indoor', note: 'Sounds Forest on the 5th floor', best: 'Best with Eve morning / lunch', tags: ['indoor', 'less'], photo: 'places/hyundai-seoul.jpg' },
  { id: 'coex-starfield-library', name: 'COEX Starfield Library', hangul: '코엑스 별마당 도서관', area: 'Samseong · Indoor', note: 'A tall tree inside the stacks', best: 'Best with Eve dinner / after church', tags: ['indoor'], photo: 'places/coex-starfield.jpg' },
  { id: 'shinsegae-myeongdong', name: 'Shinsegae Myeongdong', hangul: '신세계 본점 명동', area: 'Myeongdong · Indoor + outdoor', note: 'The big tree and the night facade lights', best: 'Best with Eve dinner', tags: ['indoor', 'outdoor'], photo: 'places/shinsegae-myeongdong.jpg' },
  { id: 'lotte-world-tower-market', name: 'Lotte World Tower Christmas market', hangul: '롯데월드타워 크리스마스 마켓', area: 'Jamsil · Outdoor', note: 'Market stalls under the tallest tower', best: 'Best with Eve dinner', tags: ['outdoor'], photo: 'places/lotte-world-tower.jpg' },
  { id: 'gwanghwamun-market', name: 'Gwanghwamun Christmas market', hangul: '광화문 크리스마스 마켓', area: 'Gwanghwamun · Outdoor', note: 'Seoul’s main square market', best: 'Best with Eve lunch / dinner', tags: ['outdoor'], photo: 'places/gwanghwamun-market.jpg' },
  { id: 'cheonggyecheon-lights', name: 'Cheonggyecheon winter lights', hangul: '청계천', area: 'Euljiro · Outdoor walk', note: 'A slow walk along the stream lights', best: 'Best with Eve dinner', tags: ['outdoor', 'less'], photo: 'places/cheonggyecheon.jpg' },
  { id: 'myeongdong-cathedral', name: 'Myeongdong Cathedral', hangul: '명동성당', area: 'Myeongdong · Outdoor', note: 'Red brick that belongs to Christmas', best: 'Best with Christmas Day after church', tags: ['outdoor', 'less'], photo: 'places/myeongdong-cathedral.jpg' },
];

const NO_LABELS = ['No', 'Wait, wrong one', 'Not this', 'Can’t catch it', 'Yes is warmer',
  'The snow is slippery', 'Santa said no to no', 'Think once more', 'Yes is the safe side',
  'Almost unclickable', 'Okay, one more try…', 'No, I really can’t'];

const STOPS = [
  { id: 'approach', t: 0 },
  { id: 'gate', t: 0.08, lock: true },
  { id: 'lane', t: 0.22 },
  { id: 'cottages', t: 0.34, lock: true },
  { id: 'stall', t: 0.48, lock: true },
  { id: 'clocks', t: 0.62, lock: true },
  { id: 'gallery', t: 0.76 },
  { id: 'gallery-lock', t: 0.825, lock: true, hidden: true },
  { id: 'desk', t: 0.88 },
  { id: 'tree', t: 0.965 },
];

// ————— boot: renderer, world, camera —————
const reduced = quality.tier === 'reduced';
const preset = quality.preset;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.tier === 'high', powerPreference: 'high-performance' });
renderer.setPixelRatio(preset.dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;

const { scene, props, glowTex } = createVillage(preset, PLACES.map((p) => p.photo));
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 420);
const snow = new Snow(scene, preset.snow);

// ————— rig —————
const rig = new ScrollRig({
  stops: STOPS,
  dotsEl: document.getElementById('dots'),
  chevronEl: document.getElementById('chevron'),
  reduced,
});
if (state.letterOpened) rig.answer('gate');
if (state.availability) rig.answer('cottages');
if (state.hangout) rig.answer('stall');
if (state.times.length || state.timeUnsure) rig.answer('clocks');
if (state.places.length || state.customPlace) rig.answer('gallery-lock');
const busyMode = state.availability === 'busy';
const realNo = state.hangout === 'no';
if (busyMode || realNo) rig.unlockAll();
if (busyMode && props.benchBusy) props.benchBusy.visible = true;
if (state.completedAt) setTimeout(() => toast('Your last answers are still here'), 2600);
if (reduced) {
  const note = document.getElementById('reduced-note');
  if (note) note.hidden = false;
}

// ————— overlay system —————
const overlaysEl = document.getElementById('overlays');
const registry = [];

function addOverlay({ html, cls = '', anchor, stop, win = 0.05, pin = null, clampTo = 'card', interactive = true }) {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.pointerEvents = 'none';
  overlaysEl.appendChild(el);
  const item = { el, anchor, stopT: stop != null ? STOPS.find((s) => s.id === stop).t : 0, win, pin, clampTo, interactive, visibleFlag: true, userScale: 1 };
  registry.push(item);
  return el;
}

const projV = new THREE.Vector3();
function projectToScreen(anchor) {
  projV.copy(anchor).project(camera);
  return {
    x: (projV.x * 0.5 + 0.5) * window.innerWidth,
    y: (-projV.y * 0.5 + 0.5) * window.innerHeight,
    z: projV.z,
  };
}

const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function windowOpacity(t, stopT, win) {
  const d = Math.abs(t - stopT);
  if (d >= win) return 0;
  return easeOut(1 - d / win);
}

function hideEl(el) {
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
}

function frameOverlays(t) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const vvH = window.visualViewport ? window.visualViewport.height : vh;
  for (const item of registry) {
    const el = item.el;
    if (!item.visibleFlag) { hideEl(el); continue; }
    let o;
    if (item.pin) {
      const { start, end } = item.pin;
      o = t > start - 0.035 && t < end ? easeOut(Math.min(1, (t - (start - 0.035)) / 0.035)) : 0;
      if (t > end - 0.03 && t < end) o *= (end - t) / 0.03;
    } else {
      o = windowOpacity(t, item.stopT, item.win);
    }
    if (o <= 0.015) { hideEl(el); continue; }
    if (item.pin) {
      el.style.opacity = String(o);
      el.style.pointerEvents = o > 0.5 && item.interactive ? 'auto' : 'none';
      continue;
    }
    const p = projectToScreen(item.anchor);
    if (p.z > 1) { hideEl(el); continue; } // behind the camera
    let x = p.x, y = p.y;
    if (item.clampTo === 'card') {
      const w = el.offsetWidth || 300, h = el.offsetHeight || 200;
      const marginX = Math.min(vw * 0.06 + 8, 40) + w / 2;
      x = Math.min(Math.max(x, marginX), vw - marginX);
      const topLim = safeTop() + 74 + h / 2;
      const botLim = vvH - safeBottom() - (h / 2 + 96);
      y = Math.min(Math.max(y, Math.min(topLim, botLim)), Math.max(topLim, botLim));
    } else {
      x = Math.min(Math.max(x, 44), vw - 44);
      y = Math.min(Math.max(y, safeTop() + 60), vvH - 70);
    }
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%,-50%) scale(${(0.86 + 0.14 * o).toFixed(3)})`;
    el.style.opacity = o.toFixed(3);
    el.style.pointerEvents = o > 0.5 && item.interactive ? 'auto' : 'none';
  }
}

function safeTop() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--sat');
  return v ? parseFloat(v) || 0 : 0;
}
function safeBottom() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--sab');
  return v ? parseFloat(v) || 0 : 0;
}

// ————— toast —————
const toastsEl = document.getElementById('toasts');
function toast(text, ms = 3400) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  toastsEl.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 450);
  }, ms);
}

// ————— confetti (gold foil + pine needles + two tiny stars) —————
const confettiCanvas = document.getElementById('confetti');
const c2d = confettiCanvas.getContext('2d');
let confetti = [];
function sizeConfetti() {
  confettiCanvas.width = window.innerWidth * devicePixelRatio;
  confettiCanvas.height = window.innerHeight * devicePixelRatio;
  c2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
sizeConfetti();
function burstConfetti(x, y) {
  const parts = [];
  for (let i = 0; i < 60; i++) parts.push({ kind: 'foil', x, y, vx: (Math.random() - 0.5) * 6.5, vy: -3 - Math.random() * 5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 6, life: 1.6 + Math.random() * 0.5 });
  for (let i = 0; i < 26; i++) parts.push({ kind: 'needle', x, y, vx: (Math.random() - 0.5) * 5.5, vy: -2.5 - Math.random() * 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2, s: 9 + Math.random() * 8, life: 1.5 + Math.random() * 0.5 });
  for (let i = 0; i < 2; i++) parts.push({ kind: 'star', x, y, vx: (Math.random() - 0.5) * 4, vy: -4 - Math.random() * 3, r: 0, vr: 0.06, s: 9, life: 2.1 });
  confetti = confetti.concat(parts);
}
function tickConfetti(dt) {
  if (!confetti.length) { c2d.clearRect(0, 0, window.innerWidth, window.innerHeight); return; }
  c2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti = confetti.filter((p) => {
    p.life -= dt;
    if (p.life <= 0 || p.y > window.innerHeight + 30) return false;
    p.vy += 7.5 * dt; p.vx *= 0.985; p.vy *= 0.99;
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr;
    const sway = Math.sin(p.life * 9) * 0.6;
    c2d.save();
    c2d.translate(p.x + sway, p.y);
    c2d.rotate(p.r);
    c2d.globalAlpha = Math.min(1, p.life * 1.4);
    if (p.kind === 'foil') {
      c2d.fillStyle = ['#e8d3a4', '#c9a36a', '#f6efe2'][Math.floor(p.life * 10) % 3];
      c2d.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    } else if (p.kind === 'needle') {
      c2d.strokeStyle = '#2e5a44';
      c2d.lineWidth = 1.6;
      c2d.beginPath(); c2d.moveTo(-p.s / 2, 0); c2d.lineTo(p.s / 2, 0); c2d.stroke();
    } else {
      c2d.fillStyle = '#e8d3a4';
      c2d.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = a + Math.PI / 5;
        c2d.lineTo(Math.cos(a) * p.s, Math.sin(a) * p.s);
        c2d.lineTo(Math.cos(a2) * p.s * 0.45, Math.sin(a2) * p.s * 0.45);
      }
      c2d.closePath(); c2d.fill();
    }
    c2d.restore();
    return true;
  });
}

// ————— Scene 0 · the gate —————
const envelopeBtn = addOverlay({
  html: `<button id="envelope-tap" type="button" aria-label="Open the letter">
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 8l9 6 9-6"></path></svg>
    <span class="tap-label">Open the letter</span></button>`,
  anchor: ANCHORS.envelope, stop: 'gate', win: 0.06, clampTo: 'none',
});
const gateCaption = addOverlay({
  html: `<div class="card" id="gate-caption" style="min-width:12.5rem;text-align:center">
    <p id="gate-caption-text">A Christmas letter<br>you haven’t opened yet</p></div>`,
  anchor: ANCHORS.envelope.clone().add(new THREE.Vector3(0, -0.72, 0)),
  stop: 'gate', win: 0.06, clampTo: 'card', interactive: false,
});

function tween(fn, dur, done) {
  const t0 = performance.now();
  const step = (now) => {
    const s = Math.min(1, (now - t0) / dur);
    fn(s);
    if (s < 1) requestAnimationFrame(step);
    else if (done) done();
  };
  requestAnimationFrame(step);
}

envelopeBtn.addEventListener('click', () => {
  audio.ensure();
  rig.requestGyro();
  if (state.letterOpened) return;
  state.letterOpened = true;
  saveState();
  const flap = props.envelopeFlap, seal = props.envelopeSeal;
  audio.wax();
  tween((s) => {
    flap.rotation.x = -2.25 * easeOut(s);
    seal.scale.setScalar(Math.max(0.001, 1 - s * 1.1));
  }, 950, () => {
    snow.burstAt(ANCHORS.envelope, 18, 0.7, 0.9);
    audio.chime(1046, 0.06);
  });
  envelopeBtn.style.display = 'none';
  document.getElementById('gate-caption-text').innerHTML = 'It’s open.<br>Walk in when you’re ready.';
  toast('Sound is nicer · mute it at the top right anytime');
  rig.answer('gate');
  setTimeout(() => rig.autoAdvance(STOPS[1].t), 500);
});

// ————— Lantern Lane —————
addOverlay({
  html: `<div class="air-line">Keep walking.</div>`,
  anchor: ANCHORS.laneAir, stop: 'lane', win: 0.085, clampTo: 'none', interactive: false,
});

// ————— Scene 1 · the two cottages —————
const cottageCard = addOverlay({
  html: `<div class="card" style="text-align:center">
    <div class="eyebrow">One thing first</div>
    <h2>Do you already have a promise or a family meeting on Christmas Eve or Christmas?</h2>
    <p>Thursday the 24th and Friday the 25th. If you do, that comes first.</p></div>`,
  anchor: new THREE.Vector3(0, 3.05, -29.6), stop: 'cottages', win: 0.05,
});
function doorHTML(title, sub) {
  return `<button class="door-btn" type="button">
    <span class="door-title">${title}</span><span class="door-sub">${sub}</span><span class="door-knob"></span></button>`;
}
const doorLEl = addOverlay({ html: doorHTML('No, I’m free', 'Those days are still open'), anchor: ANCHORS.doorL, stop: 'cottages', win: 0.048, clampTo: 'none' });
const doorREl = addOverlay({ html: doorHTML('Yes, I’m busy', 'A promise or a family meeting'), anchor: ANCHORS.doorR, stop: 'cottages', win: 0.048, clampTo: 'none' });
const unsureEl = addOverlay({
  html: `<button id="unsure-plaque" type="button">I’m not sure yet</button>`,
  anchor: ANCHORS.unsurePlaque, stop: 'cottages', win: 0.048, clampTo: 'none',
});
const busyBench = addOverlay({
  html: `<div class="card" style="text-align:center">
    <p>Then that comes first. This is not a letter asking you to cancel anything.</p>
    <p style="margin-top:0.4rem">You can still walk the village and watch the snow.</p>
    <div class="hr"></div>
    <p style="margin-bottom:0.5rem">If another day works, leave a line on the bench.</p>
    <input type="text" id="busy-note" placeholder="Another day works / I probably can’t / …" maxlength="120">
    <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.7rem">
      <button class="btn" id="busy-save" type="button" style="min-height:48px;font-size:0.9rem">Save the note</button>
      <button class="btn ghost" id="busy-skip" type="button" style="min-height:48px;font-size:0.9rem">Just watch the snow</button>
    </div></div>`,
  anchor: ANCHORS.benchBusy, stop: 'cottages', win: 0.06,
});
busyBench.style.display = busyMode ? '' : 'none';
if (!busyMode) busyBench.style.pointerEvents = 'none';

function applyDoorVisual(side) {
  if (side === 'left') {
    doorLEl.querySelector('.door-btn').classList.add('chosen');
    doorREl.querySelector('.door-btn').classList.add('dimmed');
  } else if (side === 'right') {
    doorREl.querySelector('.door-btn').classList.add('chosen');
    doorLEl.querySelector('.door-btn').classList.add('dimmed');
  }
}
if (state.availability === 'free') applyDoorVisual('left');
if (state.availability === 'busy') applyDoorVisual('right');

function chooseDoor(side) {
  audio.creak();
  const pivot = props.doors[side === 'left' ? 'left' : 'right'].doorPivot;
  tween((s) => { pivot.rotation.y = (side === 'left' ? -1 : 1) * 1.7 * easeOut(s); }, 800);
  applyDoorVisual(side);
  state.availability = side === 'left' ? 'free' : 'busy';
  saveState();
  rig.answer('cottages');
  if (side === 'right') {
    rig.unlockAll();
    props.benchBusy.visible = true;
    busyBench.style.display = '';
    toast('The warm cottage dims — the tree is still ahead.');
  }
  setTimeout(() => rig.autoAdvance(STOPS[3].t), 750);
}
doorLEl.addEventListener('click', () => chooseDoor('left'));
doorREl.addEventListener('click', () => chooseDoor('right'));
unsureEl.addEventListener('click', () => {
  audio.chime(880, 0.05);
  state.availability = 'unsure';
  saveState();
  rig.answer('cottages');
  unsureEl.querySelector('#unsure-plaque').textContent = 'The days are still open, then.';
  setTimeout(() => rig.autoAdvance(STOPS[3].t), 650);
});
function saveBenchNote() {
  const v = document.getElementById('busy-note').value.trim();
  if (v) state.memo = v;
  saveState();
  toast('Saved on the bench.');
  setTimeout(() => rig.autoAdvance(STOPS[3].t), 400);
}
busyBench.addEventListener('click', (e) => {
  if (e.target.id === 'busy-save') saveBenchNote();
  if (e.target.id === 'busy-skip') { saveState(); setTimeout(() => rig.autoAdvance(STOPS[3].t), 300); }
});

// ————— Scene 2 · the stall —————
const stallCard = addOverlay({
  html: `<div class="card" id="stall-copy" style="text-align:center">
    <div class="eyebrow">Then…</div>
    <h2 id="stall-h">Want to go out and hang out with me at Christmas?</h2>
    <p id="stall-p">Nothing huge. Walk around somewhere pretty, get something warm, that kind of day.</p></div>`,
  anchor: ANCHORS.stallSign, stop: 'stall', win: 0.055,
});
const yesEl = addOverlay({
  html: `<button id="yes-token" class="btn" type="button">Yes, let’s hang out</button>`,
  anchor: ANCHORS.yesToken, stop: 'stall', win: 0.055, clampTo: 'none',
});
const noEl = addOverlay({
  html: `<button id="no-ornament" type="button"><span id="no-label">No</span></button>`,
  anchor: ANCHORS.noOrnament, stop: 'stall', win: 0.055, clampTo: 'none',
});
const usedToSit = addOverlay({
  html: `<div id="used-to-sit"></div><div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);font-size:0.62rem;color:rgba(240,228,200,0.55);white-space:nowrap;text-shadow:0 1px 6px rgba(0,0,0,0.9)">It used to sit here</div>`,
  anchor: ANCHORS.noOrnament, stop: 'stall', win: 0.055, clampTo: 'none', interactive: false,
});
const usedToSitItem = registry.find((r) => r.el === usedToSit);
usedToSitItem.visibleFlag = false; // only after the first flee

const noBtn = noEl.querySelector('#no-ornament');
const noLabel = noEl.querySelector('#no-label');
const noState = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, fleeing: false, settled: true };
let noScreen = { x: 0, y: 0 };

function stallRect() {
  const a = projectToScreen(ANCHORS.stallA);
  const b = projectToScreen(ANCHORS.stallB);
  const yes = projectToScreen(ANCHORS.yesToken);
  const vw = window.innerWidth, vh = window.innerHeight;
  const top = Math.max(safeTop() + 150, yes.y - 190);
  const bottom = Math.min(vh - safeBottom() - 120, yes.y + 150);
  return {
    left: Math.max(58, a.x - 30),
    right: Math.min(vw - 58, b.x + 110),
    top: Math.min(top, bottom - 80),
    bottom,
    yesX: yes.x, yesY: yes.y,
  };
}
function fleeNo() {
  if (state.noButtonEscapes >= 11 || noState.fleeing) return;
  state.noButtonEscapes++;
  saveState();
  noLabel.textContent = NO_LABELS[Math.min(state.noButtonEscapes, NO_LABELS.length - 2)];
  audio.whoosh();
  const r = stallRect();
  let tx, ty, tries = 0;
  do {
    tx = r.left + Math.random() * (r.right - r.left);
    ty = r.top + Math.random() * (r.bottom - r.top);
    tries++;
  } while (Math.hypot(tx - r.yesX, ty - r.yesY) < 130 && tries < 20);
  noState.tx = tx; noState.ty = ty;
  noState.fleeing = true; noState.settled = false;
  if (state.noButtonEscapes === 1) {
    usedToSitItem.visibleFlag = true;
    toast('It moves.');
  }
  props.no3d.visible = false;
}
function springNo(dt) {
  if (noState.settled) return;
  const k = 90, damp = 0.82;
  noState.vx += (noState.tx - noState.x) * k * dt;
  noState.vy += (noState.ty - noState.y) * k * dt;
  noState.vx *= damp; noState.vy *= damp;
  noState.x += noState.vx * dt; noState.y += noState.vy * dt;
  if (Math.hypot(noState.tx - noState.x, noState.ty - noState.y) < 2 && Math.hypot(noState.vx, noState.vy) < 12) {
    noState.settled = true; noState.fleeing = false;
  }
}
function syncNoBase() {
  // until the first flee, the ornament sits where the 3D counter is;
  // after a flee it stays wherever it rolled to
  const p = projectToScreen(ANCHORS.noOrnament);
  noScreen = p;
  if (noState.settled && state.noButtonEscapes === 0) { noState.x = p.x; noState.y = p.y; }
}
noBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  onTapNo();
});
function onTapNo() {
  if (state.noButtonEscapes >= 11) {
    realNoEnding();
  } else if (!reduced) {
    fleeNo();
  } else {
    reducedNoDialog();
  }
}
function reducedNoDialog() {
  toast('Really don’t want to hang out?', 5000);
  const bar = document.createElement('div');
  bar.className = 'toast';
  bar.innerHTML = '<button class="linklike" id="rn-yes" style="color:var(--gold-soft)">Actually, yes</button> · <button class="linklike" id="rn-no" style="color:var(--gold-soft)">Really no</button>';
  toastsEl.appendChild(bar);
  bar.addEventListener('click', (e) => {
    if (e.target.id === 'rn-yes') { chooseYes(); bar.remove(); }
    if (e.target.id === 'rn-no') { realNoEnding(); bar.remove(); }
  });
}
noEl.addEventListener('click', (e) => {
  // pointerdown already handled fleeing; a plain click on a resting ornament also counts
  if (state.noButtonEscapes >= 11) realNoEnding();
});
function chooseYes() {
  audio.shimmer();
  state.hangout = 'yes';
  saveState();
  const y = projectToScreen(ANCHORS.yesToken);
  burstConfetti(y.x, y.y);
  noEl.style.display = 'none';
  props.no3d.visible = false;
  snow.burstAt(ANCHORS.noOrnament, 12, 1.2, 1.0);
  rig.answer('stall');
  setTimeout(() => rig.autoAdvance(STOPS[4].t), 900);
}
yesEl.addEventListener('click', chooseYes);

// proximity flee: finger (or cursor) comes within 88px of the ornament
document.addEventListener('pointerdown', (e) => {
  if (reduced || state.hangout || state.noButtonEscapes >= 11) return;
  const stallActive = Math.abs(rig.t - STOPS[4].t) < 0.045;
  if (!stallActive) return;
  if (e.target.closest('#no-ornament') || e.target.closest('#yes-token')) return;
  const d = Math.hypot(e.clientX - noState.x, e.clientY - noState.y);
  if (d < 88) fleeNo();
}, { passive: true });

function realNoEnding() {
  state.hangout = 'no';
  saveState();
  audio.chime(392, 0.06);
  noBtn.classList.add('real');
  noLabel.textContent = 'No, I really can’t';
  props.stallLight.intensity = 5;
  document.getElementById('stall-h').textContent = 'Okay. You even caught the one that runs away.';
  document.getElementById('stall-p').textContent = 'If we don’t go, have a quiet, pretty Christmas anyway.';
  rig.unlockAll();
  toast('The stall lights dim to blue hour.');
}

// ————— Scene 3 · the clockmaker —————
const clocksCard = addOverlay({
  html: `<div class="card" style="text-align:center">
    <div class="eyebrow">A time that feels easy</div>
    <h2>When is comfortable?</h2>
    <p>Tap every watch that works. More than one is fine.</p>
    <button class="linklike" id="time-unsure" type="button">I’m not sure yet</button>
    <div style="margin-top:0.35rem"><button class="btn" id="times-cta" type="button">Use these times</button></div>
  </div>`,
  anchor: null, stop: 'clocks', pin: { start: 0.575, end: 0.675 }, clampTo: 'none',
});
clocksCard.style.position = 'absolute';
clocksCard.style.left = '50%';
clocksCard.style.top = `calc(${Math.max(20, safeTop())}px + 3.2rem)`;
clocksCard.style.transform = 'translateX(-50%)';
clocksCard.style.transformOrigin = '50% 0%';
const watchEls = SLOTS.map((slot, i) => addOverlay({
  html: `<button class="watch-btn" type="button" data-id="${slot.id}">
    <span class="watch-face">${slot.title}</span>
    <span class="watch-time">${slot.when}</span>
    <span class="watch-note">${slot.note}</span></button>`,
  anchor: ANCHORS.watches[i], stop: 'clocks', win: 0.045, clampTo: 'none',
}));
function refreshWatchVisuals() {
  watchEls.forEach((el, i) => {
    const on = state.times.includes(SLOTS[i].id);
    el.querySelector('.watch-btn').classList.toggle('selected', on);
    props.watches[i].ring.material.opacity = on ? 0.85 : 0;
  });
}
watchEls.forEach((el, i) => el.addEventListener('click', () => {
  const id = SLOTS[i].id;
  if (state.times.includes(id)) state.times = state.times.filter((x) => x !== id);
  else { state.times.push(id); audio.chime(1046 + i * 160, 0.05); }
  saveState();
  refreshWatchVisuals();
}));
refreshWatchVisuals();
document.getElementById('time-unsure').addEventListener('click', () => {
  state.timeUnsure = !state.timeUnsure;
  saveState();
  document.getElementById('time-unsure').style.textDecoration = state.timeUnsure ? 'underline' : 'none';
  document.getElementById('time-unsure').style.color = state.timeUnsure ? 'var(--gold-soft)' : '';
});
if (state.timeUnsure) document.getElementById('time-unsure').style.color = 'var(--gold-soft)';
clocksCard.addEventListener('click', (e) => {
  if (e.target.id !== 'times-cta') return;
  if (!state.times.length && !state.timeUnsure) {
    toast('Tap every watch that works — or “I’m not sure yet”.');
    return;
  }
  rig.answer('clocks');
  saveState();
  setTimeout(() => rig.autoAdvance(STOPS[5].t), 350);
});

// ————— Scene 4 · the gallery of places —————
const galleryCard = addOverlay({
  html: `<div class="card" style="width:min(21rem,88vw)">
    <div class="eyebrow">Where we could walk</div>
    <h2>Which places sound good?</h2>
    <p>Look at the pictures inside the globes. Pick the ones you like.</p>
    <div id="chips" style="margin-top:0.6rem">
      <button class="chip on" data-f="all" type="button">All</button>
      <button class="chip" data-f="indoor" type="button">Indoor</button>
      <button class="chip" data-f="outdoor" type="button">Outdoor</button>
      <button class="chip" data-f="less" type="button">Less crowded</button>
    </div>
    <input type="text" id="custom-place" placeholder="Somewhere else? Hangang, a quiet cafe…" maxlength="80" style="margin-top:0.6rem">
    <div style="display:flex;justify-content:center;margin-top:0.7rem">
      <button class="btn" id="places-cta" type="button">These places</button>
    </div>
  </div>`,
  anchor: null, stop: 'gallery', pin: { start: 0.70, end: 0.845 }, clampTo: 'none',
});
galleryCard.style.position = 'absolute';
galleryCard.style.left = '50%';
galleryCard.style.top = `calc(${Math.max(20, safeTop())}px + 3.4rem)`;
galleryCard.style.transform = 'translateX(-50%)';
galleryCard.style.transformOrigin = '50% 0%';

const globeEls = PLACES.map((pl, i) => addOverlay({
  html: `<button class="globe-btn" type="button" data-id="${pl.id}">
    <span class="globe-photo"><img src="${pl.photo}" alt="${pl.name}" loading="lazy" draggable="false"></span>
    <span class="globe-name">${pl.name}<span class="globe-hangul" lang="ko">${pl.hangul}</span></span></button>`,
  anchor: ANCHORS.globes[i], stop: 'gallery', win: 0.055, clampTo: 'none',
}));
const customGlobeEl = addOverlay({
  html: `<button class="globe-btn custom" type="button" data-id="custom">
    <span class="globe-photo">+</span>
    <span class="globe-name">Somewhere else</span></button>`,
  anchor: new THREE.Vector3(1.2, 2.35, -82), stop: 'gallery', win: 0.09, clampTo: 'none',
});

function refreshGlobeVisuals() {
  globeEls.forEach((el, i) => {
    const on = state.places.includes(PLACES[i].id);
    el.querySelector('.globe-btn').classList.toggle('selected', on);
    props.globes[i].ring.material.opacity = on ? 0.8 : 0;
    props.globes[i].group.position.y = ANCHORS.globes[i].y + (on ? 0.14 : 0);
  });
  customGlobeEl.querySelector('.globe-btn').classList.toggle('selected', !!state.customPlace.trim() || state.places.includes('custom'));
}
let chipFilter = 'all';
galleryCard.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) {
    chipFilter = chip.dataset.f;
    galleryCard.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === chip));
    globeEls.forEach((el, i) => {
      el.querySelector('.globe-btn').classList.toggle('dimmed', chipFilter !== 'all' && !PLACES[i].tags.includes(chipFilter));
    });
    return;
  }
  if (e.target.id === 'places-cta') {
    const custom = document.getElementById('custom-place').value.trim();
    if (custom) state.customPlace = custom;
    if (!state.places.length && !state.customPlace) {
      toast('Pick the ones you like — or type somewhere else.');
      return;
    }
    state.completedAt = state.completedAt || new Date().toISOString();
    saveState();
    rig.answer('gallery-lock');
    setTimeout(() => rig.autoAdvance(0.825), 350);
  }
});
globeEls.forEach((el, i) => el.addEventListener('click', () => {
  const id = PLACES[i].id;
  if (state.places.includes(id)) state.places = state.places.filter((x) => x !== id);
  else { state.places.push(id); audio.shimmer(); snow.burstAt(ANCHORS.globes[i], 10, 0.8, 0.9); }
  saveState();
  refreshGlobeVisuals();
}));
customGlobeEl.addEventListener('click', () => {
  document.getElementById('custom-place').focus();
  audio.chime(1318, 0.05);
});
document.getElementById('custom-place').addEventListener('input', (e) => {
  state.customPlace = e.target.value;
  saveState();
  refreshGlobeVisuals();
});
refreshGlobeVisuals();

// ————— Scene 5 · the desk —————
const deskCard = addOverlay({
  html: `<div class="card" style="text-align:center">
    <div class="eyebrow">Before the tree</div>
    <h2>Anything you want to say, one line is enough</h2>
    <textarea id="desk-note" rows="2" placeholder="e.g. I don’t like huge crowds / walking is good / just dessert" maxlength="140"></textarea>
    <div style="margin-top:0.6rem"><button class="btn wax" id="seal-cta" type="button">Seal the letter</button></div>
  </div>`,
  anchor: ANCHORS.deskNote, stop: 'desk', win: 0.05,
});
if (state.memo) document.getElementById('desk-note').value = state.memo;
deskCard.addEventListener('click', (e) => {
  if (e.target.id !== 'seal-cta') return;
  state.memo = document.getElementById('desk-note').value.trim();
  state.completedAt = state.completedAt || new Date().toISOString();
  saveState();
  audio.wax();
  tween((s) => { props.deskWax.scale.set(Math.max(0.01, s), 1, Math.max(0.01, s)); }, 700);
  toast('Sealed.');
  setTimeout(() => rig.autoAdvance(STOPS[8].t), 600);
});

// ————— Scene 6 · the tree —————
const ddayEl = addOverlay({
  html: `<div class="card" id="dday-card">
    <div class="dday-eyebrow">The village tree</div>
    <div class="dday-target" id="dday-target">Christmas</div>
    <div class="dday-big" id="dday-big">D–</div>
    <div class="dday-flip">
      <span><b id="dd-days">00</b>days</span>
      <span><b id="dd-hrs">00</b>hrs</span>
      <span><b id="dd-min">00</b>min</span>
      <span><b id="dd-sec">00</b>sec</span>
    </div>
    <div class="ribbon" id="dd-ribbon"></div>
    <div class="days-line">Eve is Thursday · Christmas is Friday</div>
    <div class="slot-line" id="dd-slot" hidden></div>
    <div class="eve-switch"><span id="eve-switch-label">Count down to Eve instead</span>
      <span class="brass-switch" id="eve-switch" role="switch" tabindex="0" aria-checked="false"><span class="knob"></span></span>
    </div>
  </div>`,
  anchor: null, stop: 'tree', pin: { start: 0.93, end: 1.02 }, clampTo: 'none',
});
ddayEl.style.left = '50%';
ddayEl.style.top = `calc(${Math.max(16, safeTop())}px + 2.6rem)`;
ddayEl.style.transform = 'translateX(-50%)';
ddayEl.style.transformOrigin = '50% 0%';
const letterEl = addOverlay({
  html: `<div class="card" id="letter-card">
    <div class="letter-h">For Yera noona <span lang="ko" style="font-size:0.8em;color:#96703c">예라 누나</span></div>
    <div id="letter-body"></div>
    <div class="wax-dot"></div>
    <div id="letter-actions">
      <button class="btn ghost" id="letter-again" type="button" style="min-height:46px;font-size:0.82rem">Look at the letter again</button>
      <button class="btn" id="letter-save" type="button" style="min-height:46px;font-size:0.82rem">Save as image</button>
    </div>
    <div class="small" style="text-align:center;margin-top:0.5rem">Or just screenshot this page</div>
  </div>`,
  anchor: null, stop: 'tree', pin: { start: 0.93, end: 1.02 }, clampTo: 'none',
});
letterEl.style.left = '50%';
letterEl.style.top = 'auto';
letterEl.style.bottom = `calc(${Math.max(18, safeBottom())}px + 3.6rem)`;
letterEl.style.transform = 'translateX(-50%)';
letterEl.style.transformOrigin = '50% 100%';
letterEl.style.maxHeight = '34vh';
letterEl.style.overflow = 'auto';
const treeFooter = addOverlay({
  html: `<div id="tree-footer">This letter is only for Yera noona.</div>`,
  anchor: null, stop: 'tree', pin: { start: 0.93, end: 1.02 }, interactive: false, clampTo: 'none',
});
treeFooter.style.left = '50%';
treeFooter.style.top = 'auto';
treeFooter.style.bottom = `calc(${Math.max(10, safeBottom())}px + 0.6rem)`;
treeFooter.style.transform = 'translateX(-50%)';
const starEl = addOverlay({
  html: `<button id="star-tap" type="button" aria-label="The star" style="width:64px;height:64px;border-radius:50%;background:transparent;border:0;cursor:pointer;touch-action:manipulation">
    <span id="star-count" style="font-size:0.62rem;color:rgba(240,228,200,0.0);letter-spacing:0.1em"></span></button>`,
  anchor: ANCHORS.star, stop: 'tree', win: 0.05, clampTo: 'none',
});
let starTaps = 0;
starEl.addEventListener('click', () => {
  starTaps++;
  audio.chime(1568 + starTaps * 40, 0.05);
  snow.burstAt(ANCHORS.star, 8, 0.8, 1.1);
  const label = starEl.querySelector('#star-count');
  label.style.color = starTaps >= 3 ? 'rgba(240,228,200,0.75)' : 'rgba(240,228,200,0)';
  label.textContent = starTaps >= 3 ? `${8 - starTaps} more taps unties the letter` : '';
  if (starTaps >= 8) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    window.removeEventListener('pagehide', saveCamera);
    location.reload();
  }
});
letterEl.addEventListener('click', (e) => {
  if (e.target.id === 'letter-again') {
    rig.scrollToT(STOPS[9].t);
    const card = letterEl.querySelector('#letter-card');
    card.style.transition = 'transform 0.3s ease';
    card.style.transform += ' scale(1.03)';
    setTimeout(() => { card.style.transform = card.style.transform.replace(' scale(1.03)', ''); }, 320);
  }
  if (e.target.id === 'letter-save') saveLetterImage();
});

// ————— D-day (KST) —————
// Monday snapshot: on 2026-09-01 KST there are 16 Mondays left
// until Christmas (Sep 7 … Dec 21, 2026) — the loop below reproduces that.
let eveTarget = false; // false = Christmas, true = Eve
function kstMidnightUTC(y, m, d) { return Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 3600 * 1000; }
function kstNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  return {
    y: +parts.year, m: +parts.month, d: +parts.day,
    h: +parts.hour % 24, min: +parts.minute, s: +parts.second,
  };
}
function christmasTargetMs() {
  // 2026-12-25 00:00 KST (or Eve 24th)
  const day = eveTarget ? 24 : 25;
  return kstMidnightUTC(2026, 12, day);
}
function mondaysLeft() {
  // count Mondays strictly after today (KST) up to and including 2026-12-21
  // Snapshot: on 2026-09-01 KST the number is 16 (Sep 7 … Dec 21, 2026)
  const now = kstNow();
  let ms = kstMidnightUTC(now.y, now.m, now.d) + 86400000; // tomorrow KST midnight
  const end = kstMidnightUTC(2026, 12, 21);
  let n = 0;
  while (ms <= end) {
    // kstMidnightUTC is 15:00 UTC the previous calendar day — shift +9h to read the KST weekday
    const dow = new Date(ms + 9 * 3600 * 1000).getUTCDay();
    if (dow === 1) n++;
    ms += 86400000;
  }
  return n;
}
function pad2(n) { return String(n).padStart(2, '0'); }
function tickDday() {
  const now = kstNow();
  const nowMs = kstMidnightUTC(now.y, now.m, now.d) + ((now.h * 60 + now.min) * 60 + now.s) * 1000;
  const target = christmasTargetMs();
  const diff = target - nowMs;
  const isToday = diff >= 0 && diff < 86400000;
  const calToday = Date.UTC(now.y, now.m - 1, now.d);
  const calTarget = Date.UTC(2026, 11, eveTarget ? 24 : 25);
  const days = Math.max(0, Math.round((calTarget - calToday) / 86400000));
  document.getElementById('dday-target').textContent = eveTarget ? 'Christmas Eve' : 'Christmas';
  document.getElementById('dday-big').textContent = isToday ? 'It’s today.' : `D–${days}`;
  const dd = days;
  const hh = Math.floor((Math.max(0, diff) % 86400000) / 3600000);
  const mm = Math.floor((Math.max(0, diff) % 3600000) / 60000);
  const ss = Math.floor((Math.max(0, diff) % 60000) / 1000);
  document.getElementById('dd-days').textContent = pad2(Math.max(0, dd));
  document.getElementById('dd-hrs').textContent = pad2(Math.max(0, hh));
  document.getElementById('dd-min').textContent = pad2(Math.max(0, mm));
  document.getElementById('dd-sec').textContent = pad2(Math.max(0, ss));
  const n = mondaysLeft();
  const ribbon = document.getElementById('dd-ribbon');
  if (isToday) ribbon.textContent = 'It’s today.';
  else if (n > 1) ribbon.textContent = `${n} Mondays left until Christmas.`;
  else if (n === 1) ribbon.textContent = 'One Monday left until Christmas.';
  else ribbon.textContent = 'Christmas is later this week.';
  // second countdown to the earliest chosen slot
  const slotEl = document.getElementById('dd-slot');
  const picked = SLOTS.filter((s) => state.times.includes(s.id));
  if (picked.length) {
    const offsets = { 'eve-morning': [10, 0], 'eve-lunch': [12, 30], 'eve-dinner': [18, 0], 'xmas-after-church': [13, 30] };
    let best = null;
    picked.forEach((s) => {
      const [h, mi] = offsets[s.id];
      const day = s.id.startsWith('xmas') ? 25 : 24;
      const ms = kstMidnightUTC(2026, 12, day) + (h * 60 + mi) * 60000;
      if (!best || ms < best.ms) best = { ms, s };
    });
    const to = best.ms - nowMs;
    const d2 = Math.floor(to / 86400000), h2 = Math.floor((to % 86400000) / 3600000), m2 = Math.floor((to % 3600000) / 60000);
    slotEl.hidden = false;
    slotEl.textContent = `Around ${best.s.title.toLowerCase()} · ${best.s.around} — in ${d2}d ${h2}h ${m2}m`;
  } else {
    slotEl.hidden = true;
  }
}
tickDday();
setInterval(tickDday, 1000);
const eveSwitch = document.getElementById('eve-switch');
function toggleEve() {
  eveTarget = !eveTarget;
  eveSwitch.classList.toggle('on', eveTarget);
  eveSwitch.setAttribute('aria-checked', String(eveTarget));
  document.getElementById('eve-switch-label').textContent = eveTarget ? 'Count down to Christmas instead' : 'Count down to Eve instead';
  audio.chime(1318, 0.05);
  tickDday();
}
eveSwitch.addEventListener('click', toggleEve);

// ————— the letter summary —————
function letterBodyHTML() {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (state.hangout === 'no') {
    return `<p>You even caught the one that runs away.</p>
      <p style="margin-top:0.4rem">If we don’t go, have a quiet, pretty Christmas anyway.</p>
      ${state.memo ? `<div class="letter-sec"><b>On the bench</b>${esc(state.memo)}</div>` : ''}`;
  }
  if (state.availability === 'busy') {
    return `<p>A promise or a family meeting comes first on Christmas Eve or Christmas — as it should.</p>
      <p style="margin-top:0.4rem">The village keeps its snow for you.</p>
      <div class="letter-sec"><b>If another day works</b>${state.memo ? esc(state.memo) : '—'}</div>`;
  }
  const availLine = state.availability === 'unsure'
    ? 'You’re not sure yet — the days are still open.'
    : 'No promise or family meeting on Christmas Eve or Christmas.';
  const yesLine = state.hangout === 'yes' ? 'You said yes to hanging out.' : 'The stall is still waiting for an answer.';
  const times = SLOTS.filter((s) => state.times.includes(s.id)).map((s) => `· ${s.title}`).join('<br>') || '· (none picked yet)';
  const places = PLACES.filter((p) => state.places.includes(p.id))
    .map((p) => `· ${p.name}<br>&nbsp;&nbsp;<span lang="ko" style="color:#96703c">${p.hangul}</span>`).join('<br>');
  const custom = state.customPlace ? `${places ? '<br>' : ''}· ${esc(state.customPlace)}` : '';
  const placeBlock = (places || custom) ? `${places}${custom}` : '· (none picked yet)';
  return `<p>${availLine}</p>
    <p style="margin-top:0.4rem">${yesLine}</p>
    <div class="letter-sec"><b>Time</b>${times}</div>
    <div class="letter-sec"><b>Place</b>${placeBlock}</div>
    <div class="letter-sec"><b>Note</b>${state.memo ? esc(state.memo) : 'None'}</div>`;
}
function refreshLetter() {
  document.getElementById('letter-body').innerHTML = letterBodyHTML();
}
refreshLetter();
setInterval(refreshLetter, 4000);

// ————— save as image —————
function saveLetterImage() {
  try {
    const W = 900, H = 1300;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#f8f2e6'); grd.addColorStop(1, '#eee0c8');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#c9a36a'; g.lineWidth = 3;
    g.strokeRect(28, 28, W - 56, H - 56);
    g.strokeStyle = 'rgba(201,163,106,0.5)'; g.lineWidth = 1;
    g.strokeRect(40, 40, W - 80, H - 80);
    g.fillStyle = '#241b12';
    g.font = '600 30px Georgia, serif';
    g.fillText('For Yera noona', 70, 120);
    g.font = '24px sans-serif';
    g.fillStyle = '#96703c';
    g.fillText('예라 누나', 70, 158);
    // little tree doodle
    g.strokeStyle = '#16302a'; g.lineWidth = 4;
    [[90, 300, 70], [90, 260, 55], [90, 226, 40]].forEach(([x, y, r]) => {
      g.beginPath(); g.moveTo(x - r, y); g.lineTo(x, y - r * 1.35); g.lineTo(x + r, y); g.closePath(); g.stroke();
    });
    g.fillStyle = '#c9a36a';
    g.beginPath(); g.arc(90, 210, 8, 0, Math.PI * 2); g.fill();
    const lines = [];
    lines.push(['— A Christmas letter —', '28px Georgia', '#7c1f2c']);
    document.querySelectorAll('#letter-body p, #letter-body .letter-sec').forEach((n) => {
      const txt = n.textContent.replace(/\s+/g, ' ').trim();
      if (txt) lines.push([txt, '22px sans-serif', '#2a2118']);
    });
    lines.push([document.getElementById('dd-ribbon').textContent, '26px Georgia', '#7c1f2c']);
    lines.push([document.getElementById('dday-big').textContent, '34px Georgia', '#241b12']);
    let y = 210;
    lines.forEach(([txt, font, col]) => {
      g.font = font; g.fillStyle = col;
      const words = txt.split(' ');
      let line = '';
      words.forEach((w) => {
        const test = line ? line + ' ' + w : w;
        if (g.measureText(test).width > W - 220) { g.fillText(line, 210, y); y += 34; line = w; }
        else line = test;
      });
      g.fillText(line, 210, y); y += 40;
    });
    g.font = 'italic 20px Georgia'; g.fillStyle = '#7a6b5a';
    g.fillText('This letter is only for Yera noona.', 70, H - 80);
    const a = document.createElement('a');
    a.download = 'yera-christmas-2026.png';
    a.href = c.toDataURL('image/png');
    a.click();
    toast('Saved. If nothing happened, screenshot this page.');
  } catch (e) {
    toast('Or just screenshot this page.');
  }
}

// ————— bonus taps: bell, lanterns, shop windows, ornaments —————
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downPos = null;
canvas.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 9) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(props.interactive, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !obj.userData.kind) obj = obj.parent;
  if (!obj) return;
  const kind = obj.userData.kind;
  if (kind === 'bell') {
    audio.bell();
    const p = new THREE.Vector3(); obj.getWorldPosition(p);
    snow.burstAt(p, 20, 1.1, 1.6);
  } else if (kind === 'lantern') {
    const l = props.lanterns[obj.userData.idx];
    if (l && l.glow) { l.glow.material.opacity = 1; l.tapPulse = 1.2; }
    audio.chime(1174, 0.05);
  } else if (kind === 'shopWindow') {
    const w = props.shopWindows[obj.userData.idx];
    if (w) { w.lit = true; w.mat.color.set(0xffd9a0); w.twinkle = 2.2; }
    audio.chime(1567, 0.045);
  } else if (kind === 'treeOrnament') {
    toggleEve();
  }
}, { passive: true });

// touch flurry (high tier)
canvas.addEventListener('pointerdown', (e) => {
  if (!preset.flurry) return;
  const p = new THREE.Vector3((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0.5);
  p.unproject(camera);
  const dir = p.sub(camera.position).normalize();
  const target = camera.position.clone().addScaledVector(dir, 6);
  snow.burstAt(target, 16, 1.0, 0.9);
}, { passive: true });

// ————— mute —————
const muteBtn = document.getElementById('mute');
if (audio.muted) muteBtn.classList.add('muted');
muteBtn.addEventListener('click', () => {
  audio.ensure();
  audio.setMuted(!audio.muted);
  muteBtn.classList.toggle('muted', audio.muted);
  muteBtn.setAttribute('aria-pressed', String(audio.muted));
});

// ————— intro —————
const intro = document.getElementById('intro');
let started = false;
function startWalk() {
  if (started) return;
  started = true;
  audio.ensure();
  rig.requestGyro();
  rig.enabled = true;
  document.body.classList.remove('pre-walk');
  intro.classList.add('gone');
  setTimeout(() => { intro.style.display = 'none'; }, 1600);
  if (state.cameraT > 0.01 && state.letterOpened) {
    rig.scrollToT(Math.min(state.cameraT, rig.maxT()), { instant: true });
  }
}
document.getElementById('walk-in').addEventListener('click', startWalk);
intro.addEventListener('click', (e) => { if (e.target === intro || e.target.closest('.intro-inner')) startWalk(); });

// ————— quality drop —————
onTierDrop((tier) => {
  renderer.setPixelRatio(quality.preset.dpr);
  snow.setCount(quality.preset.snow);
  if (tier === 'low') toast('Dropping to a lighter village so it stays smooth.');
});
watchFPS();

// ————— resize —————
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.75 ? 68 : 56;
  camera.updateProjectionMatrix();
  sizeConfetti();
}
onResize();
window.addEventListener('resize', onResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

// ————— camera save —————
function saveCamera() {
  state.cameraT = rig.t;
  saveState();
}
window.addEventListener('pagehide', saveCamera);
setInterval(() => {
  if (rig.enabled && Math.abs(state.cameraT - rig.t) > 0.005) saveCamera();
}, 2500);

// ————— main loop —————
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let last = performance.now();
let time = 0;
let lastScene = '';
let running = true;

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  const s = rig.tick(dt);

  cameraPose(s.t, camPos, camLook);
  // parallax + idle breathing
  camLook.x += rig._px.x * 0.45;
  camPos.x += rig._px.x * 0.16;
  camLook.y += -rig._px.y * 0.28;
  if (!started) {
    camPos.z -= Math.sin(time * 0.55) * 0.08;
    if (time > 4 && time < 7.2) {
      camPos.z -= Math.sin(((time - 4) / 3.2) * Math.PI) * 0.55;
    }
  } else if (s.idle > 4) {
    const b = Math.sin(time * 0.55) * 0.05;
    camPos.z -= b; camPos.x += b * 0.3;
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  snow.update(dt, camera, reduced);
  animateVillage(props, time, dt, s.vel, reduced);

  // shop windows light one by one as she passes
  props.shopWindows.forEach((w) => {
    if (!w.lit && s.t > w.litT) { w.lit = true; w.mat.color.set(0xffd9a0); }
    if (w.glow) {
      let target = w.lit ? 0.5 : 0;
      if (w.twinkle > 0) { w.twinkle -= dt; target = 0.4 + Math.sin(time * 12) * 0.3; }
      w.glow.material.opacity += (target - w.glow.material.opacity) * Math.min(1, dt * 3);
    }
  });
  // lantern tap pulses decay
  if (props.lanterns) {
    props.lanterns.forEach((l) => {
      if (l.tapPulse > 0) {
        l.tapPulse -= dt;
        if (l.glow) l.glow.material.opacity = Math.min(1, 0.45 + l.tapPulse);
      }
    });
  }

  frameOverlays(s.t);
  rig.markHere(s.t);

  // chevron
  const lock = rig.currentLock();
  let label = 'Keep walking';
  if (s.t < 0.03) label = started ? 'Keep walking' : 'Walk in';
  else if (lock && Math.abs(lock.t - s.t) < 0.05) {
    label = { gate: 'Open the letter', cottages: 'Choose a door', stall: 'Answer at the stall', clocks: 'Pick a time', 'gallery-lock': 'Pick the places' }[lock.id] || 'Keep walking';
  } else if (s.t > 0.93) label = '';
  rig.setChevron(label, s.idle > 1.6 && !!label && s.t <= 0.93);

  // audio scene
  const sceneName = s.t > 0.9 ? 'tree' : (Math.abs(s.t - 0.48) < 0.07 ? 'stall' : 'walk');
  if (sceneName !== lastScene) { audio.setScene(sceneName); lastScene = sceneName; }

  tickConfetti(dt);
  springNo(dt);
  if (!noState.fleeing) syncNoBase();
  // place the ornament + dashed ring manually (not via the overlay projection)
  if (noEl.style.display !== 'none') {
    noEl.style.left = '0'; noEl.style.top = '0';
    noEl.style.transform = `translate3d(${noState.x.toFixed(1)}px, ${noState.y.toFixed(1)}px, 0) translate(-50%,-50%)${noState.settled ? '' : ` rotate(${(noState.vx * 0.04).toFixed(2)}deg)`}`;
    noEl.style.opacity = registryOpacity(noEl);
    usedToSit.style.transform = `translate3d(${noScreen.x.toFixed(1)}px, ${noScreen.y.toFixed(1)}px, 0)`;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
function registryOpacity(el) {
  const item = registry.find((r) => r.el === el);
  if (!item) return '1';
  const o = windowOpacity(rig.t, item.stopT, item.win);
  return o.toFixed(3);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { running = false; saveCamera(); }
  else { running = true; last = performance.now(); requestAnimationFrame(loop); }
});
requestAnimationFrame(loop);
