/* STAGE 2 - BUILD: spend supply crates on buildings and place them on pads.
 * Pad traits (flat / sunny / shaded) decide what fits and give bonuses. The layout
 * becomes the input of the mission simulation. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const CARD_X = 24, CARD_Y0 = 124, CARD_W = 200, CARD_H = 62, CARD_GAP = 6;

  class BuildScene extends Phaser.Scene {
    constructor() { super('Build'); }

    create() {
      const CT = NS.CONTENT;
      const M = NS.mission();
      this.M = M;
      if (!NS.run.siteId) NS.run.siteId = M.sites.find((s) => CT.SITES[s].safe);
      this.site = CT.SITES[NS.run.siteId];
      this.tags = CT.PAD_SETS[this.site.padSet];
      this.cameras.main.fadeIn(400);
      NS.put(this, 'bg.site.' + M.map, 0, 0).setDepth(-100);
      if (M.map !== 'mars') NS.twinkles(this, 20, { x: 0, y: 0, w: NS.W, h: 180 }, -90);
      this.focus = new NS.Focus(this);

      this.sel = null; this.picked = null; this.hoverPad = null;
      this.sprites = []; this.layout = [];

      this.ringG = this.add.graphics().setDepth(-40);
      this.padLabels = NS.PADS.map((p, i) => {
        const t = NS.text(this, p.x, p.y + 34, this.tags[i].join(' · '), 13, '#ffffff').setOrigin(0.5).setDepth(15).setStroke(NS.C.inkHex, 4);
        const z = this.add.zone(p.x, p.y - 10, 190, 90).setInteractive({ useHandCursor: true }).setDepth(60);
        z.on('pointerover', () => { this.hoverPad = i; this.explainPad(i); });
        z.on('pointerout', () => { if (this.hoverPad === i) this.hoverPad = null; });
        z.on('pointerdown', () => this.onPad(i));
        return t;
      });

      this.crew = NS.CREW.map((n, i) => {
        const home = { x: 60 + i * 52, y: 690 - (i % 2) * 8 };
        const a = NS.makeAstronaut(this, n, home.x, home.y);
        a.home = home;
        return a;
      });

      this.guide = NS.createGuide(this, 240, 24, 610);
      this.buildHud();
      this.buildCards();
      this.buildPanel();
      (NS.run.layout || []).forEach((b) => this.place(b.type, b.pad, true));
      this.refresh();
      this.guide.say('Welcome to ' + this.site.name + '! We have ' + M.budget + ' supply crates. Pick a building card, then a glowing spot.', { expr: 'talk' });
      this.input.keyboard.on('keydown', (ev) => {
        if (ev.key === 'Escape') { this.sel = null; this.picked = null; this.refresh(); }
        if (ev.key === 'Delete' || ev.key === 'Backspace') this.removePicked();
      });
      window.__outpost = Object.assign(window.__outpost || {}, { build: this });
    }

    buildHud() {
      NS.glass(this, 872, 18, 384, 184, { r: 18 }).setDepth(3000);
      NS.text(this, 1240, 26, NS.stageLabel('Build'), 13, NS.C.dimHex).setOrigin(1, 0).setDepth(3001);
      NS.icon(this, 'crate', 906, 70, 34).setDepth(3001);
      this.budgetText = NS.title(this, 932, 52, '', 26, '#ffffff', false).setDepth(3001);
      NS.text(this, 934, 86, 'supply crates left', 14, NS.C.dimHex).setDepth(3001);
      this.budgetBar = this.add.graphics().setDepth(3001);
      NS.text(this, 892, 130, 'MUST BUILD', 13, '#7df9ff').setDepth(3001);
      this.reqTexts = this.M.required.map((t, i) => NS.text(this, 892 + (i % 2) * 180, 150 + Math.floor(i / 2) * 24, '', 16, '#ffffff').setDepth(3001));
    }

    buildCards() {
      this.cards = this.M.buildings.map((id, i) => {
        const B = NS.CONTENT.BUILDINGS[id];
        const x = CARD_X, y = CARD_Y0 + i * (CARD_H + CARD_GAP);
        const g = this.add.graphics().setDepth(3000);
        const img = this.add.image(x + 36, y + CARD_H / 2 + 2, 'building.' + id + '.ready').setDepth(3001);
        img.setScale(Math.min(64 / img.width, 52 / img.height) * 1.25);
        const name = NS.title(this, x + 74, y + 7, B.short, 19, '#ffffff', false).setDepth(3001);
        const crate = NS.icon(this, 'crate', x + 84, y + 44, 16).setDepth(3001);
        const cost = NS.text(this, x + 96, y + 34, String(B.cost), 16, '#ffd23f').setDepth(3001);
        const count = NS.text(this, x + CARD_W - 12, y + 35, '', 14, NS.C.dimHex).setOrigin(1, 0).setDepth(3001);
        const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true }).setDepth(3002);
        zone.on('pointerdown', () => { NS.sfx('click'); this.selectCard(id); });
        return { id, x, y, g, img, name, cost, crate, count };
      });
    }

    drawCards() {
      const E = NS.ENGINE;
      this.cards.forEach((c) => {
        const B = NS.CONTENT.BUILDINGS[c.id];
        const n = this.layout.filter((b) => b.type === c.id).length;
        const affordable = E.layoutCost(this.layout) + B.cost <= this.M.budget && n < B.max && (!B.needsIce || this.site.ice);
        const sel = this.sel === c.id;
        const g = c.g; g.clear();
        g.fillStyle(0x0b0626, 0.4).fillRoundedRect(c.x + 3, c.y + 5, CARD_W, CARD_H, 14);
        g.fillStyle(sel ? 0x2e6e8a : NS.C.glass, 0.92).fillRoundedRect(c.x, c.y, CARD_W, CARD_H, 14);
        g.lineStyle(sel ? 4 : 2, sel ? 0xffd23f : NS.C.edge, sel ? 1 : 0.55).strokeRoundedRect(c.x, c.y, CARD_W, CARD_H, 14);
        if (this.M.required.includes(c.id) && n === 0) g.fillStyle(NS.C.orange, 1).fillCircle(c.x + CARD_W - 12, c.y + 12, 6);
        c.count.setText(n + '/' + B.max + (B.needsIce && !this.site.ice ? ' · no ice' : ''));
        [c.img, c.name, c.cost, c.crate, c.count].forEach((o) => o.setAlpha(affordable || sel || n ? 1 : 0.45));
      });
    }

    buildPanel() {
      NS.glass(this, 240, 612, 1016, 96).setDepth(3000);
      this.pTitle = NS.text(this, 264, 622, '', 15, '#7df9ff').setDepth(3001);
      this.pBody = NS.text(this, 264, 644, '', 18, '#ffffff', '700').setDepth(3001).setWordWrapWidth(560).setLineSpacing(2);
      this.btnRemove = NS.button(this, 910, 660, 170, 58, 'Remove', () => this.removePicked(), { color: NS.C.orange }).setDepth(3001);
      this.btnStart = NS.button(this, 1120, 660, 236, 64, 'Start mission', () => this.start(), { color: NS.C.green, icon: 'flag', sound: 'unlock' }).setDepth(3001);
    }

    selectCard(id) {
      const B = NS.CONTENT.BUILDINGS[id];
      this.picked = null;
      this.sel = this.sel === id ? null : id;
      if (this.sel) {
        const n = this.layout.filter((b) => b.type === id).length;
        let msg = B.about, expr = 'talk';
        if (B.needsIce && !this.site.ice) { msg = 'There is no ice at ' + this.site.name + ', so the Ice Digger can’t work here.'; expr = 'worried'; }
        else if (n >= B.max) msg = 'You already built ' + B.max + '. ' + B.about;
        else if (NS.ENGINE.layoutCost(this.layout) + B.cost > this.M.budget) { msg = 'Not enough crates! Remove something to free up supplies.'; expr = 'worried'; }
        else msg += ' Pick a glowing spot.';
        this.guide.say(B.name + '. ' + msg, { expr });
      }
      this.refresh();
    }

    explainPad(i) {
      if (!this.sel) return;
      const r = NS.ENGINE.canPlace(this.M.id, NS.run.siteId, this.layout, this.sel, i);
      const B = NS.CONTENT.BUILDINGS[this.sel];
      let bonus = '';
      if (r.ok && B.bonusTag && this.tags[i].includes(B.bonusTag)) bonus = this.sel === 'solar' ? ' Sunny spot: +1 power!' : ' Shaded spot: +1 shield!';
      this.pTitle.setText(B.name.toUpperCase() + ' · SPOT ' + (i + 1) + ' (' + this.tags[i].join(', ') + ')');
      this.pBody.setText(r.ok ? 'Good spot.' + bonus : 'Can’t build here: ' + r.reason + '.');
    }

    onPad(i) {
      const at = this.layout.findIndex((b) => b.pad === i);
      if (!this.sel) { this.picked = at >= 0 ? at : null; this.refresh(); return; }
      const r = NS.ENGINE.canPlace(this.M.id, NS.run.siteId, this.layout, this.sel, i);
      if (!r.ok) {
        NS.sfx('error');
        this.guide.say('Hmm, we can’t build there: ' + r.reason + '.', { expr: 'worried' });
        this.cameras.main.shake(120, 0.004);
        return;
      }
      this.place(this.sel, i);
      const B = NS.CONTENT.BUILDINGS[this.sel];
      const n = this.layout.filter((b) => b.type === this.sel).length;
      if (n >= B.max || NS.ENGINE.layoutCost(this.layout) + B.cost > this.M.budget) this.sel = null;
      this.refresh();
    }

    place(type, pad, instant) {
      const p = NS.PADS[pad];
      const img = NS.put(this, 'building.' + type + '.ready', p.x, p.y + 10).setDepth(p.y);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => { if (!this.sel) { this.picked = this.layout.findIndex((b) => b.pad === pad); this.refresh(); } });
      this.layout.push({ type, pad });
      this.sprites.push(img);
      if (!instant) {
        const s = img.scaleX;
        img.setScale(s * 0.2).setAlpha(0.3);
        this.tweens.add({ targets: img, scaleX: s, scaleY: s, alpha: 1, duration: 420, ease: 'Back.easeOut' });
        NS.dust(this, p.x, p.y + 10, this.M.body === 'mars' ? 0xf0b08a : 0xe0dafa);
        NS.sfx('build');
        const worker = this.crew[this.layout.length % 3];
        worker.walkTo(p.x - 70, p.y + 30, () => this.time.delayedCall(600, () => worker.walkTo(worker.home.x, worker.home.y)));
        NS.toast(this, NS.CONTENT.BUILDINGS[type].short + ' built!', NS.C.green);
      }
    }

    removePicked() {
      if (this.picked == null) return;
      const b = this.layout[this.picked];
      this.sprites[this.picked].destroy();
      this.layout.splice(this.picked, 1);
      this.sprites.splice(this.picked, 1);
      NS.sfx('off');
      this.guide.say(NS.CONTENT.BUILDINGS[b.type].short + ' removed. Crates returned!', { expr: 'happy' });
      this.picked = null;
      this.refresh();
    }

    start() {
      if (!NS.ENGINE.validateLayout(this.M.id, NS.run.siteId, this.layout).ok) return;
      NS.run.layout = this.layout.map((b) => ({ type: b.type, pad: b.pad }));
      NS.run.history = [];
      NS.go(this, 'Mission');
    }

    refresh() {
      const E = NS.ENGINE, CT = NS.CONTENT;
      const cost = E.layoutCost(this.layout);
      this.budgetText.setText((this.M.budget - cost) + ' / ' + this.M.budget);
      const g = this.budgetBar; g.clear();
      g.fillStyle(0x3a2f7a, 1).fillRoundedRect(892, 108, 344, 10, 5);
      g.fillStyle(0xe5a96a, 1).fillRoundedRect(892, 108, 344 * (this.M.budget - cost) / this.M.budget, 10, 5);
      this.M.required.forEach((t, i) => {
        const ok = this.layout.some((b) => b.type === t);
        this.reqTexts[i].setText((ok ? '✓ ' : '○ ') + CT.BUILDINGS[t].short).setColor(ok ? '#9dff8a' : '#ffb38a');
      });
      this.drawCards();
      this.sprites.forEach((s, i) => s.setTint(i === this.picked ? 0xffe9a8 : 0xffffff));
      const v = E.validateLayout(this.M.id, NS.run.siteId, this.layout);
      this.btnStart.setEnabled(v.ok);
      if (v.ok && !this._pulsing) { this._pulsing = this.btnStart.pulse(); }
      this.btnRemove.setVisible(this.picked != null);
      this.padLabels.forEach((t) => t.setVisible(!!this.sel));
      if (this.picked != null) {
        const B = CT.BUILDINGS[this.layout[this.picked].type];
        this.pTitle.setText(B.name.toUpperCase());
        this.pBody.setText(B.about + ' Remove it to get ' + B.cost + ' crates back.');
      } else if (this.sel) {
        const B = CT.BUILDINGS[this.sel];
        this.pTitle.setText('PLACING: ' + B.name.toUpperCase() + ' (' + B.cost + ' crates)');
        this.pBody.setText('Fits on: ' + B.allowedTags.join(' or ') + ' spots.' + (B.bonusTag ? ' Bonus on ' + B.bonusTag + ' spots!' : '') + ' Esc to cancel.');
      } else if (!v.ok) {
        this.pTitle.setText('BUILD THE OUTPOST');
        this.pBody.setText('Pick a building card on the left. Still needed: ' + v.missing.map((t) => CT.BUILDINGS[t].short).join(', ') + '.');
      } else {
        this.pTitle.setText('READY FOR THE MISSION');
        this.pBody.setText('All needed buildings are placed. Spend leftover crates on extras, or start the mission!');
      }
      this.updateFocus();
    }

    updateFocus() {
      const items = [this.btnStart.focusItem('start')];
      if (this.btnRemove.visible) items.push(this.btnRemove.focusItem('remove'));
      this.cards.forEach((c) => items.push({ id: 'card' + c.id, bounds: () => ({ x: c.x, y: c.y, w: CARD_W, h: CARD_H }), activate: () => this.selectCard(c.id) }));
      NS.PADS.forEach((p, i) => {
        if (this.sel || this.layout.some((b) => b.pad === i)) {
          items.push({ id: 'pad' + i, bounds: () => ({ x: p.x - 86, y: p.y - 40, w: 172, h: 80 }), activate: () => { this.explainPad(i); this.onPad(i); } });
        }
      });
      this.focus.set(items);
    }

    update(time) {
      const g = this.ringG; g.clear();
      const ph = time * 0.0005;
      NS.PADS.forEach((p, i) => {
        if (this.layout.some((b) => b.pad === i)) return;
        const tags = this.tags[i];
        if (tags.includes('sunny')) g.fillStyle(NS.C.yellow, 0.18).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
        if (tags.includes('shaded')) g.fillStyle(NS.C.ink, 0.25).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
        if (this.sel) {
          const ok = NS.ENGINE.canPlace(this.M.id, NS.run.siteId, this.layout, this.sel, i).ok;
          const hov = this.hoverPad === i;
          g.lineStyle(hov ? 6 : 4, ok ? NS.C.green : NS.C.orange, ok ? 1 : 0.55);
          NS.dashedEllipse(g, p.x, p.y, NS.PAD_RX, NS.PAD_RY, ok ? ph * 2 : 0, 30, 0.6);
          if (ok) g.fillStyle(NS.C.green, hov ? 0.32 : 0.15).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
        } else {
          g.lineStyle(3, 0xffffff, 0.6);
          NS.dashedEllipse(g, p.x, p.y, NS.PAD_RX, NS.PAD_RY, 0, 30, 0.55);
        }
      });
    }
  }
  NS.BuildScene = BuildScene;
})();
