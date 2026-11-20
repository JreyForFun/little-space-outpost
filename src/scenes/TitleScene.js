/* TITLE: animated nebula, the tiny Moon outpost, ASTRO waving, sound toggles and today's Sun. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }

    create() {
      this.cameras.main.fadeIn(500);
      NS.skyBackdrop(this);
      this.focus = new NS.Focus(this);

      // tiny planet with a soft glow, gently bobbing
      NS.glow(this, 640, 640, 0x9f7bff, 900, 0.35).setDepth(-60);
      const planet = NS.put(this, 'bg.title.planet', 640, 600).setDepth(-50);
      this.tweens.add({ targets: planet, y: 588, angle: 1.5, yoyo: true, repeat: -1, duration: 3200, ease: 'Sine.easeInOut' });

      // Earth in the distance
      const earth = NS.put(this, 'bg.earth', 1110, 130).setDepth(-55);
      NS.glow(this, 1110, 130, 0x6fb7ff, 220, 0.4).setDepth(-56);
      this.tweens.add({ targets: earth, angle: 360, duration: 120000, repeat: -1 });

      // ASTRO floats beside the title
      const astro = NS.portrait(this, 'astro', 'happy', 190, 330, 230).setDepth(10);
      NS.glow(this, 190, 400, 0x7df9ff, 160, 0.5).setDepth(9);
      this.tweens.add({ targets: astro, y: 312, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut' });
      this.time.addEvent({ delay: 3600, loop: true, callback: () => {
        astro.setExpr('wow'); this.time.delayedCall(700, () => astro.setExpr('happy'));
      } });

      // logo
      const logo = NS.title(this, 640, 84, 'Little Space Outpost', 76, '#fff7ea').setOrigin(0.5);
      logo.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: logo, scale: 1, alpha: 1, duration: 700, ease: 'Back.easeOut' });
      NS.title(this, 640, 150, 'JUNIOR ASTRONAUT MISSION TRAINER', 24, '#7df9ff', false).setOrigin(0.5).setLetterSpacing(3);
      NS.text(this, 640, 184, 'Run a Moon & Mars outpost. Balance power, air, food and radiation.', 19, NS.C.dimHex, '700').setOrigin(0.5);

      this.playBtn = NS.button(this, 640, 280, 300, 84, NS.save.data.unlocked > 1 ? 'Continue' : 'Start mission', () => this.start(),
        { color: NS.C.yellow, icon: 'flag', size: 30, sound: 'unlock' });
      this.playBtn.pulse();

      // toggles
      this.toggles = [];
      this.makeToggles();

      // today's Sun card
      this.sunCard = this.add.container(0, 0);
      this.drawSun();
      this.time.addEvent({ delay: 800, repeat: 12, callback: () => { if (NS.live.status !== this._sunStatus) this.drawSun(); } });

      NS.text(this, 640, 704, 'Made for ages 7–12 · Uses real NASA data: DONKI space weather, OSDR health studies, Curiosity RAD', 13, NS.C.dimHex, '700')
        .setOrigin(0.5, 1);
      this.input.keyboard.on('keydown-ENTER', () => { if (!this.focus.visible) this.start(); });
      this.updateFocus();
      window.__outpost = Object.assign(window.__outpost || {}, { title: this });
    }

    makeToggles() {
      this.toggles.forEach((t) => t.destroy());
      const S = NS.save.data.settings;
      const mk = (x, icon, on, label, fn) => NS.button(this, x, 672, 168, 48, label, fn, { icon, iconOpts: { muted: !on }, color: on ? NS.C.cream : 0x8f88b8, size: 17 });
      this.toggles = [
        mk(110, 'music', S.music !== false, 'Music', () => { NS.audio.init(); NS.audio.setMusic(!(S.music !== false)); this.makeToggles(); }),
        mk(290, 'speaker', S.sfx !== false, 'Sounds', () => { NS.audio.init(); NS.audio.setSfx(!(S.sfx !== false)); this.makeToggles(); }),
      ];
      if (NS.voice.supported) {
        this.toggles.push(mk(1170, 'speaker', !!S.voice, 'Read aloud', () => {
          NS.save.setSetting('voice', !S.voice); if (S.voice) NS.voice.say('I will read everything out loud.'); else NS.voice.stop(); this.makeToggles();
        }));
      }
      this.updateFocus();
    }

    drawSun() {
      const c = this.sunCard; c.removeAll(true);
      this._sunStatus = NS.live.status;
      const x = 900, y = 222, w = 350, h = 128;
      c.add(NS.glass(this, x, y, w, h));
      const sm = NS.live.summary();
      const loading = NS.live.status === 'loading' || NS.live.status === 'idle';
      const badgeCol = sm.label === 'LIVE' ? NS.C.red : sm.label === 'ARCHIVE' ? NS.C.teal : 0x8f88b8;
      c.add(NS.icon(this, 'sun', x + 32, y + 34, 34));
      c.add(NS.title(this, x + 58, y + 14, "TODAY'S SUN", 20, '#ffffff', false));
      const bk = NS.bake(this, 'pill:' + badgeCol, 92, 30, (g) => { g.fillStyle(badgeCol, 1).fillRoundedRect(2, 2, 88, 26, 13); });
      c.add(this.add.image(x + w - 58, y + 26, bk));
      c.add(NS.text(this, x + w - 58, y + 26, loading ? '…' : sm.label, 14, '#ffffff').setOrigin(0.5));
      c.add(NS.text(this, x + 20, y + 58, loading ? 'Checking NASA DONKI for real solar flares…' : sm.text, 15, '#ffffff', '700').setWordWrapWidth(w - 40));
      if (!loading && sm.strongest) {
        c.add(NS.text(this, x + 20, y + 96, 'Strongest: ' + sm.strongest.cls + ' flare (' + String(sm.strongest.peak || sm.strongest.date || '').slice(0, 10) + ')', 14, '#ffd23f'));
      }
      if (sm.label === 'LIVE') {
        const dot = NS.icon(this, 'live', x + w - 92, y + 26, 10);
        c.add(dot);
        this.tweens.add({ targets: dot, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
      }
    }

    updateFocus() {
      if (!this.focus || !this.playBtn) return;
      this.focus.set([this.playBtn.focusItem('play')].concat(this.toggles.map((t, i) => t.focusItem('t' + i))));
    }

    start() { NS.audio.init(); NS.go(this, 'Campaign'); }
  }
  NS.TitleScene = TitleScene;
})();
