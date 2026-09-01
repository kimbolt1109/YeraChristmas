// quality.js — device tier detection + runtime FPS auto-drop.
// Tiers: high | mid | low | reduced. Detected once per session, cached.

const KEY = 'yera-xmas-quality';

function prefersReduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function detect() {
  if (prefersReduced()) return 'reduced';

  const nav = navigator;
  const mem = nav.deviceMemory || nav.deviceMemory === 0 ? nav.deviceMemory : undefined;
  const cores = nav.hardwareConcurrency || 4;
  const saveData = nav.connection && nav.connection.saveData;
  const dpr = window.devicePixelRatio || 1;
  const touch = ('ontouchstart' in window) || (nav.maxTouchPoints > 0);
  const ua = navigator.userAgent || '';
  const androidOld = /Android [4-8]\./.test(ua);
  const webview = /;\s*wv\)| Kakao | FBAN | FBAV | Instagram /.test(ua);

  if (saveData || androidOld) return 'low';

  if (!touch) {
    // desktop
    return cores >= 4 ? 'high' : 'mid';
  }
  // phones / tablets
  if (mem !== undefined) {
    if (mem >= 6 && cores >= 6 && dpr <= 3.5) return 'high';
    if (mem >= 3) return 'mid';
    return 'low';
  }
  // no deviceMemory (iOS Safari): modern iPhones cope fine
  if (webview) return 'mid';
  return /iPhone|iPad/.test(ua) ? 'high' : 'mid';
}

let tier = null;
try {
  const saved = sessionStorage.getItem(KEY);
  if (saved && ['high', 'mid', 'low', 'reduced'].includes(saved)) tier = saved;
} catch (e) { /* private mode */ }
if (!tier) tier = detect();
try { sessionStorage.setItem(KEY, tier); } catch (e) { /* ignore */ }

// Snow counts, pixel ratio caps, feature flags per tier.
const PRESETS = {
  high:    { snow: 1400, dpr: Math.min(window.devicePixelRatio || 1, 1.5), gyro: true, flurry: true, glow: true, twinkle: true, smoke: true, extraMeshes: true },
  mid:     { snow: 750,  dpr: 1, gyro: true, flurry: false, glow: true,  twinkle: true, smoke: true,  extraMeshes: true },
  low:     { snow: 260,  dpr: 1, gyro: false, flurry: false, glow: false, twinkle: false, smoke: false, extraMeshes: false },
  reduced: { snow: 0,    dpr: 1, gyro: false, flurry: false, glow: true,  twinkle: false, smoke: false, extraMeshes: false },
};

export const quality = {
  get tier() { return tier; },
  get preset() { return PRESETS[tier]; },
  setTier(next) {
    if (!PRESETS[next] || next === tier) return false;
    tier = next;
    try { sessionStorage.setItem(KEY, tier); } catch (e) { /* ignore */ }
    return true;
  },
};

// ————— FPS watchdog: if we can't hold 40fps for 2s, drop a tier —————
let frames = 0;
let windowStart = performance.now();
let lastDrop = 0;
let onDrop = null;

export function onTierDrop(fn) { onDrop = fn; }

export function watchFPS() {
  frames++;
  const now = performance.now();
  const elapsed = now - windowStart;
  if (elapsed >= 2000) {
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = now;
    const order = ['high', 'mid', 'low'];
    const idx = order.indexOf(tier);
    if (fps < 40 && idx !== -1 && idx < order.length - 1 && now - lastDrop > 6000) {
      lastDrop = now;
      const next = order[idx + 1];
      if (quality.setTier(next) && onDrop) onDrop(next, fps);
    }
  }
  requestAnimationFrame(watchFPS);
}
