// audio.js — the village has a voice.
// No audio files: a synthesized music-box bed ("Snow over the village"), pads,
// sleigh ticks, and quiet foley, all generated with Web Audio. Legal by construction.

const MUTE_KEY = 'yera-xmas-muted';
const MASTER = 0.28;

let ctx = null;
let master = null;
let started = false;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }

// scene bus gains (crossfaded)
let busWalk, busStall, busTree, delaySend, delayNode;

// ————— composition: a small original lullaby in F, 3/4, music box —————
const BEAT = 60 / 66;
const BAR = 3; // beats per bar
// [midi, startBeat, lengthBeats]
const MELODY = [
  [77, 0, 1], [81, 1, 1], [84, 2, 1],
  [81, 3, 1.5], [77, 4.5, 1], [74, 5.5, 0.5],
  [74, 6, 1], [77, 7, 1], [82, 8, 1],
  [81, 9, 2.4],
  [77, 12, 1], [81, 13, 1], [84, 14, 1],
  [81, 15, 1.5], [77, 16.5, 1], [72, 17.5, 0.5],
  [74, 18, 1], [76, 19, 1], [79, 20, 1],
  [77, 21, 2.6],
];
const LOOP_BEATS = 24;
const CHORDS = [ // per bar: [root, third, fifth] as midi
  [53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55],
  [53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55],
];
const BARS = CHORDS.length;

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function makeNoiseBuffer(seconds = 1) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown-ish
    d[i] = last * 3.2;
  }
  return buf;
}

function musicBoxNote(t, midi, vel = 1) {
  const f = midiHz(midi);
  const g = ctx.createGain();
  g.connect(busWalk);
  g.connect(delaySend);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  const o1 = ctx.createOscillator();
  o1.type = 'sine'; o1.frequency.value = f;
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = f * 3.978; // tine partial
  const g2 = ctx.createGain(); g2.gain.value = 0.24;
  o1.connect(g); o2.connect(g2); g2.connect(g);
  o1.start(t); o2.start(t);
  o1.stop(t + 1.6); o2.stop(t + 1.6);
}

function padChord(t, midis, dur) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 640; filter.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.045, t + 1.6);
  g.gain.setValueAtTime(0.045, t + dur - 1.2);
  g.gain.linearRampToValueAtTime(0, t + dur);
  filter.connect(g); g.connect(busWalk);
  midis.forEach((m) => {
    [0, 5].forEach((cents, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midiHz(m) * Math.pow(2, cents / 1200);
      o.detune.value = i ? 4 : -4;
      o.connect(filter);
      o.start(t); o.stop(t + dur + 0.1);
    });
  });
}

function sleighTick(t) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 6200; bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(bp); bp.connect(g); g.connect(busWalk);
  src.start(t, Math.random() * 0.5); src.stop(t + 0.08);
}

let noiseBuf = null;
let schedTimer = null;
let nextBeat = 0; // absolute ctx time of next loop start

function schedule() {
  const horizon = ctx.currentTime + 0.6;
  while (nextBeat < horizon) {
    const loopStart = nextBeat;
    // melody
    MELODY.forEach(([m, b, len]) => {
      musicBoxNote(loopStart + b * BEAT, m, len > 2 ? 1.05 : 1);
    });
    // pads + bass per bar
    for (let bar = 0; bar < BARS; bar++) {
      const t = loopStart + bar * BAR * BEAT;
      padChord(t, CHORDS[bar], BAR * BEAT + 0.4);
      musicBoxNote(t, CHORDS[bar][0] - 12, 0.5); // soft bass ping
    }
    // sleigh ticks on offbeats
    for (let b = 0; b < LOOP_BEATS; b += 1) {
      sleighTick(loopStart + (b + 0.5) * BEAT);
    }
    nextBeat = loopStart + LOOP_BEATS * BEAT;
  }
}

function startBed() {
  busWalk = ctx.createGain(); busWalk.gain.value = 1;
  busStall = ctx.createGain(); busStall.gain.value = 0;
  busTree = ctx.createGain(); busTree.gain.value = 0;
  [busWalk, busStall, busTree].forEach((b) => b.connect(master));

  // soft hall for the tree square
  delaySend = ctx.createGain(); delaySend.gain.value = 0.25;
  delayNode = ctx.createDelay(1.0); delayNode.delayTime.value = 0.34;
  const fb = ctx.createGain(); fb.gain.value = 0.42;
  const dampen = ctx.createBiquadFilter();
  dampen.type = 'lowpass'; dampen.frequency.value = 2400;
  delaySend.connect(delayNode);
  delayNode.connect(dampen); dampen.connect(fb); fb.connect(delayNode);
  dampen.connect(busTree);

  // market murmur under the stall
  const stallSrc = ctx.createBufferSource();
  stallSrc.buffer = noiseBuf; stallSrc.loop = true;
  const stallLp = ctx.createBiquadFilter();
  stallLp.type = 'lowpass'; stallLp.frequency.value = 380;
  stallSrc.connect(stallLp); stallLp.connect(busStall);
  stallSrc.start();
  busStall.gain.value = 0;

  nextBeat = ctx.currentTime + 0.15;
  schedule();
  schedTimer = setInterval(schedule, 250);
}

// ————— foley —————

function env(g, t, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

export const audio = {
  get muted() { return muted; },

  ensure() {
    if (started) {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER;
      master.connect(ctx.destination);
      noiseBuf = makeNoiseBuffer(2);
      started = true;
      startBed();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) {
      // AudioContext creation blocked or unsupported
    }
  },

  setMuted(next) {
    muted = next;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.linearRampToValueAtTime(muted ? 0 : MASTER, ctx.currentTime + 0.25);
  },

  // crossfade the world beds as the camera arrives somewhere
  setScene(name) {
    if (!ctx || !started) return;
    const t = ctx.currentTime;
    const targets = { walk: 1, stall: 0, tree: 0 };
    if (name in targets) {
      busWalk.gain.linearRampToValueAtTime(targets[name], t + 1.4);
      busStall.gain.linearRampToValueAtTime(name === 'stall' ? 0.5 : 0, t + 1.4);
      busTree.gain.linearRampToValueAtTime(name === 'tree' ? 1 : 0, t + 1.4);
      delaySend.gain.value = name === 'tree' ? 0.55 : 0.25;
    }
  },

  bell() { // the gate bell: one long brass ring
    if (!ctx) return;
    const t = ctx.currentTime;
    [660, 987, 1567].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f * (1 + i * 0.001);
      const g = ctx.createGain();
      env(g, t, [0.14, 0.07, 0.035][i], 2.2 - i * 0.5);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 2.3);
    });
  },

  creak() { // cottage door
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(82, t);
    o.frequency.linearRampToValueAtTime(64, t + 0.42);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = ctx.createGain();
    env(g, t, 0.08, 0.5);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.55);
  },

  whoosh() { // the runaway ornament
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.22);
    const g = ctx.createGain();
    env(g, t, 0.1, 0.28);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.3);
    this.chime(1318, 0.05); // tiny bell behind it
  },

  chime(freq = 1567, vol = 0.07) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, vol, 0.9);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 1);
  },

  wax() { // wax pour on the seal
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 560;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.75);
  },

  shimmer() { // globe selected / watch selected
    if (!ctx) return;
    const t = ctx.currentTime;
    [1046, 1318, 1568].forEach((f, i) => setTimeout(() => this.chime(f, 0.045), i * 70));
  },
};
