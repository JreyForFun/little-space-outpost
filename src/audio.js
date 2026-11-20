/* AUDIO - every sound and the music are synthesized with the Web Audio API (no audio files,
 * nothing to license). Starts on the first tap/key (browser autoplay rules). Music and sound
 * effects have separate, saved toggles. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

  const A = {
    ctx: null, master: null, music: null, sfxBus: null, noiseBuf: null, started: false, _timer: null,
    get musicOn() { return NS.save ? NS.save.data.settings.music !== false : true; },
    get sfxOn() { return NS.save ? NS.save.data.settings.sfx !== false : true; },

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
        this.music = this.ctx.createGain(); this.music.gain.value = this.musicOn ? 0.22 : 0; this.music.connect(this.master);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.6 : 0; this.sfxBus.connect(this.master);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.started = true;
        this.startMusic();
      } catch (e) { this.ctx = null; }
    },

    setMusic(on) { NS.save.setSetting('music', on); if (this.music) this.music.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.3); },
    setSfx(on) { NS.save.setSetting('sfx', on); if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.05); },

    // ---------------------------------------------------------------- building blocks
    tone(freq, t0, dur, opts) {
      opts = opts || {};
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = opts.type || 'triangle';
      o.frequency.setValueAtTime(freq, t0);
      if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
      const v = opts.vol == null ? 0.3 : opts.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(opts.bus || this.sfxBus);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },
    noise(t0, dur, opts) {
      opts = opts || {};
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; s.loop = true;
      f.type = opts.filter || 'lowpass';
      f.frequency.setValueAtTime(opts.from || 800, t0);
      if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
      f.Q.value = opts.q || 1;
      const v = opts.vol == null ? 0.2 : opts.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack || 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.sfxBus);
      s.start(t0); s.stop(t0 + dur + 0.05);
    },

    // ---------------------------------------------------------------- sound effects
    sfx(name, arg) {
      if (!this.ctx || !this.sfxOn) return;
      const t = this.ctx.currentTime + 0.01;
      switch (name) {
        case 'click': this.tone(NOTE(84), t, 0.07, { type: 'square', vol: 0.08, to: NOTE(91) }); break;
        case 'hover': this.tone(NOTE(96), t, 0.03, { type: 'sine', vol: 0.03 }); break;
        case 'on': this.tone(NOTE(72), t, 0.08, { vol: 0.2 }); this.tone(NOTE(79), t + 0.07, 0.12, { vol: 0.2 }); break;
        case 'off': this.tone(NOTE(79), t, 0.08, { vol: 0.18 }); this.tone(NOTE(70), t + 0.07, 0.14, { vol: 0.18 }); break;
        case 'build':
          this.tone(140, t, 0.25, { type: 'sine', vol: 0.5, to: 55 });
          this.noise(t, 0.3, { from: 1800, to: 300, vol: 0.15 });
          [88, 92, 95].forEach((n, i) => this.tone(NOTE(n), t + 0.15 + i * 0.06, 0.18, { type: 'sine', vol: 0.12 }));
          break;
        case 'error': this.tone(NOTE(55), t, 0.12, { type: 'square', vol: 0.08 }); this.tone(NOTE(50), t + 0.1, 0.18, { type: 'square', vol: 0.08 }); break;
        case 'day':
          this.noise(t, 0.7, { filter: 'bandpass', from: 300, to: 3000, q: 2, vol: 0.12, attack: 0.25 });
          [72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), t + 0.35 + i * 0.09, 0.5, { type: 'sine', vol: 0.12 }));
          break;
        case 'alarm': [0, 0.25].forEach((d) => { this.tone(NOTE(81), t + d, 0.12, { type: 'square', vol: 0.07 }); this.tone(NOTE(76), t + d + 0.12, 0.12, { type: 'square', vol: 0.07 }); }); break;
        case 'storm':
          this.noise(t, 1.8, { from: 200, to: 2400, vol: 0.3, attack: 0.3 });
          this.tone(70, t, 1.6, { type: 'sawtooth', vol: 0.06, to: 45 });
          break;
        case 'shield': [79, 83, 86, 91].forEach((n, i) => this.tone(NOTE(n), t + i * 0.05, 0.4, { type: 'sine', vol: 0.12 })); break;
        case 'radio':
          this.noise(t, 0.5, { filter: 'bandpass', from: 1500, q: 6, vol: 0.12 });
          this.tone(NOTE(88), t + 0.5, 0.12, { type: 'sine', vol: 0.12 }); this.tone(NOTE(93), t + 0.62, 0.15, { type: 'sine', vol: 0.12 });
          break;
        case 'blip': this.tone(NOTE(86 + Math.floor(Math.random() * 5)), t, 0.025, { type: 'square', vol: 0.025 }); break;
        case 'star': this.tone(NOTE(84 + (arg || 0) * 4), t, 0.5, { type: 'triangle', vol: 0.25 }); this.tone(NOTE(96 + (arg || 0) * 4), t + 0.02, 0.4, { type: 'sine', vol: 0.12 }); break;
        case 'win': [72, 76, 79, 84, 88].forEach((n, i) => this.tone(NOTE(n), t + i * 0.11, 0.5, { vol: 0.22 })); break;
        case 'lose': [72, 69, 65, 62].forEach((n, i) => this.tone(NOTE(n), t + i * 0.16, 0.45, { type: 'sine', vol: 0.2 })); break;
        case 'unlock': [79, 84, 91].forEach((n, i) => this.tone(NOTE(n), t + i * 0.08, 0.35, { type: 'sine', vol: 0.15 })); break;
        default: break;
      }
    },

    // ---------------------------------------------------------------- generative space music
    startMusic() {
      if (!this.ctx || this._timer) return;
      // gentle Cmaj7 - Am7 - Fmaj7 - G6 loop with a soft pad, a bass note and twinkly plucks
      const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 64]];
      const penta = [72, 74, 76, 79, 81, 84, 86, 88];
      const bar = 4.0;
      let next = this.ctx.currentTime + 0.2, n = 0;
      const schedule = () => {
        if (!this.ctx) return;
        while (next < this.ctx.currentTime + 1.0) {
          const ch = chords[n % 4];
          ch.forEach((m, i) => {
            const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
            o.type = i % 2 ? 'triangle' : 'sine';
            o.frequency.value = NOTE(m);
            o.detune.value = (i - 1.5) * 4;
            f.type = 'lowpass'; f.frequency.value = 1400;
            g.gain.setValueAtTime(0.0001, next);
            g.gain.exponentialRampToValueAtTime(0.06, next + 1.2);
            g.gain.exponentialRampToValueAtTime(0.0001, next + bar + 0.8);
            o.connect(f); f.connect(g); g.connect(this.music);
            o.start(next); o.stop(next + bar + 1);
          });
          this.tone(NOTE(ch[0] - 24), next, bar, { type: 'sine', vol: 0.12, attack: 0.3, bus: this.music });
          for (let k = 0; k < 3; k++) {
            if (Math.random() < 0.7) {
              const at = next + 0.5 + k * 1.2 + Math.random() * 0.3;
              this.tone(NOTE(penta[Math.floor(Math.random() * penta.length)]), at, 1.2, { type: 'sine', vol: 0.07, bus: this.music });
            }
          }
          next += bar; n++;
        }
      };
      schedule();
      this._timer = setInterval(schedule, 400);
    },
  };

  NS.audio = A;
  const unlock = () => A.init();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
})();
