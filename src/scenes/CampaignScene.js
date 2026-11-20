/* CAMPAIGN MAP: six missions from the Moon to Mars, patches, goals, Journal and the Live Sun setting. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const NODES = [[130, 520], [305, 430], [480, 510], [655, 410], [830, 490], [1060, 380]];

  class CampaignScene extends Phaser.Scene {
    constructor() { super('Campaign'); }

    create() {
      const C = NS.CONTENT;
      this.cameras.main.fadeIn(350);
      NS.skyBackdrop(this);
      this.focus = new NS.Focus(this);

      NS.title(this, 32, 20, 'Mission Map', 44, '#fff7ea');
      NS.text(this, 36, 78, 'Junior Astronaut Academy · from the Moon to Mars', 18, NS.C.dimHex, '700');
      const total = C.MISSIONS.reduce((s, m) => s + NS.save.starsFor(m.id), 0);
      NS.glass(this, 1062, 24, 194, 56, { r: 16 });
      NS.icon(this, 'star', 1098, 52, 30);
      NS.title(this, 1122, 32, total + ' / ' + C.MISSIONS.length * 3, 26, '#ffffff', false);

      // path: dotted line from the Moon to Mars
      const g = this.add.graphics();
      for (let i = 0; i < NODES.length - 1; i++) {
        const [x1, y1] = NODES[i], [x2, y2] = NODES[i + 1];
        for (let k = 1; k < 12; k++) {
          const t = k / 12, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 30;
          g.fillStyle(NS.save.isUnlocked(i + 1) ? 0x7df9ff : 0xffffff, NS.save.isUnlocked(i + 1) ? 0.9 : 0.3).fillCircle(px, py, 3.2);
        }
      }
      NS.glow(this, 1060, 380, 0xff8a5c, 260, 0.35).setDepth(-5);
      this.nodes = C.MISSIONS.map((M, i) => this.makeNode(M, i));

      const firstNew = C.MISSIONS.findIndex((m, i) => NS.save.isUnlocked(i) && !NS.save.starsFor(m.id));
      this.selected = firstNew >= 0 ? firstNew : Math.min(NS.save.data.unlocked, C.MISSIONS.length) - 1;

      // info panel
      NS.glass(this, 620, 112, 636, 214);
      this.infoTitle = NS.title(this, 648, 124, '', 30, '#ffffff', false);
      this.infoConcept = NS.text(this, 650, 164, '', 16, '#7df9ff');
      this.infoBody = NS.text(this, 650, 190, '', 17, '#ffffff', '700').setWordWrapWidth(400).setLineSpacing(2);
      this.goalStars = [];
      this.goalTexts = [0, 1, 2].map((i) => NS.text(this, 680, 250 + i * 24, '', 15, NS.C.dimHex, '700'));
      this.playBtn = NS.button(this, 1150, 280, 170, 64, 'Play', () => this.play(), { icon: 'flag', color: NS.C.yellow, sound: 'unlock' });
      this.infoPatch = null;

      // bottom bar
      const facts = NS.save.data.logbook.length, totalFacts = NS.LOGBOOK.ENTRIES.length + NS.OSDR.studies.length;
      this.backBtn = NS.button(this, 92, 670, 140, 54, 'Title', () => NS.go(this, 'Title'), { color: NS.C.cream, size: 19 });
      this.logBtn = NS.button(this, 300, 670, 240, 54, 'Journal ' + facts + '/' + totalFacts, () => NS.go(this, 'Journal', { back: 'Campaign' }), { icon: 'book', color: NS.C.yellow, size: 19 });
      this.liveBtn = null;
      this.drawLive();
      this.resetBtn = NS.button(this, 1180, 670, 140, 54, 'Reset', () => this.askReset(), { color: 0x8f88b8, size: 18 });

      this.select(this.selected, true);
      if (NS.save.notice) { NS.toast(this, NS.save.notice, NS.C.yellow); NS.save.notice = null; }
      this.input.keyboard.on('keydown', (ev) => { if (/^[1-6]$/.test(ev.key)) this.select(parseInt(ev.key, 10) - 1); });
      window.__outpost = Object.assign(window.__outpost || {}, { campaign: this });
    }

    drawLive() {
      if (this.liveBtn) this.liveBtn.destroy();
      const on = NS.save.data.settings.live !== false;
      const sm = NS.live.summary();
      const label = on ? 'Storms: ' + (NS.live.status === 'live' ? 'LIVE Sun' : sm.label === 'ARCHIVE' ? 'NASA archive' : 'practice') : 'Storms: NASA archive';
      this.liveBtn = NS.button(this, 640, 670, 300, 54, label, () => {
        NS.save.setSetting('live', !on);
        if (!on) NS.live.load().then(() => this.drawLive());
        this.drawLive();
      }, { icon: 'sun', color: on ? NS.C.orange : 0x8f88b8, size: 18 });
      this.updateFocus();
    }

    makeNode(M, i) {
      const [x, y] = NODES[i];
      const open = NS.save.isUnlocked(i);
      const stars = NS.save.starsFor(M.id);
      const c = this.add.container(x, y);
      let ring;
      if (stars) {
        c.add(NS.patch(this, 0, 0, i, 108, true));
      } else {
        const mars = M.body === 'mars';
        const key = NS.bake(this, 'node:' + M.body + ':' + open, 120, 124, (gg) => {
          gg.fillStyle(0x0b0626, 0.4).fillCircle(62, 66, 52);
          gg.fillStyle(open ? (mars ? 0xe58a5a : 0xb7b1e6) : 0x4c4483, 1).fillCircle(60, 60, 52);
          gg.fillStyle(open ? (mars ? 0xa8483a : 0x6f62b8) : 0x3a3370, 1).fillCircle(42, 48, 12).fillCircle(74, 76, 15).fillCircle(78, 38, 7);
          gg.fillStyle(0xffffff, 0.25).fillCircle(44, 36, 18);
          gg.lineStyle(5, NS.C.ink, 1).strokeCircle(60, 60, 52);
        });
        c.add(this.add.image(0, 0, key));
        if (open) c.add(NS.title(this, 0, -2, String(i + 1), 38, '#ffffff').setOrigin(0.5));
        else c.add(NS.icon(this, 'lock', 0, 0, 34));
      }
      ring = this.add.graphics();
      c.add(ring);
      c.add(NS.starsRow(this, 0, 66, stars, 20, 24));
      const name = NS.title(this, x, y + 82, M.title, 17, '#ffffff', NS.C.inkHex).setOrigin(0.5, 0);
      name.setAlpha(open ? 1 : 0.55);
      if (open && !stars) this.tweens.add({ targets: c, y: y - 6, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
      c.setSize(116, 116).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { NS.sfx('click'); this.select(i); });
      const draw = (sel) => { ring.clear(); if (sel) ring.lineStyle(5, 0xffd23f, 1).strokeCircle(0, 0, 62); };
      return { c, draw, open, x, y };
    }

    select(i, quiet) {
      const M = NS.CONTENT.MISSIONS[i];
      this.selected = i;
      this.nodes.forEach((n, k) => n.draw(k === i));
      const open = NS.save.isUnlocked(i);
      this.infoTitle.setText((i + 1) + '. ' + M.title);
      this.infoConcept.setText((M.body === 'mars' ? 'MARS · ' : 'MOON · ') + M.concept.toUpperCase() + ' · ' + M.days + ' days');
      const intro = (NS.STORYDATA.BRIEFINGS[M.id] || [])[0];
      this.infoBody.setText(open ? '“' + (intro ? intro[2] : M.title) + '”' : 'Finish mission ' + i + ' to unlock.');
      const best = NS.save.starsFor(M.id);
      const goals = ['Survive all ' + M.days + ' days', 'Keep ' + M.healthGoal + '+ hearts and nobody over the radiation limit', 'Collect ' + M.scienceGoal + ' science'];
      this.goalStars.forEach((s) => s.destroy());
      this.goalStars = goals.map((t, k) => {
        this.goalTexts[k].setText(t).setAlpha(open ? 1 : 0.4);
        return NS.icon(this, 'star', 664, 260 + k * 24, 16, { color: k < best ? NS.C.yellow : 0x6f669e });
      });
      if (this.infoPatch) this.infoPatch.destroy();
      this.infoPatch = NS.patch(this, 1150, 190, i, 120, best > 0).setAlpha(open ? 1 : 0.4);
      this.playBtn.setEnabled(open).setLabel(best ? 'Replay' : 'Play');
      if (!quiet && open) NS.voice.say(M.title + '. ' + (intro ? intro[2] : ''));
      this.updateFocus();
    }

    updateFocus() {
      if (!this.focus || !this.nodes) return;
      const items = this.nodes.map((n, i) => ({
        id: 'node' + i, bounds: () => ({ x: n.x - 58, y: n.y - 58, w: 116, h: 116 }), activate: () => { this.select(i); if (n.open) this.play(); },
        left: () => this.select(Math.max(0, i - 1)), right: () => this.select(Math.min(this.nodes.length - 1, i + 1)),
      }));
      [this.playBtn, this.logBtn, this.liveBtn, this.backBtn, this.resetBtn].forEach((b, k) => { if (b) items.push(b.focusItem('b' + k)); });
      this.focus.set(items);
    }

    askReset() {
      if (this._confirm) return;
      const D = 8000;
      const shade = this.add.rectangle(0, 0, NS.W, NS.H, 0x0b0626, 0.7).setOrigin(0).setDepth(D).setInteractive();
      const p = NS.panel(this, 380, 250, 520, 200).setDepth(D + 1);
      const t = NS.text(this, 640, 300, 'Start over? All stars, patches and\nJournal entries will be cleared.', 21).setOrigin(0.5).setAlign('center').setDepth(D + 2);
      const close = () => { [shade, p, t, yes, no].forEach((o) => o.destroy()); this._confirm = null; this.updateFocus(); };
      const yes = NS.button(this, 540, 395, 190, 56, 'Yes, reset', () => { NS.save.reset(); this.scene.restart(); }, { color: NS.C.orange }).setDepth(D + 2);
      const no = NS.button(this, 750, 395, 170, 56, 'Keep', close, { color: NS.C.green }).setDepth(D + 2);
      this._confirm = true;
      this.focus.set([no.focusItem('no'), yes.focusItem('yes')]);
    }

    play() {
      if (!NS.save.isUnlocked(this.selected)) return;
      NS.run = NS.freshRun(this.selected);
      NS.go(this, 'Briefing');
    }
  }
  NS.CampaignScene = CampaignScene;
})();
