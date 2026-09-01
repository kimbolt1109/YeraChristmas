// Web Audio API Synthesizer and Sound Effects
(function() {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.isMuted = localStorage.getItem('yera_christmas_muted') === 'true';
      this.volume = 0.28;
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;

      this.timerId = null;
      this.notes = [
        // Silent Night / Christmas music-box carol notes (freq in Hz, duration in sec)
        { note: 392.00, dur: 0.6 }, // G4
        { note: 440.00, dur: 0.4 }, // A4
        { note: 392.00, dur: 0.6 }, // G4
        { note: 329.63, dur: 1.2 }, // E4

        { note: 392.00, dur: 0.6 }, // G4
        { note: 440.00, dur: 0.4 }, // A4
        { note: 392.00, dur: 0.6 }, // G4
        { note: 329.63, dur: 1.2 }, // E4

        { note: 587.33, dur: 0.8 }, // D5
        { note: 587.33, dur: 0.4 }, // D5
        { note: 493.88, dur: 1.2 }, // B4

        { note: 523.25, dur: 0.8 }, // C5
        { note: 523.25, dur: 0.4 }, // C5
        { note: 392.00, dur: 1.2 }, // G4

        { note: 440.00, dur: 0.6 }, // A4
        { note: 440.00, dur: 0.4 }, // A4
        { note: 523.25, dur: 0.6 }, // C5
        { note: 493.88, dur: 0.4 }, // B4
        { note: 440.00, dur: 0.6 }, // A4

        { note: 392.00, dur: 0.6 }, // G4
        { note: 440.00, dur: 0.4 }, // A4
        { note: 392.00, dur: 0.6 }, // G4
        { note: 329.63, dur: 1.2 }, // E4
      ];
      this.noteIndex = 0;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.gain.value = this.isMuted ? 0 : this.volume;
      this.sfxGain.gain.value = this.isMuted ? 0 : 0.2;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    startMusic() {
      this.init();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (this.isPlaying) return;
      this.isPlaying = true;
      this.noteIndex = 0;
      this.scheduleNextNote();
    }

    scheduleNextNote() {
      if (!this.isPlaying || !this.ctx) return;

      const item = this.notes[this.noteIndex];
      this.playMusicBoxNote(item.note, item.dur);

      this.noteIndex = (this.noteIndex + 1) % this.notes.length;
      this.timerId = setTimeout(() => {
        this.scheduleNextNote();
      }, item.dur * 1000 * 0.9);
    }

    playMusicBoxNote(freq, dur) {
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;

      // Music box tone (sine + soft harmonic + quick decay)
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now); // soft octave harmonic

      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.3, now + 0.02); // quick attack
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(noteGain);
      osc2.connect(noteGain);
      noteGain.connect(this.musicGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + dur);
      osc2.stop(now + dur);

      // Random soft sleigh bell accent on major beats
      if (Math.random() < 0.25) {
        this.playSleighBell();
      }
    }

    playSleighBell() {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(2800 + Math.random() * 400, now);

      bellGain.gain.setValueAtTime(0.03, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      bellOsc.connect(bellGain);
      bellGain.connect(this.musicGain);

      bellOsc.start(now);
      bellOsc.stop(now + 0.12);
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('yera_christmas_muted', this.isMuted ? 'true' : 'false');

      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx ? this.ctx.currentTime : 0);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.2, this.ctx ? this.ctx.currentTime : 0);
      }

      return this.isMuted;
    }

    playCrackSFX() {
      this.init();
      if (!this.ctx || this.isMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      // Wax crack burst
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
    }

    playWhooshSFX() {
      this.init();
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    }

    playTapSFX() {
      this.init();
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  window.AudioEngine = AudioEngine;
})();
