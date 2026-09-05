// scroll-rig.js — one thumb, one winter road.
// Native scroll drives a target t; the camera eases toward it (heavy, snowy).
// While a question is unanswered the path soft-locks: peek ahead, rubber-band back.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export class ScrollRig {
  constructor({ stops, dotsEl, chevronEl, reduced, gyroEnabled = true }) {
    this.stops = stops;             // [{id, t, lock}]
    this.answeredMap = {};         // id -> true once answered
    this.reduced = reduced;
    this.gyroEnabled = gyroEnabled !== false;
    this.dotsEl = dotsEl;
    this.chevronEl = chevronEl;
    this.currentT = 0;
    this.rawT = 0;
    this.vel = 0;
    this.enabled = false;           // scroll live after the intro
    this.parallax = { x: 0, y: 0 };
    this._px = { x: 0, y: 0 };      // parallax eased
    this._auto = null;              // auto-advance animation
    this._lastScrollY = 0;
    this._idleAt = performance.now();
    this._buildDots();
    this._listen();
    if (this.chevronEl) {
      this.chevronEl.addEventListener('click', () => this.walkForward());
    }
  }

  // ————— geometry —————
  maxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  pxForT(t) { return t * this.maxScroll(); }
  tForPx(px) { return clamp(px / this.maxScroll(), 0, 1); }

  // first unanswered locked stop
  currentLock() {
    for (const s of this.stops) {
      if (s.lock && !this.answeredMap[s.id]) return s;
    }
    return null;
  }
  maxT() {
    const lock = this.currentLock();
    return lock ? lock.t + 0.028 : 1; // peek 2.8% into the fog
  }
  answer(id) {
    this.answeredMap[id] = true;
    this._refreshDots();
  }
  unlockAll() {
    this.stops.forEach((s) => { this.answeredMap[s.id] = true; });
    this._refreshDots();
  }
  get t() { return this.currentT; }

  reachState(id) {
    const stop = this.stops.find((s) => s.id === id);
    if (!stop) return 'ahead';
    const lock = this.currentLock();
    if (!lock) return 'open';
    return stop.t <= lock.t + 0.028 ? 'open' : 'ahead';
  }

  walkForward() {
    if (!this.enabled) return;
    const lock = this.currentLock();
    if (lock && Math.abs(this.currentT - lock.t) < 0.045) {
      this.scrollToT(lock.t);
      return;
    }
    const next = this.stops.find((s) => s.t > this.currentT + 0.012);
    this.scrollToT(next ? Math.min(next.t, this.maxT()) : this.maxT());
  }

  // ————— input —————
  _listen() {
    let ticking = false;
    const onScroll = () => {
      if (!this.enabled) { window.scrollTo(0, 0); return; }
      // our own scripted scrolls must not cancel themselves
      if (this._scripted) { this._idleAt = performance.now(); return; }
      this._restDisallowed = false; // she is driving again; snap may return
      const maxT = this.maxT();
      const maxPx = this.pxForT(maxT);
      if (window.scrollY > maxPx + 2) {
        window.scrollTo(0, maxPx); // rubber-band hard stop
      }
      this._idleAt = performance.now();
      if (this._auto) { cancelAnimationFrame(this._auto); this._auto = null; }
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { ticking = false; });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onResizeOrOrient = () => {
      // keep her at the same story point when the URL bar collapses or screen rotates
      window.scrollTo(0, this.pxForT(this.rawT));
    };
    window.addEventListener('resize', onResizeOrOrient);
    window.addEventListener('orientationchange', () => {
      setTimeout(onResizeOrOrient, 80);
      setTimeout(onResizeOrOrient, 240);
    });

    // pointer parallax (desktop mouse only)
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.parallax.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.parallax.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // gyro bonus — subtle, self-centering, orientation-aware
    let baselineRoll = null;
    const onOrient = (e) => {
      if (!this.gyroEnabled || this.reduced) {
        this._gyro = 0;
        return;
      }
      if (e.gamma == null || e.beta == null) return;

      // Flat on table or face down: ignore erratic gamma jumps
      if (Math.abs(e.beta) < 18 || Math.abs(e.beta) > 162) {
        this._gyro = 0;
        return;
      }

      // Map device rotation (portrait vs landscape)
      const angle = (typeof screen !== 'undefined' && screen.orientation && screen.orientation.angle != null)
        ? screen.orientation.angle
        : (typeof window.orientation === 'number' ? window.orientation : 0);

      let roll = e.gamma;
      if (angle === 90) {
        roll = e.beta - 45;
      } else if (angle === -90 || angle === 270) {
        roll = -(e.beta - 45);
      } else if (angle === 180) {
        roll = -e.gamma;
      }

      // Slowly adapt to the user's natural holding posture so the scene doesn't stay tilted
      if (baselineRoll === null) {
        baselineRoll = roll;
      } else {
        baselineRoll += (roll - baselineRoll) * 0.02;
      }

      let diff = roll - baselineRoll;
      // 2.5 degree deadzone to eliminate hand tremor
      if (Math.abs(diff) < 2.5) diff = 0;
      else diff -= Math.sign(diff) * 2.5;

      this._gyro = clamp(diff / 42, -0.35, 0.35);
    };
    window.addEventListener('deviceorientation', onOrient);
  }

  requestGyro() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  }

  // ————— movement —————
  tick(dt) {
    if (!this.enabled) {
      this.vel = 0;
      return { t: this.currentT, rawT: this.rawT, vel: 0, idle: 9999 };
    }
    const maxT = this.maxT();
    this.rawT = clamp(this.tForPx(window.scrollY), 0, maxT);

    let goal = this.rawT;
    if (this.reduced) {
      // quiet mode: the camera rests at stops and fades between them
      let nearest = this.stops[0].t;
      for (const s of this.stops) if (Math.abs(s.t - goal) < Math.abs(nearest - goal)) nearest = s.t;
      goal = nearest;
    }
    const k = 1 - Math.exp(-dt * (this.reduced ? 2.2 : 3.4));
    const prev = this.currentT;
    if (this._instant) {
      this.currentT = goal;
      this._instant = false;
    } else {
      this.currentT += (goal - this.currentT) * k;
    }
    if (Math.abs(goal - this.currentT) < 0.00004) this.currentT = goal;
    this.vel = dt > 0 ? (this.currentT - prev) / dt : 0;

    // magnetic rest at a nearby stop after she stops scrolling
    const idleMs = performance.now() - this._idleAt;
    if (!this._auto && !this._restDisallowed && idleMs > 1600 && idleMs < 4000) {
      let nearest = null, best = 0.016;
      for (const s of this.stops) {
        if (s.hidden) continue;
        const d = Math.abs(this.rawT - s.t);
        if (d < best && s.t <= maxT + 0.001) { best = d; nearest = s; }
      }
      if (nearest && Math.abs(this.rawT - nearest.t) > 0.003) {
        this.scrollToT(nearest.t);
        this._idleAt = performance.now() + 2400;
      }
    }

    // parallax easing
    const gx = clamp((this._gyro || 0) * 0.8 + this.parallax.x * 0.35, -1, 1);
    this._px.x += (gx - this._px.x) * (1 - Math.exp(-dt * 4));
    this._px.y += (this.parallax.y - this._px.y) * (1 - Math.exp(-dt * 4));

    return { t: this.currentT, rawT: this.rawT, vel: this.vel, idle: idleMs / 1000 };
  }

  scrollToT(t, { instant = false } = {}) {
    this.cancelAuto();
    if (typeof window !== 'undefined' && window.cancelPendingAdvance) {
      window.cancelPendingAdvance();
    }
    const target = clamp(t, 0, this.maxT());
    const px = this.pxForT(target);
    this.rawT = target;
    if (instant) {
      this.currentT = target;
      this._instant = true;
      window.scrollTo(0, px);
    } else {
      window.scrollTo({ top: px, behavior: 'smooth' });
    }
  }

  // the forward ease when a lock releases
  autoAdvance(fromT) {
    if (this._auto) cancelAnimationFrame(this._auto);
    // walk ~38% of the way toward the next stop
    const idx = this.stops.findIndex((s) => s.t > fromT + 0.001);
    const nextT = idx !== -1 ? this.stops[idx].t : 1;
    const goalPx = this.pxForT(fromT + (nextT - fromT) * 0.38);
    const startY = window.scrollY;
    const t0 = performance.now();
    const dur = 900;
    this._scripted = true;
    this._restDisallowed = true; // the forward ease decides where she rests
    const step = (now) => {
      const s = clamp((now - t0) / dur, 0, 1);
      const y = startY + (goalPx - startY) * easeInOutCubic(s);
      window.scrollTo(0, y);
      if (s < 1) this._auto = requestAnimationFrame(step);
      else { this._auto = null; setTimeout(() => { this._scripted = false; }, 60); }
    };
    this._auto = requestAnimationFrame(step);
  }
  cancelAuto() {
    if (this._auto) { cancelAnimationFrame(this._auto); this._auto = null; }
    this._scripted = false;
  }

  // ————— progress dots —————
  _buildDots() {
    if (!this.dotsEl) return;
    this.dotsEl.innerHTML = '';
    this.dotEls = {};
    this.stops.forEach((s) => {
      if (s.id === 'approach' || s.hidden) return;
      const b = document.createElement('button');
      b.className = 'dot';
      b.type = 'button';
      b.setAttribute('aria-label', s.id);
      b.addEventListener('click', () => {
        // walk back to any reached stop
        const maxT = this.maxT();
        if (s.t <= maxT + 0.001) this.scrollToT(s.t);
      });
      this.dotsEl.appendChild(b);
      this.dotEls[s.id] = b;
    });
    this._refreshDots();
  }
  _refreshDots() {
    if (!this.dotEls) return;
    const reached = this.maxT();
    this.stops.forEach((s) => {
      const el = this.dotEls[s.id];
      if (!el) return;
      el.classList.toggle('here', false);
      el.classList.toggle('done', s.t <= reached - 0.001 || this.answeredMap[s.id]);
      el.classList.toggle('skipped', this.answeredMap[s.id] && s.lock && s.t > reached + 0.001);
    });
  }
  markHere(t) {
    if (!this.dotEls) return;
    let best = null, bestD = 1;
    this.stops.forEach((s) => {
      const d = Math.abs(s.t - t);
      if (d < bestD) { bestD = d; best = s; }
    });
    Object.entries(this.dotEls).forEach(([id, el]) => {
      el.classList.toggle('here', best && best.id === id && bestD < 0.035);
    });
  }

  // ————— chevron —————
  setChevron(label, visible) {
    if (!this.chevronEl) return;
    const lbl = this.chevronEl.querySelector('#chevron-label');
    if (lbl && label) lbl.textContent = label;
    this.chevronEl.classList.toggle('hidden', !visible);
  }
}
