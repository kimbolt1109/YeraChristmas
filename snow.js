// Snow Canvas Particle System
(function() {
  class SnowSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.flakes = [];
      this.animationFrame = null;
      this.isPaused = false;

      this.initCanvas();
      this.createFlakes();

      window.addEventListener('resize', () => this.initCanvas());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    }

    initCanvas() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
    }

    createFlakes() {
      const flakeCount = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 75;
      this.flakes = [];
      for (let i = 0; i < flakeCount; i++) {
        this.flakes.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 2.5 + 0.8, // 3 depth layers
          density: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.7 + 0.3,
          speedY: Math.random() * 0.8 + 0.3,
          speedX: Math.random() * 0.4 - 0.2,
          swayFreq: Math.random() * 0.02 + 0.005,
          swayAmp: Math.random() * 1.5 + 0.5,
          step: Math.random() * Math.PI * 2
        });
      }
    }

    start() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.renderStatic();
        return;
      }
      this.isPaused = false;
      this.loop();
    }

    pause() {
      this.isPaused = true;
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    resume() {
      if (this.isPaused && !document.hidden) {
        this.isPaused = false;
        this.loop();
      }
    }

    renderStatic() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#f8f4ec';
      this.flakes.forEach(f => {
        this.ctx.globalAlpha = f.opacity * 0.6;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    loop() {
      if (this.isPaused) return;

      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#f8f4ec';

      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i];
        f.step += f.swayFreq;
        f.x += Math.sin(f.step) * f.swayAmp * 0.3 + f.speedX;
        f.y += f.speedY;

        if (f.y > this.height) {
          f.y = -10;
          f.x = Math.random() * this.width;
        }
        if (f.x > this.width) f.x = 0;
        if (f.x < 0) f.x = this.width;

        this.ctx.globalAlpha = f.opacity;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.animationFrame = requestAnimationFrame(() => this.loop());
    }
  }

  window.SnowSystem = SnowSystem;
})();
