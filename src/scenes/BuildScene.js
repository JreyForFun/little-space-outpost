/* STAGE 2 - BUILD: place and activate the five structures.
 *
 * Per building:  choose card -> Select location -> click a valid pad
 *                -> Place / Activate -> build progress -> ready / active
 * Greenhouse stays locked ("Need resources") until power AND supplies exist.
 */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const T = (ms) => (NS.FAST ? ms * 0.15 : ms);
  const CARD_X = 95, CARD_Y0 = 175, CARD_DY = 97;
  const BTN_MAIN = { x: 860, y: 660 }, BTN_SIDE = { x: 1150, y: 660 };

  class BuildScene extends Phaser.Scene {
    constructor() { super('Build'); }

    create() {
      const C = NS.C;
      const S = NS.state;
      if (!S.site) S.site = NS.AREAS[0];
      this.cameras.main.fadeIn(400);
      NS.put(this, 'bg.site', 0, 0).setDepth(-100);

      this.mode = 'idle'; // idle | selected | select | located | building | won
      this.sel = null; // building id being worked on
      this.ghost = null; // sprite shown while choosing / building
      this.pad = null; // pad chosen for the current building
      this.hoverPad = null;
      this.sites = {}; // id -> { pad, img }
      this.pads = NS.PADS.map((p, i) => Object.assign({ i, occupant: null }, p));

      this.ringG = this.add.graphics().setDepth(-50);
      this.hoverMarker = NS.put(this, 'marker.valid', 0, 0).setVisible(false).setDepth(2000);

      // pads: hit zones + little tag labels shown while choosing a location
      this.pads.forEach((p) => {
        p.label = NS.text(this, p.x, p.y + 40, p.tags.join(' · '), 13, NS.C.slateHex)
          .setOrigin(0.5).setDepth(20).setVisible(false)
          .setBackgroundColor(NS.C.creamHex).setPadding(8, 2, 8, 2);
        const z = this.add.zone(p.x, p.y - 10, 190, 80).setInteractive({ useHandCursor: true }).setDepth(60);
        z.on('pointerover', () => this.onPadOver(p));
        z.on('pointerout', () => this.onPadOut(p));
        z.on('pointerdown', () => this.onPadClick(p));
      });

      // crew (three astronauts) waits at the landing corner of the site
      this.crew = NS.CREW.map((n, i) => {
        const home = { x: 250 + i * 62, y: 592 + (i % 2) * 8 };
        const a = NS.makeAstronaut(this, n, home.x, home.y);
        a.home = home;
        return a;
      });

      this.guide = NS.createGuide(this, 24, 28, 640);
      this.buildHud();
      this.buildCards();
      this.buildPanel();
      this.setMode('idle');
      this.guide.say(NS.STORY.buildWelcome.replace('{site}', S.site.name));
      window.__outpost = Object.assign(window.__outpost || {}, { build: this });
    }

    // ------------------------------------------------------------------ HUD
    buildHud() {
      const S = NS.state;
      this.hudText = NS.text(this, 1256, 24, '', 15, NS.C.creamHex).setOrigin(1, 0).setDepth(3001);
      this.dotsG = this.add.graphics().setDepth(3001);
      this.hud = {};
      NS.RESOURCES.forEach((r, i) => {
        const img = NS.put(this, r.chip, 1256 - 92, 112 + i * 40).setDepth(3001);
        img.setScale(184 / img.width);
        this.hud[r.key] = img;
        if (S.res[r.key]) NS.litChip(this, img); else NS.dimChip(img);
      });
      this.refreshHud();
    }
    refreshHud() {
      const S = NS.state;
      const n = NS.BUILD_ORDER.filter((id) => S.built[id]).length;
      this.hudText.setText('Stage 2 of 5 · Build   ' + n + ' / 5');
      const g = this.dotsG; g.clear();
      NS.BUILD_ORDER.forEach((id, i) => {
        const x = 1256 - 12 - (4 - i) * 30, y = 62;
        g.fillStyle(S.built[id] ? NS.C.green : 0xdcdfe8, 1).fillCircle(x, y, 10);
        g.lineStyle(3, NS.C.navy, 1).strokeCircle(x, y, 10);
      });
    }

    // ---------------------------------------------------------------- cards
    buildCards() {
      this.cardG = this.add.graphics().setDepth(3002);
      this.cards = {};
      NS.BUILD_ORDER.forEach((id, i) => {
        const x = CARD_X, y = CARD_Y0 + i * CARD_DY;
        const img = NS.put(this, 'card.' + id, x, y).setDepth(3001);
        const base = img.scaleX;
        img.setInteractive({ useHandCursor: true });
        img.on('pointerover', () => img.setScale(base * 1.04));
        img.on('pointerout', () => img.setScale(base));
        img.on('pointerdown', () => this.selectBuilding(id));
        this.cards[id] = { img, x, y };
      });
      this.refreshCards();
    }
    refreshCards() {
      const g = this.cardG; g.clear();
      NS.BUILD_ORDER.forEach((id) => {
        const c = this.cards[id];
        const w = c.img.displayWidth, h = c.img.displayHeight;
        c.img.setAlpha(this.mode === 'building' && this.sel !== id ? 0.55 : 1);
        if (this.sel === id && this.mode !== 'idle' && this.mode !== 'won') {
          g.lineStyle(6, NS.C.teal, 1).strokeRoundedRect(c.x - w / 2 - 5, c.y - h / 2 - 5, w + 10, h + 10, 18);
        }
        if (NS.state.built[id]) {
          const bx = c.x + w / 2 - 6, by = c.y - h / 2 + 8;
          g.fillStyle(NS.C.green, 1).fillCircle(bx, by, 13);
          g.lineStyle(3, NS.C.navy, 1).strokeCircle(bx, by, 13);
          g.lineStyle(4, NS.C.navy, 1).beginPath().moveTo(bx - 5, by).lineTo(bx - 1, by + 4).lineTo(bx + 6, by - 4).strokePath();
        }
      });
    }

    // ---------------------------------------------------------------- panel
    buildPanel() {
      NS.panel(this, 190, 612, 1066, 96).setDepth(3000);
      this.pTitle = NS.text(this, 214, 622, '', 15, NS.C.slateHex).setDepth(3001);
      this.pBody = NS.text(this, 214, 644, '', 19, NS.C.navyHex, '700').setDepth(3001).setWordWrapWidth(470);
      this.btnMain = NS.imgButton(this, 'btn.selectLocation', BTN_MAIN.x, BTN_MAIN.y, () => this.onMain()).setDepth(3001);
      this.btnSide = NS.imgButton(this, 'btn.cancel', BTN_SIDE.x, BTN_SIDE.y, () => this.onSide()).setDepth(3001);
      this.reqChips = [];
    }
    clearReqChips() { this.reqChips.forEach((c) => c.destroy()); this.reqChips = []; }
    resOk(id) {
      const B = NS.BUILDINGS[id];
      return (B.requires || []).every((r) => NS.state.res[r]);
    }

    setMode(mode) {
      this.mode = mode;
      const B = this.sel && NS.BUILDINGS[this.sel];
      const main = this.btnMain, side = this.btnSide;
      const vis = (b, on) => { b.setVisible(on); if (on) b.setInteractive({ useHandCursor: true }); else b.disableInteractive(); };
      this.clearReqChips();

      if (mode === 'idle' || mode === 'won') {
        this.pTitle.setText('BUILD YOUR MOON CAMP');
        this.pBody.setText(NS.state.built.crew ? 'Pick the next part of Moon Camp.' : 'Choose a building to get Moon Camp started.');
        vis(main, false); vis(side, false);
      } else if (mode === 'selected') {
        this.pTitle.setText(B.name.toUpperCase());
        this.pBody.setText(B.intro.length > 80 ? B.intro : B.intro);
        main.setKey('btn.selectLocation').setEnabled(true); vis(main, true);
        side.setKey('btn.cancel'); vis(side, true);
      } else if (mode === 'select') {
        this.pTitle.setText('01  SELECT LOCATION · ' + B.name.toUpperCase());
        this.pBody.setText(B.select + '. Tap or click a green pad to choose a spot.');
        vis(main, false);
        side.setKey('btn.cancel'); vis(side, true);
      } else if (mode === 'located') {
        this.pTitle.setText('LOCATION SET · ' + B.name.toUpperCase());
        const ok = this.resOk(this.sel);
        this.pBody.setText(ok ? 'Ready when you are.' : 'This spot is reserved. The greenhouse needs power and supplies first.');
        main.setKey(ok ? B.action : 'btn.needResources').setEnabled(ok); vis(main, true);
        side.setKey('btn.cancel'); vis(side, true);
      } else if (mode === 'building') {
        this.pTitle.setText('02  BUILD IN PROGRESS');
        this.pBody.setText(B.working + '…');
        vis(main, false); vis(side, false);
      }

      // greenhouse: show what it still needs
      if (B && this.sel === 'greenhouse' && (mode === 'selected' || mode === 'select' || mode === 'located')) {
        (B.requires || []).forEach((r, i) => {
          const have = NS.state.res[r];
          const chip = NS.put(this, have ? NS.HAVE_CHIP[r] : NS.NEEDS_CHIP[r], 214 + 75 + i * 160, 694).setDepth(3001);
          chip.setScale(150 / chip.width);
          this.reqChips.push(chip);
        });
        this.pBody.setWordWrapWidth(470);
      }
      this.refreshCards();
    }

    // ------------------------------------------------------------ choosing
    selectBuilding(id) {
      if (this.mode === 'building' || this.mode === 'won') return;
      if (NS.state.built[id]) { NS.toast(this, NS.BUILDINGS[id].name + ' is already built', NS.C.cream); return; }
      this.dropGhost();
      this.sel = id; this.pad = null;
      const B = NS.BUILDINGS[id];
      this.guide.say(B.intro);
      this.setMode('selected');
    }

    dropGhost() {
      if (this.ghost) { this.ghost.destroy(); this.ghost = null; }
      this.hoverMarker.setVisible(false);
    }

    onMain() {
      if (this.mode === 'selected') {
        this.guide.say(NS.BUILDINGS[this.sel].select + '! Tap or click a green pad.');
        this.setMode('select');
      } else if (this.mode === 'located') {
        if (this.resOk(this.sel)) this.startConstruction();
      }
    }
    onSide() {
      if (this.mode === 'selected') { this.sel = null; this.setMode('idle'); this.guide.say('Pick any building from the list.'); }
      else if (this.mode === 'select') { this.setMode('selected'); }
      else if (this.mode === 'located') {
        this.dropGhost(); this.pad = null;
        this.guide.say(NS.BUILDINGS[this.sel].select + '! Tap or click a green pad.');
        this.setMode('select');
      }
    }

    padValid(p) { return !p.occupant && p.tags.indexOf(NS.BUILDINGS[this.sel].needs) >= 0; }
    padWhy(p) {
      if (p.occupant) return 'something is already built there';
      return NS.TAG_WHY[NS.BUILDINGS[this.sel].needs];
    }

    onPadOver(p) {
      if (this.mode !== 'select') return;
      this.hoverPad = p;
      const ok = this.padValid(p);
      NS.retexture(this.hoverMarker, ok ? 'marker.valid' : 'marker.invalid');
      this.hoverMarker.setPosition(p.x, p.y).setVisible(true);
    }
    onPadOut(p) {
      if (this.hoverPad === p) { this.hoverPad = null; this.hoverMarker.setVisible(false); }
    }

    onPadClick(p) {
      if (this.mode !== 'select') return;
      const id = this.sel, B = NS.BUILDINGS[id];
      if (!this.padValid(p)) {
        NS.retexture(this.hoverMarker, 'marker.invalid');
        this.hoverMarker.setPosition(p.x, p.y).setVisible(true);
        this.tweens.add({ targets: this.hoverMarker, x: p.x + 7, yoyo: true, repeat: 3, duration: 55, onComplete: () => this.hoverMarker.setX(p.x) });
        this.guide.say("We can't place the " + B.name + ' here: ' + this.padWhy(p) + '. Try a green pad.');
        return;
      }
      this.pad = p;
      this.hoverMarker.setVisible(false);
      this.ghost = NS.put(this, 'building.' + id + '.ghost', p.x, p.y).setDepth(p.y).setAlpha(0);
      this.tweens.add({ targets: this.ghost, alpha: 1, duration: 260 });
      this.setMode('located');
      const need = !this.resOk(id);
      this.guide.say(need
        ? "Nice spot! We'll reserve it, but we need power and supplies before the greenhouse can start."
        : 'Good spot! Press the button when you are ready.');
    }

    // --------------------------------------------------------- construction
    startConstruction() {
      const id = this.sel, B = NS.BUILDINGS[id], p = this.pad;
      p.occupant = id;
      this.sites[id] = { pad: p, img: this.ghost };
      this.setMode('building');
      this.guide.say(B.working + '…');
      NS.retexture(this.ghost, 'building.' + id + '.build');

      // progress bar floating above the site
      const bx = p.x, by = p.y - 168;
      const barG = this.add.graphics().setDepth(2500);
      const label = NS.text(this, bx, by - 20, '', 15).setOrigin(0.5).setDepth(2501)
        .setBackgroundColor(NS.C.creamHex).setPadding(10, 3, 10, 3);
      const draw = (v) => {
        barG.clear();
        barG.fillStyle(NS.C.navy, 1).fillRoundedRect(bx - 80, by - 6, 160, 20, 10);
        barG.fillStyle(0xdcdfe8, 1).fillRoundedRect(bx - 78, by - 4, 156, 16, 8);
        if (v > 0.02) barG.fillStyle(0x8fe27a, 1).fillRoundedRect(bx - 78, by - 4, Math.max(14, 156 * v), 16, 8);
        label.setText(v >= 1 ? 'Build complete' : 'Building · ' + Math.round(v * 100) + '%');
      };
      draw(0);

      // the nearest astronaut walks over to work on it
      const worker = this.crew.slice().sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, p.x, p.y) - Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y))[0];
      this.worker = worker;
      worker.walkTo(p.x + 70, Math.min(p.y + 34, 596));

      const prog = { v: 0 };
      this.tweens.add({
        targets: prog, v: 1, duration: T(B.seconds * 1000), ease: 'Linear',
        onUpdate: () => draw(prog.v),
        onComplete: () => {
          draw(1);
          this.time.delayedCall(T(600), () => this.tweens.add({ targets: [barG, label], alpha: 0, duration: 300, onComplete: () => { barG.destroy(); label.destroy(); } }));
          this.finish(id);
        },
      });
    }

    finish(id) {
      const S = NS.state, B = NS.BUILDINGS[id], site = this.sites[id];
      S.built[id] = true;
      S.res[B.grants] = true;
      NS.retexture(site.img, 'building.' + id + '.ready');
      const s0 = site.img.scaleX;
      this.tweens.add({ targets: site.img, scaleX: s0 * 1.08, scaleY: s0 * 1.08, yoyo: true, duration: 180, ease: 'Sine.easeOut' });
      NS.litChip(this, this.hud[B.grants], true);
      this.refreshHud();
      NS.toast(this, B.ready, NS.C.green);
      this.guide.say(B.ready + '!');
      this.dropRef = null;
      this.ghost = null; this.pad = null;
      this.sel = null;
      this.setMode('idle');
      if (this.worker) { const w = this.worker; this.time.delayedCall(T(900), () => w.walkTo(w.home.x, w.home.y)); }

      // after a moment the building settles into its finished (idle) artwork
      this.time.delayedCall(T(2600), () => this.settle(id));
      if (NS.BUILD_ORDER.every((k) => S.built[k])) this.time.delayedCall(T(3400), () => this.win());
      else this.hintNext();
    }

    settle(id) {
      const site = this.sites[id];
      if (!site || !site.img || !site.img.scene) return;
      const old = site.img;
      const idle = NS.put(this, 'building.' + id + '.idle', old.x, old.y).setDepth(old.depth).setAlpha(0);
      this.tweens.add({ targets: idle, alpha: 1, duration: 500 });
      this.tweens.add({ targets: old, alpha: 0, duration: 500, onComplete: () => old.destroy() });
      site.img = idle;
    }

    hintNext() {
      const S = NS.state;
      const next = NS.BUILD_ORDER.find((k) => !S.built[k]);
      if (!next) return;
      this.time.delayedCall(T(1500), () => {
        if (this.mode === 'idle') this.guide.say(next === 'greenhouse'
          ? 'The Moon garden is next! It needs power and crew supplies.'
          : 'Next up: ' + NS.BUILDINGS[next].name + '. Every part helps Moon Camp!');
      });
    }

    // ----------------------------------------------------------------- win
    win() {
      if (this.mode === 'won') return;
      this.mode = 'won';
      const D = 6000, cx = NS.W / 2;
      const veil = this.add.rectangle(0, 0, NS.W, NS.H, 0x141a3d, 0.62).setOrigin(0).setDepth(D).setInteractive();
      const pw = 800, ph = 420, px = cx - pw / 2, py = 150;
      const pg = NS.panel(this, px, py, pw, ph, { r: 30 }).setDepth(D + 1);
      NS.text(this, cx, py + 40, 'MOON CAMP IS READY!', 15, NS.C.slateHex).setOrigin(0.5).setDepth(D + 2);
      NS.text(this, cx, py + 82, 'The crew is ready!', 44).setOrigin(0.5).setDepth(D + 2);
      NS.text(this, cx, py + 128, 'Air, power, shelter, and the Moon garden are ready for a five-day adventure!', 19, NS.C.slateHex, '700')
        .setOrigin(0.5).setDepth(D + 2);
      NS.BUILD_ORDER.forEach((id, i) => {
        const b = NS.put(this, 'building.' + id + '.idle', px + 100 + i * 150, py + 300).setDepth(D + 2);
        b.setScale(0.3);
        this.tweens.add({ targets: b, y: b.y - 8, yoyo: true, repeat: -1, duration: 1300 + i * 130, ease: 'Sine.easeInOut' });
      });
      const buttonWidth = Math.min(230, (pw - 80) / 3);
      const buttonGap = 30;
      const buttonStep = buttonWidth + buttonGap;
      const buttonY = py + ph - 62;
      const buttonHeight = Math.min(64, ph * 0.17);
      const again = NS.textButton(this, cx - buttonStep, buttonY, buttonWidth, buttonHeight, 'Build again', () => this.restartBuild());
      const mission = NS.textButton(this, cx, buttonY, buttonWidth, buttonHeight, 'Start mission', () => this.scene.start('Mission'), NS.C.green);
      const back = NS.textButton(this, cx + buttonStep, buttonY, buttonWidth, buttonHeight, 'Explore again', () => this.scene.start('Explore'), NS.C.orange);
      [again, mission, back].forEach((b) => b.setDepth(D + 2));
      NS.text(this, cx, py + 405, 'Next: help the crew protect their first Moon garden experiment!', 13, NS.C.slateHex).setOrigin(0.5).setDepth(D + 2);
      this.guide.say(NS.STORY.buildComplete);
      this.wander();
    }

    restartBuild() {
      const site = NS.state.site;
      NS.state = NS.freshState();
      NS.state.site = site;
      this.scene.restart();
    }

    wander() {
      this.time.addEvent({
        delay: 1800, loop: true,
        callback: () => {
          const c = Phaser.Utils.Array.GetRandom(this.crew);
          if (c._tw) return;
          c.walkTo(Phaser.Math.Between(260, 1100), Phaser.Math.Between(570, 596));
        },
      });
    }

    // --------------------------------------------------------------- update
    update(time) {
      const g = this.ringG; g.clear();
      const ph = time * 0.0004;
      const B = this.sel && NS.BUILDINGS[this.sel];
      this.pads.forEach((p) => {
        // soft ground tint so sunny / shaded spots read at a glance
        if (p.tags.indexOf('sunny') >= 0) g.fillStyle(NS.C.yellow, 0.16).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
        if (p.tags.indexOf('shaded') >= 0) g.fillStyle(NS.C.navy, 0.2).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
        const choosing = this.mode === 'select';
        if (p.label) p.label.setVisible(choosing && !p.occupant);
        if (p.occupant) return;
        if (p === this.pad && this.mode !== 'idle') return; // ghost carries its own ring
        if (choosing) {
          const ok = this.padValid(p);
          g.lineStyle(ok ? 4 : 3, ok ? 0x5fcf5f : 0xffffff, ok ? 1 : 0.35);
          if (ok) g.fillStyle(0x8fe27a, 0.2).fillEllipse(p.x, p.y, NS.PAD_RX * 2, NS.PAD_RY * 2);
          NS.dashedEllipse(g, p.x, p.y, NS.PAD_RX, NS.PAD_RY, ok ? ph : 0, 30, 0.6);
        } else {
          g.lineStyle(2, 0xffffff, 0.35);
          NS.dashedEllipse(g, p.x, p.y, NS.PAD_RX, NS.PAD_RY, 0, 30, 0.55);
        }
      });
    }
  }
  NS.BuildScene = BuildScene;
})();
