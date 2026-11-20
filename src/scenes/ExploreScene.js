/* STAGE 1 - EXPLORE: scout the mission's landing sites, compare their trade-offs, pick one. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const T = (ms) => (NS.FAST ? ms * 0.15 : ms);

  // ring + check/cross badge drawn in code
  NS.siteMarker = function (scene, ok, x, y) {
    const key = NS.bake(scene, 'marker:' + ok, 170, 130, (g) => {
      const col = ok ? NS.C.green : NS.C.orange, cx = 85, cy = 100;
      g.fillStyle(col, 0.3).fillEllipse(cx, cy, 150, 52);
      g.lineStyle(5, NS.C.ink, 1).strokeEllipse(cx, cy, 150, 52);
      g.lineStyle(3, col, 1).strokeEllipse(cx, cy, 140, 46);
      g.fillStyle(NS.C.ink, 0.4).fillCircle(cx + 2, cy - 50, 21);
      g.fillStyle(col, 1).fillCircle(cx, cy - 54, 21);
      g.lineStyle(4, NS.C.ink, 1).strokeCircle(cx, cy - 54, 21);
      g.lineStyle(5, NS.C.ink, 1);
      if (ok) g.beginPath().moveTo(cx - 9, cy - 54).lineTo(cx - 2, cy - 46).lineTo(cx + 10, cy - 62).strokePath();
      else g.lineBetween(cx - 8, cy - 62, cx + 8, cy - 46).lineBetween(cx + 8, cy - 62, cx - 8, cy - 46);
    });
    return scene.add.image(x, y + 23, key).setOrigin(0.5, 0.95);
  };

  class ExploreScene extends Phaser.Scene {
    constructor() { super('Explore'); }

    create() {
      const C = NS.C, CT = NS.CONTENT;
      const M = NS.mission();
      this.cameras.main.fadeIn(400);
      NS.put(this, 'bg.map.' + M.map, 0, 0).setDepth(-100);
      if (M.map !== 'mars') NS.twinkles(this, 24, { x: 0, y: 0, w: NS.W, h: 200 }, -90);
      this.focus = new NS.Focus(this);

      this.mode = 'pick'; // pick -> scanning -> result -> done
      this.current = null;
      this.found = {};
      this.hoverId = null;
      this.chosen = null;
      this.markers = {};
      this.sites = M.sites.map((id) => Object.assign({ id }, CT.SITES[id]));
      this.crew = NS.CREW.map((n, i) => NS.makeAstronaut(this, n, 96 + i * 58, 600 - (i % 2) * 12));

      this.ringG = this.add.graphics().setDepth(-50);
      this.scanG = this.add.graphics().setDepth(40);
      this.areaUI = {};
      this.sites.forEach((a, k) => {
        const letter = String.fromCharCode(65 + k);
        const bk = NS.bake(this, 'sitebadge', 44, 48, (g) => {
          g.fillStyle(C.ink, 0.4).fillCircle(24, 26, 18);
          g.fillStyle(C.cream, 1).fillCircle(22, 22, 18);
          g.lineStyle(3, C.ink, 1).strokeCircle(22, 22, 18);
        });
        const badge = this.add.image(a.x, a.y - 40, bk).setDepth(30);
        const lt = NS.title(this, a.x, a.y - 42, letter, 20, NS.C.inkHex, false).setOrigin(0.5).setDepth(31);
        const tag = NS.text(this, a.x, a.y + 40, a.name, 16, '#ffffff').setOrigin(0.5).setDepth(32).setStroke(NS.C.inkHex, 5);
        const zone = this.add.zone(a.x, a.y - 8, 190, 108).setInteractive({ useHandCursor: true }).setDepth(60);
        zone.on('pointerover', () => { this.hoverId = a.id; });
        zone.on('pointerout', () => { if (this.hoverId === a.id) this.hoverId = null; });
        zone.on('pointerdown', () => this.inspect(a));
        this.areaUI[a.id] = { badge, lt, tag, zone, letter };
      });

      this.guide = NS.createGuide(this, 24, 26, 640);
      this.guide.say('Let’s scout ' + (M.body === 'mars' ? 'Mars' : 'the Moon') + ', Commander! Every landing site has good and bad points. Tap one to scan it.', { expr: 'talk' });
      this.buildTracker();

      NS.glass(this, 24, 586, 1232, 120).setDepth(3000);
      this.panelTitle = NS.text(this, 52, 598, '', 15, '#7df9ff').setDepth(3001);
      this.panelBody = NS.text(this, 52, 620, '', 19, '#ffffff', '700').setDepth(3001).setWordWrapWidth(760).setLineSpacing(2);
      this.traitG = this.add.container(0, 0).setDepth(3001);
      this.btnConfirm = NS.button(this, 960, 646, 220, 60, 'Land here', () => this.confirm(), { color: NS.C.green, icon: 'flag', sound: 'unlock' }).setDepth(3001);
      this.btnCancel = NS.button(this, 1166, 646, 150, 60, 'Back', () => this.cancel(), { color: NS.C.cream }).setDepth(3001);
      this.btnStart = NS.button(this, 1080, 646, 300, 64, 'Start building', () => this.startBuild(), { color: NS.C.yellow, icon: 'crate' }).setDepth(3001);
      this.setPanel('pick');
      this.input.keyboard.on('keydown', (ev) => {
        const k = ev.key.toUpperCase(), idx = k.charCodeAt(0) - 65;
        if (k.length === 1 && idx >= 0 && idx < this.sites.length) this.inspect(this.sites[idx]);
        if (ev.key === 'Escape') this.cancel();
      });
      window.__outpost = Object.assign(window.__outpost || {}, { explore: this });
    }

    buildTracker() {
      NS.glass(this, 862, 18, 394, 74, { r: 18 }).setDepth(2999);
      this.stepG = this.add.graphics().setDepth(3000);
      ['1 Scout', '2 Choose', '3 Land'].forEach((s, i) => NS.title(this, 880 + i * 124 + 56, 44, s, 16, NS.C.inkHex, false).setOrigin(0.5).setDepth(3001));
      NS.text(this, 1246, 70, NS.stageLabel('Explore'), 13, NS.C.dimHex).setOrigin(1, 0).setDepth(3001);
      this.setStep(0);
    }
    setStep(n) {
      const g = this.stepG; g.clear();
      for (let i = 0; i < 3; i++) {
        const x = 880 + i * 124, y = 28, w = 112, h = 32;
        const col = i < n ? NS.C.green : i === n ? NS.C.teal : 0x8f88b8;
        g.fillStyle(NS.C.ink, 1).fillRoundedRect(x, y + 4, w, h, 16);
        g.fillStyle(col, 1).fillRoundedRect(x, y, w, h, 16);
        g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(x, y, w, h, 16);
      }
    }

    showTraits(a) {
      this.traitG.removeAll(true);
      if (!a) return;
      const icons = { Sun: 'sun', sun: 'sun', ice: 'water', Ice: 'water', ground: 'flag', plains: 'flag', lake: 'water', Always: 'night', cold: 'night', steep: 'storm', boulders: 'storm', canyon: 'storm', cliffs: 'storm', sunny: 'sun', plateau: 'flag', ridge: 'sun', edge: 'flag' };
      let x = 52;
      a.traits.forEach((t) => {
        const key = Object.keys(icons).find((k) => t.indexOf(k) >= 0);
        const ic = NS.icon(this, key ? icons[key] : 'flag', x + 12, 684, 22);
        const tx = NS.text(this, x + 28, 673, t, 15, '#ffffff', '800');
        this.traitG.add([ic, tx]);
        x += 50 + tx.width;
      });
      if (a.region) this.traitG.add(NS.text(this, x + 6, 673, '· ' + a.region, 15, '#7df9ff', '800'));
    }

    setPanel(mode, a) {
      [this.btnConfirm, this.btnCancel, this.btnStart].forEach((b) => b.setVisible(false));
      if (mode === 'pick') {
        this.panelTitle.setText('SITE REPORT');
        this.panelBody.setText('Tap a spot on the map to scan it (or press A, B, C…).');
        this.showTraits(null);
      } else if (mode === 'scanning') {
        this.panelTitle.setText('SITE ' + this.areaUI[a.id].letter + ' · ' + a.name.toUpperCase());
        this.panelBody.setText('Scanning the ground…');
        this.showTraits(null);
      } else if (mode === 'ok') {
        this.panelTitle.setText('SITE ' + this.areaUI[a.id].letter + ' · ' + a.name.toUpperCase() + '   ·   SAFE TO LAND');
        this.panelBody.setText(a.report);
        this.showTraits(a);
        this.btnConfirm.setVisible(true); this.btnCancel.setVisible(true);
      } else if (mode === 'blocked') {
        this.panelTitle.setText('SITE ' + this.areaUI[a.id].letter + ' · ' + a.name.toUpperCase() + '   ·   NOT SAFE');
        this.panelBody.setText(a.report);
        this.showTraits(a);
        this.btnCancel.setVisible(true);
      } else if (mode === 'done') {
        this.panelTitle.setText('LANDING SITE CHOSEN');
        this.panelBody.setText(a.name + ' is marked on the map. Time to build the outpost!');
        this.showTraits(a);
        this.btnStart.setVisible(true);
      }
      this.updateFocus();
    }

    updateFocus() {
      const items = [];
      if (this.mode === 'pick' || this.mode === 'result') {
        this.sites.forEach((a) => items.push({ id: 'site' + a.id, bounds: () => ({ x: a.x - 90, y: a.y - 60, w: 180, h: 110 }), activate: () => this.inspect(a) }));
      }
      [this.btnStart, this.btnConfirm, this.btnCancel].forEach((b, i) => { if (b.visible) items.unshift(b.focusItem('b' + i)); });
      this.focus.set(items);
    }

    inspect(a) {
      if (this.mode === 'scanning' || this.mode === 'done' || this.mode === 'leaving') return;
      this.current = a;
      if (this.found[a.id]) { this.mode = 'result'; this.showResult(a); return; }
      this.mode = 'scanning';
      NS.sfx('radio');
      this.setPanel('scanning', a);
      const p = { t: 0 };
      this.tweens.add({
        targets: p, t: 1, duration: T(1150), ease: 'Sine.easeInOut',
        onUpdate: () => {
          const g = this.scanG; g.clear();
          [0, 0.33, 0.66].forEach((o) => { const k = (p.t + o) % 1; g.lineStyle(4, 0x7df9ff, 1 - k).strokeEllipse(a.x, a.y, 40 + k * 190, 14 + k * 70); });
        },
        onComplete: () => { this.scanG.clear(); this.mode = 'result'; this.showResult(a); },
      });
    }

    showResult(a) {
      this.found[a.id] = a.safe ? 'ok' : 'blocked';
      if (!this.markers[a.id]) {
        const m = NS.siteMarker(this, a.safe, a.x, a.y).setDepth(25);
        m.setScale(0);
        this.tweens.add({ targets: m, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
        this.markers[a.id] = m;
        NS.sfx(a.safe ? 'on' : 'error');
      }
      this.guide.say(a.safe ? a.name + ' is safe! ' + a.traits.join('. ') + '.' : 'Uh-oh! ' + a.report, { expr: a.safe ? 'wow' : 'worried' });
      this.setStep(1);
      this.setPanel(a.safe ? 'ok' : 'blocked', a);
    }

    cancel() {
      if (this.mode !== 'result') return;
      this.current = null; this.mode = 'pick';
      this.guide.say('No problem, Commander. Let’s compare another spot!', { expr: 'happy' });
      this.setPanel('pick');
    }

    confirm() {
      if (this.mode !== 'result' || !this.current || !this.current.safe) return;
      const a = this.current;
      this.chosen = a; this.mode = 'done';
      NS.run.siteId = a.id;
      this.setStep(3);
      if (this.markers[a.id]) this.markers[a.id].setVisible(false);
      const key = NS.bake(this, 'flagpin', 60, 80, (g) => {
        g.lineStyle(5, NS.C.ink, 1).lineBetween(8, 76, 8, 6);
        g.fillStyle(NS.C.orange, 1).fillTriangle(8, 6, 50, 20, 8, 34);
        g.lineStyle(4, NS.C.ink, 1).strokeTriangle(8, 6, 50, 20, 8, 34);
      });
      const f = this.add.image(a.x, a.y + 4, key).setOrigin(0.12, 1).setDepth(a.y).setScale(0);
      this.tweens.add({ targets: f, scale: 1, duration: 380, ease: 'Back.easeOut' });
      NS.confetti(this, a.x, a.y - 40, 40);
      NS.toast(this, 'Landing site: ' + a.name, NS.C.green);
      this.guide.say('Great choice! The crew is heading to ' + a.name + '.', { expr: 'happy' });
      this.setPanel('done', a);
      const spots = [[-58, 30], [0, 42], [58, 30]];
      this.crew.forEach((c, i) => this.time.delayedCall(i * 250, () => c.walkTo(a.x + spots[i][0], a.y + spots[i][1])));
    }

    startBuild() {
      if (this.mode !== 'done') return;
      this.mode = 'leaving';
      NS.go(this, 'Build');
    }

    update(time) {
      const g = this.ringG; g.clear();
      const ph = time * 0.0004;
      this.sites.forEach((a) => {
        const ui = this.areaUI[a.id];
        const status = this.found[a.id];
        const isCur = this.current && this.current.id === a.id;
        const hover = this.hoverId === a.id && this.mode !== 'scanning' && this.mode !== 'done';
        const isChosen = this.chosen && this.chosen.id === a.id;
        ui.badge.setVisible(!isChosen); ui.lt.setVisible(!isChosen);
        if (isChosen) {
          g.fillStyle(NS.C.green, 0.3).fillEllipse(a.x, a.y, 156, 56);
          g.lineStyle(5, NS.C.greenDark, 1).strokeEllipse(a.x, a.y, 156, 56);
        } else if (status) {
          if (isCur) g.fillStyle(status === 'ok' ? NS.C.green : NS.C.orange, 0.2).fillEllipse(a.x, a.y, 160, 58);
        } else {
          if (hover || isCur) g.fillStyle(NS.C.teal, 0.3).fillEllipse(a.x, a.y, 160, 58);
          g.lineStyle(hover || isCur ? 5 : 3, hover || isCur ? 0xfff7ea : 0xffffff, hover || isCur ? 1 : 0.85);
          NS.dashedEllipse(g, a.x, a.y, 78, 28, ph, 26, 0.6);
        }
      });
    }
  }
  NS.ExploreScene = ExploreScene;
})();
