/* STAGE 1 - EXPLORE: inspect the Moon, find a place for the base. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const T = (ms) => (NS.FAST ? ms * 0.15 : ms);

  class ExploreScene extends Phaser.Scene {
    constructor() { super('Explore'); }

    create() {
      const C = NS.C;
      NS.state = NS.freshState(); // a new run starts here
      this.cameras.main.fadeIn(400);
      NS.put(this, 'bg.explore', 0, 0).setDepth(-100);

      this.mode = 'pick'; // pick -> scanning -> result -> done
      this.current = null; // area being inspected
      this.found = {}; // id -> 'ok' | 'blocked'
      this.hoverId = null;
      this.chosen = null;
      this.markers = {};

      // the crew waits at the landing zone
      this.crew = NS.CREW.map((n, i) => NS.makeAstronaut(this, n, 96 + i * 58, 574 + (i % 2) * 12));

      // ---- map areas
      this.ringG = this.add.graphics().setDepth(-50);
      this.scanG = this.add.graphics().setDepth(40);
      this.areaUI = {};
      NS.AREAS.forEach((a) => {
        const badge = this.add.graphics().setDepth(30);
        badge.fillStyle(C.navy, 0.3).fillCircle(a.x + 2, a.y - 36, 15);
        badge.fillStyle(C.cream, 1).fillCircle(a.x, a.y - 40, 15);
        badge.lineStyle(3, C.navy, 1).strokeCircle(a.x, a.y - 40, 15);
        const letter = NS.text(this, a.x, a.y - 40, a.id, 17).setOrigin(0.5).setDepth(31);
        const tag = NS.text(this, a.x, a.y + 44, a.name, 16)
          .setOrigin(0.5).setDepth(32).setVisible(false)
          .setBackgroundColor(NS.C.creamHex).setPadding(10, 4, 10, 4);
        const zone = this.add.zone(a.x, a.y - 8, 190, 108).setInteractive({ useHandCursor: true }).setDepth(60);
        zone.on('pointerover', () => { this.hoverId = a.id; });
        zone.on('pointerout', () => { if (this.hoverId === a.id) this.hoverId = null; });
        zone.on('pointerdown', () => this.inspect(a));
        this.areaUI[a.id] = { badge, letter, tag, zone };
      });

      // ---- ASTRO + tracker
      this.guide = NS.createGuide(this, 24, 28, 640);
      this.guide.say(NS.STORY.exploreIntro);
      this.time.delayedCall(T(3200), () => {
        if (this.mode === 'pick') this.guide.say('Tap or click a spot to scout it. Smooth ground makes a good home!');
      });
      this.buildTracker();

      // ---- report panel (bottom)
      NS.panel(this, 24, 616, 1232, 88).setDepth(3000);
      this.panelTitle = NS.text(this, 52, 628, '', 14, NS.C.slateHex).setDepth(3001);
      this.panelBody = NS.text(this, 52, 650, '', 21, NS.C.navyHex, '700').setDepth(3001).setWordWrapWidth(700);
      this.btnConfirm = NS.imgButton(this, 'btn.confirm', 905, 660, () => this.confirm()).setDepth(3001);
      this.btnCancel = NS.imgButton(this, 'btn.cancel', 1150, 660, () => this.cancel()).setDepth(3001);
      this.btnStart = NS.textButton(this, 1060, 660, 330, 58, 'Start building', () => this.startBuild());
      this.btnStart.setDepth(3001);
      this.setPanel('pick');
      window.__outpost = Object.assign(window.__outpost || {}, { explore: this });
    }

    // ------------------------------------------------------------- tracker
    buildTracker() {
      this.stepG = this.add.graphics().setDepth(3000);
      this.stepT = [];
      ['1  Inspect', '2  Choose', '3  Ready'].forEach((s, i) => {
        this.stepT.push(NS.text(this, 872 + i * 132 + 60, 43, s, 15).setOrigin(0.5).setDepth(3001));
      });
      NS.text(this, 1256, 74, 'Stage 1 of 5 · Explore', 14, NS.C.creamHex).setOrigin(1, 0).setDepth(3001);
      this.setStep(0);
    }
    setStep(n) {
      const g = this.stepG; g.clear();
      for (let i = 0; i < 3; i++) {
        const x = 872 + i * 132, y = 26, w = 120, h = 34;
        const col = i < n ? NS.C.green : i === n ? NS.C.teal : 0xdcdfe8;
        g.fillStyle(NS.C.navy, 1).fillRoundedRect(x, y + 4, w, h, 17);
        g.fillStyle(col, 1).fillRoundedRect(x, y, w, h, 17);
        g.lineStyle(3, NS.C.navy, 1).strokeRoundedRect(x, y, w, h, 17);
      }
    }

    // --------------------------------------------------------------- panel
    setPanel(mode, a) {
      this.btnConfirm.setVisible(false).disableInteractive();
      this.btnCancel.setVisible(false).disableInteractive();
      this.btnStart.setVisible(false).disableInteractive();
      const show = (b) => b.setVisible(true).setInteractive({ useHandCursor: true });
      if (mode === 'pick') {
        this.panelTitle.setText('SITE REPORT');
        this.panelBody.setText('Tap or click a spot on the Moon map to scout it.');
      } else if (mode === 'scanning') {
        this.panelTitle.setText('SITE ' + a.id + ' · ' + a.name.toUpperCase());
        this.panelBody.setText('Scanning the ground…');
      } else if (mode === 'ok') {
        this.panelTitle.setText('SITE ' + a.id + ' · ' + a.name.toUpperCase() + '   ·   AVAILABLE');
        this.panelBody.setText(a.report);
        show(this.btnConfirm); show(this.btnCancel);
      } else if (mode === 'blocked') {
        this.panelTitle.setText('SITE ' + a.id + ' · ' + a.name.toUpperCase() + '   ·   CANNOT BUILD HERE');
        this.panelBody.setText(a.report + ' Try another spot.');
        show(this.btnCancel);
      } else if (mode === 'done') {
        this.panelTitle.setText('EXPLORATION OBJECTIVE COMPLETED');
        this.panelBody.setText(a.name + ' is marked on the map. Time to build the outpost!');
        show(this.btnStart);
      }
    }

    // ---------------------------------------------------------- interaction
    inspect(a) {
      if (this.mode === 'scanning' || this.mode === 'done') return;
      this.current = a;
      this.guide.say('Inspecting ' + a.name + '…');
      const known = this.found[a.id];
      if (known) { this.mode = 'result'; this.showResult(a, false); return; }
      this.mode = 'scanning';
      this.setPanel('scanning', a);
      const p = { t: 0 };
      this.tweens.add({
        targets: p, t: 1, duration: T(1150), ease: 'Sine.easeInOut',
        onUpdate: () => {
          const g = this.scanG; g.clear();
          [0, 0.33, 0.66].forEach((o) => {
            const k = (p.t + o) % 1;
            g.lineStyle(4, NS.C.teal, 1 - k).strokeEllipse(a.x, a.y, 40 + k * 190, 14 + k * 70);
          });
        },
        onComplete: () => { this.scanG.clear(); this.mode = 'result'; this.showResult(a, true); },
      });
    }

    showResult(a, fresh) {
      this.found[a.id] = a.ok ? 'ok' : 'blocked';
      if (!this.markers[a.id]) {
        const m = NS.put(this, a.ok ? 'marker.valid' : 'marker.invalid', a.x, a.y).setDepth(25);
        const s = m.scaleX; m.setScale(0);
        this.tweens.add({ targets: m, scaleX: s, scaleY: s, duration: 300, ease: 'Back.easeOut' });
        this.markers[a.id] = m;
      }
      if (a.ok) this.guide.say('Nice scouting! ' + a.name + ' could be a great home for Moon Camp.');
      else this.guide.say('Uh-oh, ' + a.name + ' is too tricky. Let’s scout another spot!');
      this.setStep(1); // inspecting is done, now choosing
      this.setPanel(a.ok ? 'ok' : 'blocked', a);
    }

    cancel() {
      if (this.mode !== 'result') return;
      this.current = null; this.mode = 'pick';
      this.guide.say('No problem, Commander. There are more places to explore!');
      this.setPanel('pick');
    }

    confirm() {
      if (this.mode !== 'result' || !this.current || !this.current.ok) return;
      const a = this.current;
      this.chosen = a; this.mode = 'done';
      NS.state.site = a;
      this.setStep(3);
      // mark the site with a flag + remove the little check marker
      if (this.markers[a.id]) this.markers[a.id].setVisible(false);
      const f = this.add.graphics().setDepth(a.y);
      f.lineStyle(5, NS.C.navy, 1).lineBetween(a.x, a.y + 4, a.x, a.y - 66);
      f.fillStyle(NS.C.orange, 1).fillTriangle(a.x, a.y - 66, a.x + 40, a.y - 52, a.x, a.y - 38);
      f.lineStyle(4, NS.C.navy, 1).strokeTriangle(a.x, a.y - 66, a.x + 40, a.y - 52, a.x, a.y - 38);
      f.fillStyle(NS.C.navy, 1).fillCircle(a.x, a.y - 68, 5);
      f.setScale(0.01); f.setPosition(a.x * 0.99, a.y * 0.99);
      this.tweens.add({ targets: f, scale: 1, x: 0, y: 0, duration: 380, ease: 'Back.easeOut' });
      NS.toast(this, 'Exploration objective completed', NS.C.green);
      this.guide.say('We found our Moon Camp site! The crew is on the way to start building.');
      this.setPanel('done', a);
      const spots = [[-58, 30], [0, 42], [58, 30]];
      this.crew.forEach((c, i) => this.time.delayedCall(i * 250, () => c.walkTo(a.x + spots[i][0], a.y + spots[i][1])));
    }

    startBuild() {
      if (this.mode !== 'done') return;
      this.mode = 'leaving';
      this.cameras.main.fadeOut(400, 20, 26, 61);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Build'));
    }

    // --------------------------------------------------------------- update
    update(time) {
      const g = this.ringG; g.clear();
      const ph = time * 0.0004;
      NS.AREAS.forEach((a) => {
        const ui = this.areaUI[a.id];
        const status = this.found[a.id];
        const isCur = this.current && this.current.id === a.id;
        const hover = this.hoverId === a.id && this.mode !== 'scanning' && this.mode !== 'done';
        const isChosen = this.chosen && this.chosen.id === a.id;
        ui.tag.setVisible(hover || isCur || isChosen);
        ui.badge.setVisible(!isChosen); ui.letter.setVisible(!isChosen);
        if (isChosen) {
          g.fillStyle(NS.C.green, 0.3).fillEllipse(a.x, a.y, 156, 56);
          g.lineStyle(5, NS.C.greenDark, 1).strokeEllipse(a.x, a.y, 156, 56);
        } else if (status) {
          const col = status === 'ok' ? NS.C.green : NS.C.orange;
          if (isCur) { g.fillStyle(col, 0.18).fillEllipse(a.x, a.y, 160, 58); }
        } else {
          if (hover || isCur) g.fillStyle(NS.C.teal, 0.25).fillEllipse(a.x, a.y, 160, 58);
          g.lineStyle(hover || isCur ? 5 : 3, hover || isCur ? NS.C.cream : 0xffffff, hover || isCur ? 1 : 0.8);
          NS.dashedEllipse(g, a.x, a.y, 78, 28, ph, 26, 0.6);
        }
      });
    }
  }
  NS.ExploreScene = ExploreScene;
})();
