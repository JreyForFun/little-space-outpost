/* BRIEFING: a short illustrated conversation before each mission (who speaks, with expressions). */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  class BriefingScene extends Phaser.Scene {
    constructor() { super('Briefing'); }

    create() {
      const M = NS.mission();
      this.M = M;
      this.lines = (NS.STORYDATA.BRIEFINGS[M.id] || []).slice();
      this.i = -1;
      this.cameras.main.fadeIn(400);
      NS.put(this, 'bg.site.' + M.map, 0, 0).setDepth(-100);
      this.add.rectangle(0, 0, NS.W, NS.H, 0x140d3d, 0.45).setOrigin(0);
      NS.twinkles(this, 20, { x: 0, y: 0, w: NS.W, h: 240 }, -80);
      this.focus = new NS.Focus(this);

      const chip = NS.glass(this, 24, 22, 520, 70, { r: 18 });
      chip.setDepth(1);
      NS.title(this, 44, 30, 'Mission ' + (NS.run.missionIndex + 1) + ': ' + M.title, 30, '#ffffff', false).setDepth(2);
      NS.text(this, 46, 66, (M.body === 'mars' ? 'MARS · ' : 'MOON · ') + M.concept, 15, '#7df9ff').setDepth(2);

      // cast: ASTRO on the left, crew on the right
      NS.glow(this, 230, 420, 0x7df9ff, 360, 0.35);
      this.cast = {
        astro: NS.portrait(this, 'astro', 'happy', 230, 400, 330),
        coral: NS.portrait(this, 'coral', 'happy', 870, 410, 270),
        sage: NS.portrait(this, 'sage', 'happy', 1010, 420, 250),
        lavender: NS.portrait(this, 'lavender', 'happy', 1150, 410, 270),
      };
      Object.values(this.cast).forEach((p) => { p.baseY = p.y; p.baseScale = p.scale; });
      this.tweens.add({ targets: this.cast.astro, y: this.cast.astro.y - 10, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.easeInOut' });

      // dialogue box
      NS.panel(this, 120, 520, 1040, 160, { r: 26 }).setDepth(10);
      const tagKey = NS.bake(this, 'nametag', 180, 46, (g) => {
        g.fillStyle(NS.C.ink, 1).fillRoundedRect(3, 7, 170, 34, 17);
        g.fillStyle(NS.C.teal, 1).fillRoundedRect(3, 3, 170, 34, 17);
        g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(3, 3, 170, 34, 17);
      });
      this.tag = this.add.image(150, 498, tagKey).setOrigin(0, 0).setDepth(11);
      this.tagT = NS.title(this, 238, 518, '', 20, NS.C.inkHex, false).setOrigin(0.5).setDepth(12);
      this.body = NS.text(this, 156, 552, '', 24, NS.C.inkHex, '700').setWordWrapWidth(900).setLineSpacing(4).setDepth(11);
      this.hint = NS.text(this, 1140, 664, 'tap / Enter ▶', 15, NS.C.slateHex).setOrigin(1, 1).setDepth(11);
      this.tweens.add({ targets: this.hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
      this.skipBtn = NS.button(this, 1180, 50, 140, 50, 'Skip', () => this.finish(), { color: NS.C.cream, size: 18 }).setDepth(20);

      this.input.on('pointerdown', (p, over) => { if (!over.length) this.next(); });
      this.input.keyboard.on('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowRight') this.next(); if (ev.key === 'Escape') this.finish(); });
      this.focus.set([this.skipBtn.focusItem('skip')]);
      this.next();
      window.__outpost = Object.assign(window.__outpost || {}, { briefing: this });
    }

    next() {
      if (this._typing) { this._typing.remove(false); this._typing = null; this.body.setText(this.cur); return; }
      this.i++;
      if (this.i >= this.lines.length) { this.finish(); return; }
      const [who, expr, text] = this.lines[this.i];
      this.cur = text;
      Object.entries(this.cast).forEach(([k, p]) => {
        const speaking = k === who;
        if (speaking) p.setExpr(expr);
        this.tweens.add({ targets: p, alpha: speaking ? 1 : 0.55, scale: p.baseScale * (speaking ? 1.08 : 0.94), duration: 220 });
        p.setTint(speaking ? 0xffffff : 0x9a90cc);
      });
      if (who !== 'astro') this.tweens.add({ targets: this.cast[who], y: this.cast[who].baseY - 18, yoyo: true, duration: 160 });
      this.tagT.setText(NS.STORYDATA.NAMES[who]);
      NS.voice.say(text);
      this.body.setText('');
      let n = 0;
      this._typing = this.time.addEvent({ delay: NS.FAST ? 1 : 18, repeat: text.length - 1, callback: () => {
        n++; this.body.setText(text.slice(0, n)); if (n % 3 === 0) NS.sfx('blip');
        if (n >= text.length) this._typing = null;
      } });
    }

    finish() {
      if (this._done) return;
      this._done = true;
      NS.go(this, 'Explore');
    }
  }
  NS.BriefingScene = BriefingScene;
})();
