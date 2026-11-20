/* STAGE 3 - MISSION: run the outpost one day at a time.
 * Three core meters (POWER, AIR, FOOD), team hearts, per-astronaut radiation dose, real solar storms
 * (LIVE / ARCHIVE / PRACTICE), Mars dust and radio delay. The pure engine (src/sim/engine.js) does
 * the maths; this scene shows it and makes it feel alive. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const JOB_SPOT = { tune: 'solar', shelter: 'shelter', garden: 'greenhouse', science: 'field', rest: 'crew' };
  const GLOW = { crew: 0xffd27a, oxygen: 0x7df9ff, ice: 0x9fe8ff, greenhouse: 0xff8fc8, solar: 0xffe066, battery: 0x9dff8a, shelter: 0xff9a6a };

  class MissionScene extends Phaser.Scene {
    constructor() { super('Mission'); }
    init(data) { this.resume = !!(data && data.resume); }

    create() {
      const E = NS.ENGINE;
      const M = NS.mission();
      this.M = M;
      this.cameras.main.fadeIn(350);
      NS.put(this, 'bg.site.' + M.map, 0, 0).setDepth(-100);
      if (M.map !== 'mars') NS.twinkles(this, 22, { x: 0, y: 0, w: NS.W, h: 190 }, -90);
      this.night = this.add.rectangle(0, 0, NS.W, NS.H, 0x0a0628, 0).setOrigin(0).setDepth(900);
      this.dustLayer = this.add.rectangle(0, 0, NS.W, NS.H, 0xd9884f, 0).setOrigin(0).setDepth(901);
      this.focus = new NS.Focus(this);

      if (this.resume && NS.run.history.length) this.state = NS.run.history[NS.run.history.length - 1];
      else {
        this.state = E.createMission(M.id, NS.run.siteId, NS.run.layout, { seed: NS.run.seed, live: NS.save.data.settings.live !== false ? NS.live.forEngine() : null });
        NS.run.history = [this.state];
      }
      this.busy = false;

      this.makeBuildings();
      this.crew = NS.CREW.map((n, i) => { const h = this.spotFor('crew', i); return NS.makeAstronaut(this, n, h.x, h.y); });

      this.guide = NS.createGuide(this, 24, 18, 610);
      this.makeMeters();
      this.makeDayPanel();
      this.makeCrewPanel();
      this.btnAsk = NS.button(this, 1096, 596, 316, 52, 'Ask Mission Control', () => this.ask(), { color: NS.C.teal, icon: 'radio', size: 19 }).setDepth(3001);
      this.btnEnd = NS.button(this, 1096, 664, 316, 70, 'End day', () => this.endDay(), { color: NS.C.green, icon: 'sun', size: 28, sound: 'day' }).setDepth(3001);

      const last = this.state.log[this.state.log.length - 1];
      this.plan = { on: Object.assign({}, this.state.on), jobs: last ? last.jobs.slice() : this.defaultJobs() };
      this.refresh(true);
      const intro = this.resume ? 'We rewound time to the start of day ' + this.state.day + '. Let’s try a new plan!'
        : 'Each day: tap a machine to switch it on or off, give every astronaut a job, then press End day!';
      this.guide.say(intro, { expr: 'talk' });
      if (!this.resume) this.storyNote();

      this.input.keyboard.on('keydown', (ev) => {
        if (this.busy) { if (ev.key === 'Enter' || ev.key === ' ') this.closeOverlay(); return; }
        if (/^[1-3]$/.test(ev.key)) this.cycleJob(parseInt(ev.key, 10) - 1, 1);
        if (ev.key === 'e' || ev.key === 'E') this.endDay();
        if (ev.key === 'r' || ev.key === 'R') this.rewind();
        if (ev.key === 'm' || ev.key === 'M') this.ask();
      });
      window.__outpost = Object.assign(window.__outpost || {}, { mission: this });
    }

    storyNote() {
      const st = this.state.events.find((e) => e.type === 'storm');
      if (st) this.time.delayedCall(NS.FAST ? 300 : 6500, () => {
        if (!this.busy && this.state.day === 1) this.guide.say('Heads up! ' + (st.source === 'LIVE' ? 'Today’s REAL Sun is active.' : 'Real NASA flare records are loaded.') + ' Watch the forecast for storm days.', { expr: 'wow' });
      });
    }

    defaultJobs() {
      const E = NS.ENGINE;
      const pref = { engineer: ['tune', 'shelter', 'rest'], botanist: ['garden', 'rest'], geologist: ['science', 'rest'] };
      return NS.CONTENT.CREW.map((c, i) => pref[c.role].find((j) => E.jobAvailable(this.state, j, i)) || 'rest');
    }

    // ------------------------------------------------------------------ base view
    makeBuildings() {
      const CT = NS.CONTENT;
      this.bsprites = this.state.layout.map((b) => {
        const p = NS.PADS[b.pad];
        const B = CT.BUILDINGS[b.type];
        const glow = NS.glow(this, p.x, p.y - 40, GLOW[b.type], 230, 0).setDepth(950);
        const img = NS.put(this, 'building.' + b.type + '.ready', p.x, p.y + 10).setDepth(p.y);
        const o = { b, img, p, B, glow };
        this.tweens.add({ targets: img, scaleY: img.scaleY * 1.015, yoyo: true, repeat: -1, duration: 1400 + Math.random() * 600, ease: 'Sine.easeInOut' });
        if (B.toggle) {
          img.setInteractive({ useHandCursor: true });
          img.on('pointerdown', () => this.toggle(b.type));
        }
        if (B.toggle || b.type === 'shelter') {
          o.badge = this.add.container(p.x, p.y - 122).setDepth(960);
          o.badgeImg = this.add.image(0, 0, '__DEFAULT');
          o.badgeT = this.add.text(0, -1, '', { fontFamily: NS.DISPLAY, fontSize: '15px', color: NS.C.inkHex, fontStyle: '600' }).setOrigin(0.5);
          o.badge.add([o.badgeImg, o.badgeT]);
        }
        return o;
      });
    }

    spotFor(type, i) {
      if (type === 'field') return { x: 160 + i * 60 + (this.M.body === 'mars' ? 40 : 0), y: 470 + (i % 2) * 14 };
      const s = this.bsprites && this.bsprites.find((o) => o.b.type === type);
      const p = s ? s.p : NS.PADS[this.state.layout[0].pad];
      return { x: p.x - 60 + i * 52, y: p.y + 40 + (i % 2) * 6 };
    }

    toggle(type) {
      if (this.busy || this.state.status !== 'playing') return;
      this.plan.on[type] = !this.plan.on[type];
      NS.sfx(this.plan.on[type] ? 'on' : 'off');
      const B = NS.CONTENT.BUILDINGS[type];
      this.guide.say(B.name + (this.plan.on[type] ? ' ON. ' : ' OFF. ') + B.about, { expr: 'talk' });
      const o = this.bsprites.find((x) => x.b.type === type);
      if (o) this.tweens.add({ targets: o.img, scaleX: o.img.scaleX * 1.08, scaleY: o.img.scaleY * 0.92, yoyo: true, duration: 110 });
      this.refresh();
    }

    // ------------------------------------------------------------------ HUD
    makeMeters() {
      this.meters = {
        power: NS.meter(this, 24, 124, 196, 'power', 'POWER'),
        air: NS.meter(this, 228, 124, 196, 'air', 'AIR'),
        food: NS.meter(this, 432, 124, 196, 'food', 'FOOD'),
      };
      Object.values(this.meters).forEach((m) => m.c.setDepth(3000));
      // hearts + science goal
      this.heartsBox = this.add.container(636, 124).setDepth(3000);
      this.heartsBox.add(NS.glass(this, 0, 0, 232, 66, { r: 16 }));
      this.heartsBox.add(NS.text(this, 14, 7, 'CREW HEALTH', 12, NS.C.dimHex));
      this.hearts = [];
      for (let i = 0; i < 10; i++) { const h = NS.icon(this, 'health', 22 + i * 21, 42, 18); this.heartsBox.add(h); this.hearts.push(h); }
      this.sciBox = this.add.container(24, 196).setDepth(3000);
      this.sciBox.add(NS.glass(this, 0, 0, 844, 34, { r: 14 }));
      this.sciBox.add(NS.icon(this, 'science', 22, 17, 20));
      this.sciText = NS.text(this, 40, 8, '', 14, '#ffffff');
      this.sciBar = this.add.graphics();
      this.sciBox.add([this.sciText, this.sciBar]);
    }

    makeDayPanel() {
      NS.glass(this, 880, 16, 376, 214, { r: 18 }).setDepth(3000);
      this.dayTitle = NS.title(this, 900, 24, '', 28, '#ffffff', false).setDepth(3001);
      this.dayIcon = null;
      this.dayLight = NS.text(this, 1236, 32, '', 16, '#ffd23f').setOrigin(1, 0).setDepth(3001);
      this.energyLine = NS.text(this, 900, 64, '', 15, '#ffffff', '700').setDepth(3001);
      this.forecastG = this.add.container(0, 0).setDepth(3001);
      this.alertText = NS.text(this, 900, 148, '', 14, '#ff9a7a', '800').setDepth(3001).setWordWrapWidth(234).setLineSpacing(1);
      this.btnRewind = NS.button(this, 1188, 196, 116, 38, 'Rewind', () => this.rewind(), { color: NS.C.cream, icon: 'rewind', size: 15 }).setDepth(3001);
      NS.text(this, 1256, 234, NS.stageLabel('Mission') + ' · ' + this.M.title, 13, '#ffffff').setOrigin(1, 0).setDepth(3001).setStroke(NS.C.inkHex, 4);
    }

    makeCrewPanel() {
      const CT = NS.CONTENT;
      this.crewUI = CT.CREW.map((c, i) => {
        const x = 24 + i * 300, y = 552, w = 292, h = 156;
        NS.glass(this, x, y, w, h, { r: 18 }).setDepth(3000);
        NS.glow(this, x + 48, y + 52, 0x7df9ff, 110, 0.25).setDepth(3000);
        const face = NS.portrait(this, c.id, 'happy', x + 48, y + 50, 92).setDepth(3001);
        NS.title(this, x + 96, y + 8, c.name, 22, '#ffffff', false).setDepth(3001);
        NS.text(this, x + 98, y + 38, c.roleName, 13, '#7df9ff').setDepth(3001);
        const jobText = NS.text(this, x + w - 12, y + 12, '', 14, '#ffd23f').setOrigin(1, 0).setDepth(3001);
        NS.icon(this, 'rad', x + 106, y + 70, 16).setDepth(3001);
        const doseText = NS.text(this, x + 118, y + 61, '', 12, '#ffffff').setDepth(3001);
        const doseBar = this.add.graphics().setDepth(3001);
        const btns = CT.JOB_ORDER.map((j, k) => {
          const J = CT.JOBS[j];
          const bx = x + 32 + k * 57, by = y + 122;
          const b = NS.button(this, bx, by, 50, 46, '', () => this.setJob(i, j), { icon: J.icon, color: NS.C.cream }).setDepth(3001);
          if (J.role === c.role) NS.icon(this, 'star', bx + 19, by - 20, 14).setDepth(3003);
          if (J.outdoor) NS.icon(this, 'sun', bx - 19, by - 20, 12).setDepth(3003);
          return { j, b };
        });
        const grounded = NS.text(this, x + w / 2 + 40, y + 96, '', 12, '#ff9a7a', '800').setOrigin(0.5).setDepth(3002);
        return { x, y, w, h, face, jobText, doseText, doseBar, btns, grounded };
      });
      NS.text(this, 924, 552, '★ = role bonus (×2)   ☀ = outside job (more radiation)', 12, NS.C.dimHex, '700').setDepth(3001).setVisible(false);
    }

    setJob(i, j) {
      if (this.busy || !NS.ENGINE.jobAvailable(this.state, j, i)) { NS.sfx('error'); return; }
      this.plan.jobs[i] = j;
      const c = NS.CONTENT.CREW[i], J = NS.CONTENT.JOBS[j];
      const bonus = J.role === c.role ? ' ' + c.roleName + ' bonus: double!' : '';
      this.guide.say(c.name + ': ' + J.label + '. ' + J.about + '.' + bonus, { expr: 'talk' });
      this.tweens.add({ targets: this.crewUI[i].face, y: this.crewUI[i].y + 40, yoyo: true, duration: 120 });
      this.refresh();
    }

    cycleJob(i, d) {
      const avail = NS.CONTENT.JOB_ORDER.filter((j) => NS.ENGINE.jobAvailable(this.state, j, i));
      const k = avail.indexOf(this.plan.jobs[i]);
      this.setJob(i, avail[(k + d + avail.length) % avail.length]);
    }

    exprFor(i) {
      const s = this.state, M = this.M, r = s.res;
      if (s.grounded[i] || r.hearts <= 4 || s.dose[i] >= M.doseLimit * 0.85) return 'tired';
      const storm = s.events.find((e) => e.type === 'storm' && e.day === s.day);
      if (r.air <= 2 || r.food <= 2 || (storm && r.shield < storm.strength) || s.dose[i] >= M.doseLimit * 0.6) return 'worried';
      return 'happy';
    }

    // ------------------------------------------------------------------ refresh
    refresh(first) {
      const E = NS.ENGINE, CT = NS.CONTENT, s = this.state, r = s.res, M = this.M;
      const lit = E.isLit(s, s.day), dust = E.dustOn(s, s.day);
      this.tweens.add({ targets: this.night, fillAlpha: lit ? 0 : 0.45, duration: first ? 0 : 900 });
      this.tweens.add({ targets: this.dustLayer, fillAlpha: dust ? 0.28 : 0, duration: first ? 0 : 900 });
      if (dust && !this._dustFx) this.startDust(); else if (!dust && this._dustFx) { this._dustFx.remove(false); this._dustFx = null; }
      this.meters.power.set(r.power, s.capacity, r.power <= 1 && !lit, '/' + s.capacity);
      this.meters.air.set(r.air, CT.CAPS.air, r.air <= CT.CREW_NEEDS.air);
      this.meters.food.set(r.food, CT.CAPS.food, r.food <= CT.CREW_NEEDS.food);
      this.hearts.forEach((h, i) => { h.setAlpha(i < r.hearts ? 1 : 0.2).setTint(i < r.hearts ? 0xffffff : 0x55507a); });
      this.sciText.setText('SCIENCE ' + r.science + ' / ' + M.scienceGoal + '  (goal for the 3rd star)');
      this.sciBar.clear();
      this.sciBar.fillStyle(0x3a2f7a, 1).fillRoundedRect(330, 12, 500, 10, 5);
      this.sciBar.fillStyle(NS.C.science, 1).fillRoundedRect(330, 12, 500 * Math.min(1, r.science / M.scienceGoal), 10, 5);

      // day panel
      this.dayTitle.setText('DAY ' + s.day + ' / ' + s.days);
      if (this.dayIcon) this.dayIcon.destroy();
      this.dayIcon = NS.icon(this, dust ? 'dust' : lit ? 'sun' : 'night', 1080, 42, 28).setDepth(3001);
      this.dayLight.setText(dust ? 'Dust storm' : lit ? 'Daytime' : 'Night');
      const out = E.energyOutlook(s, this.plan), net = out.made - out.use;
      this.energyLine.setText('Power today: make ' + out.made + ', use ' + out.use + '  (' + (net >= 0 ? '+' : '') + net + ')');
      this.energyLine.setColor(out.stored + net < 0 ? '#ff9a9a' : '#ffffff');
      this.forecastG.removeAll(true);
      E.forecast(s, 7).forEach((f, k) => {
        const x = 912 + k * 46, y = 110;
        this.forecastG.add(NS.glass(this, x - 20, y - 22, 40, 46, { r: 10, alpha: k === 0 ? 0.95 : 0.6, edge: k === 0 ? 0xffd23f : NS.C.edge }));
        this.forecastG.add(NS.icon(this, f.storm ? 'storm' : f.dust ? 'dust' : f.lit ? 'sun' : 'night', x, y - 4, 20));
        this.forecastG.add(NS.text(this, x, y + 10, String(f.day), 11, NS.C.dimHex).setOrigin(0.5, 0));
      });
      const today = E.stormOn(s, s.day), tomorrow = E.stormOn(s, s.day + 1);
      const nextDark = lit && E.forecast(s, 2).find((f) => !f.lit);
      let alert = '';
      if (today) alert = 'STORM TODAY! ' + this.eventLabel(today);
      else if (tomorrow) alert = 'Storm tomorrow! Charge the shelter. ' + this.eventLabel(tomorrow);
      else if (nextDark) alert = 'Sunset tomorrow: no solar power at night. Store power!';
      else if (dust) alert = 'Dust storm: solar panels make half power.';
      if (s.advice.pending) alert += (alert ? ' · ' : '') + 'Radio message to Earth… answer tomorrow.';
      this.alertText.setText(alert).setColor(today || tomorrow ? '#ff9a7a' : '#9fe8ff');
      this.btnRewind.setEnabled(NS.run.history.length > 1 && !this.busy);
      const left = E.ADVICE_PER_MISSION - s.advice.used;
      this.btnAsk.setLabel(s.advice.ready ? 'Read Earth’s reply!' : s.advice.pending ? 'Waiting for Earth…' : 'Ask Mission Control (' + left + ')');
      this.btnAsk.setEnabled(!this.busy && (!!s.advice.ready || (!s.advice.pending && left > 0)));

      // buildings
      this.bsprites.forEach((o) => {
        let active = true;
        if (o.B.toggle) active = !!this.plan.on[o.b.type];
        else if (o.b.type === 'solar') active = lit;
        else if (o.b.type === 'battery') active = r.power > 0;
        else if (o.b.type === 'shelter') active = r.shield > 0;
        NS.retexture(o.img, 'building.' + o.b.type + (active ? '.ready' : '.idle'));
        this.tweens.add({ targets: o.glow, alpha: active ? (lit ? 0.18 : 0.55) : 0, duration: 400 });
        if (o.badge) {
          let label, col;
          if (o.b.type === 'shelter') { label = 'SHIELD ' + r.shield + '/' + E.shieldCap(s); col = r.shield ? NS.C.rad : 0x8f88b8; }
          else { const on = !!this.plan.on[o.b.type]; label = (on ? 'ON' : 'OFF') + ' · ' + o.B.power + '⚡'; col = on ? NS.C.green : 0x8f88b8; }
          o.badgeT.setText(label);
          const w = Math.ceil(o.badgeT.width + 26);
          o.badgeImg.setTexture(NS.bake(this, 'badge2:' + w + ':' + col, w + 6, 36, (g) => {
            g.fillStyle(NS.C.ink, 1).fillRoundedRect(3, 7, w, 26, 13);
            g.fillStyle(col, 1).fillRoundedRect(3, 3, w, 26, 13);
            g.fillStyle(0xffffff, 0.3).fillRoundedRect(8, 6, w - 10, 8, 4);
            g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(3, 3, w, 26, 13);
          }));
        }
      });

      // crew
      this.crewUI.forEach((u, i) => {
        const cur = this.plan.jobs[i];
        u.jobText.setText(CT.JOBS[cur].label + (CT.JOBS[cur].outdoor ? ' ☀' : ''));
        u.face.setExpr(this.exprFor(i));
        const d = s.dose[i], lim = M.doseLimit;
        u.doseText.setText('RADIATION ' + d.toFixed(1) + ' / ' + lim + ' mSv');
        u.doseBar.clear();
        u.doseBar.fillStyle(0x3a2f7a, 1).fillRoundedRect(u.x + 98, u.y + 80, 182, 9, 4);
        const frac = Math.min(1, d / lim);
        u.doseBar.fillStyle(frac > 0.85 ? NS.C.red : frac > 0.6 ? NS.C.orange : NS.C.yellow, 1).fillRoundedRect(u.x + 98, u.y + 80, Math.max(4, 182 * frac), 9, 4);
        u.grounded.setText(s.grounded[i] ? 'Radiation limit: resting inside' : '');
        u.btns.forEach(({ j, b }) => b.setEnabled(E.jobAvailable(s, j, i) && !this.busy).setSelected(j === cur));
      });
      this.btnEnd.setEnabled(!this.busy && s.status === 'playing');
      this.updateFocus();
    }

    eventLabel(e) {
      const date = e.date ? ' (' + this.prettyDate(e.date) + ')' : '';
      if (e.source === 'LIVE') return 'A REAL ' + e.cls + ' flare from this month' + date + ', NASA DONKI. Strength ' + e.strength + '.';
      if (e.source === 'ARCHIVE') return 'Real ' + e.cls + ' flare' + date + ' from NASA DONKI records, replayed. Strength ' + e.strength + '.';
      return 'Practice ' + e.cls + ' flare. Strength ' + e.strength + '.';
    }
    prettyDate(d) {
      const [y, m, day] = d.split('-').map(Number);
      return day + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] + ' ' + y;
    }

    updateFocus() {
      if (this.busy) { this.focus.set(this.overlayBtns ? this.overlayBtns.map((b, i) => b.focusItem('o' + i)) : []); return; }
      const items = [this.btnEnd.focusItem('end'), this.btnAsk.focusItem('ask')];
      this.crewUI.forEach((u, i) => items.push({
        id: 'crew' + i, bounds: () => ({ x: u.x, y: u.y, w: u.w, h: u.h }), activate: () => this.cycleJob(i, 1),
        left: () => this.cycleJob(i, -1), right: () => this.cycleJob(i, 1),
      }));
      this.bsprites.filter((o) => o.B.toggle).forEach((o) => items.push({
        id: 'b' + o.b.type, bounds: () => ({ x: o.p.x - 90, y: o.p.y - 140, w: 180, h: 160 }), activate: () => this.toggle(o.b.type),
      }));
      items.push(this.btnRewind.focusItem('rewind'));
      this.focus.set(items);
    }

    // ------------------------------------------------------------------ Mission Control (comm delay)
    ask() {
      if (this.busy || this.state.status !== 'playing') return;
      const s = this.state, delay = NS.CONTENT.COMM_DELAY[s.body];
      if (s.advice.ready) { this.showAdvice(s.advice.ready); return; }
      if (s.advice.pending || s.advice.used >= NS.ENGINE.ADVICE_PER_MISSION) return;
      this.state = NS.ENGINE.requestAdvice(s);
      NS.run.history[NS.run.history.length - 1] = this.state;
      NS.sfx('radio');
      this.radioFx(delay);
      if (delay.days === 0) {
        this.guide.say('Calling Earth… radio waves take about ' + delay.oneWay + ' each way.', { expr: 'talk' });
        this.busy = true;
        this.time.delayedCall(NS.FAST ? 300 : Math.round(delay.seconds * 2 * 1000), () => { this.busy = false; this.showAdvice(this.state.advice.ready); });
      } else {
        this.guide.say('Message sent! From Mars, radio takes ' + delay.oneWay + ' each way, and Earth needs time to think. The answer arrives tomorrow.', { expr: 'worried' });
        this.refresh();
      }
    }

    radioFx(delay) {
      const from = { x: 640, y: 380 }, to = { x: 1110, y: 60 };
      const dot = NS.glow(this, from.x, from.y, 0x7df9ff, 50, 1).setDepth(5000);
      const dur = delay.days === 0 ? Math.round(delay.seconds * 1000) : 1400;
      this.tweens.add({ targets: dot, x: to.x, y: to.y, duration: NS.FAST ? 150 : dur, ease: 'Sine.easeInOut', yoyo: delay.days === 0, onComplete: () => dot.destroy() });
      for (let k = 0; k < 3; k++) {
        const ring = this.add.circle(from.x, from.y, 20, 0x7df9ff, 0).setStrokeStyle(3, 0x7df9ff, 1).setDepth(4999);
        this.tweens.add({ targets: ring, radius: 120, alpha: 0, duration: 900, delay: k * 250, onComplete: () => ring.destroy() });
      }
    }

    showAdvice(a) {
      const s = this.state;
      const late = a.forDay < s.day;
      const lines = [];
      lines.push({ kind: 'info', text: (late ? 'This answer is about day ' + a.forDay + ' (yesterday): Mars is far away!' : 'Answer from Earth about today:') });
      a.reasons.forEach((t) => lines.push({ kind: 'good', text: t }));
      const C = NS.CONTENT;
      const plan = a.plan;
      lines.push({ kind: 'info', text: 'Suggested jobs: ' + plan.jobs.map((j, i) => C.CREW[i].name + ' → ' + C.JOBS[j].label).join(', ') });
      const offs = Object.keys(plan.on).filter((k) => !plan.on[k]).map((k) => C.BUILDINGS[k].short);
      if (offs.length) lines.push({ kind: 'info', text: 'Switch off: ' + offs.join(', ') });
      this.overlay('MISSION CONTROL', lines, [
        ['Use this plan', NS.C.green, () => {
          this.plan = { on: Object.assign({}, plan.on), jobs: plan.jobs.map((j, i) => (NS.ENGINE.jobAvailable(s, j, i) ? j : 'rest')) };
          this.state = Object.assign({}, this.state, { advice: Object.assign({}, this.state.advice, { ready: null }) });
          NS.run.history[NS.run.history.length - 1] = this.state;
        }],
        ['My own plan', NS.C.cream, () => {
          this.state = Object.assign({}, this.state, { advice: Object.assign({}, this.state.advice, { ready: null }) });
          NS.run.history[NS.run.history.length - 1] = this.state;
        }],
      ], 'radio');
    }

    // ------------------------------------------------------------------ day flow
    endDay() {
      if (this.busy || this.state.status !== 'playing') return;
      const E = NS.ENGINE;
      const before = this.state;
      const after = E.step(before, { on: this.plan.on, jobs: this.plan.jobs });
      this.state = after;
      NS.run.history.push(after);
      const rep = after.log[after.log.length - 1];

      this.plan.jobs.forEach((j, i) => {
        const jj = E.jobAvailable(before, j, i) ? j : 'rest';
        const spot = this.spotFor(JOB_SPOT[jj] === 'field' || (this.bsprites.some((o) => o.b.type === JOB_SPOT[jj])) ? JOB_SPOT[jj] : 'crew', i);
        this.crew[i].walkTo(spot.x, spot.y);
      });
      ['power', 'air', 'food'].forEach((k) => this.meters[k].pulse(rep.deltas[k]));
      if (rep.storm) this.stormFx(rep.storm);
      if (rep.storm) NS.save.recordStorm(rep.storm);
      this.time.delayedCall(700, () => this.reactions(rep));

      const newFacts = NS.save.unlockFacts(after.facts);
      newFacts.forEach((id, k) => this.time.delayedCall(1100 + k * 1900, () => {
        const f = NS.LOGBOOK.byId(id) || NS.OSDR.studies.find((x) => x.id === id);
        if (f) { NS.toast(this, 'New Journal entry: ' + f.title.slice(0, 40), NS.C.yellow); NS.sfx('unlock'); }
      }));
      this.time.delayedCall(rep.storm ? 1300 : 500, () => this.showReport(rep));
      this.busy = true;
      this.refresh();
    }

    reactions(rep) {
      const bad = rep.lines.filter((l) => l.kind === 'bad').map((l) => l.cause);
      this.crew.forEach((c, i) => {
        let icon = 'star', col = NS.C.yellow;
        if (bad.includes('air')) { icon = 'air'; col = NS.C.red; }
        else if (bad.includes('food')) { icon = 'food'; col = NS.C.red; }
        else if (rep.storm && rep.storm.extra) icon = 'storm';
        else if (rep.storm) icon = 'shield';
        else if (rep.doseDelta[i] >= 2.5) icon = 'rad';
        else if (rep.jobs[i] === 'science') icon = 'science';
        else if (rep.jobs[i] === 'garden') icon = 'food';
        this.time.delayedCall(i * 160, () => NS.emote(this, c.x, c.y - 100, icon, icon === 'star' ? undefined : col === NS.C.red ? col : undefined));
      });
    }

    startDust() {
      this._dustFx = this.time.addEvent({ delay: 90, loop: true, callback: () => {
        const p = this.add.circle(NS.W + 10, Phaser.Math.Between(200, 560), Phaser.Math.Between(3, 9), 0xf0b08a, 0.7).setDepth(902);
        this.tweens.add({ targets: p, x: -20, y: p.y + Phaser.Math.Between(-40, 60), alpha: 0.1, duration: Phaser.Math.Between(1400, 2600), onComplete: () => p.destroy() });
      } });
    }

    stormFx(storm) {
      NS.sfx('storm');
      this.cameras.main.flash(500, 255, 200, 140);
      this.cameras.main.shake(500, storm.extra ? 0.01 : 0.004);
      for (let k = 0; k < 50; k++) {
        const x = Phaser.Math.Between(0, NS.W + 300);
        const c = this.add.image(x, -20, 'fx.glow').setTint(k % 2 ? 0xffd23f : 0xff5fae).setBlendMode(Phaser.BlendModes.ADD).setScale(0.12, 0.5).setAngle(25).setDepth(2500);
        this.tweens.add({ targets: c, y: NS.H + 40, x: x - 260, duration: Phaser.Math.Between(500, 1000), delay: k * 22, onComplete: () => c.destroy() });
      }
      const sh = this.bsprites.find((o) => o.b.type === 'shelter');
      if (sh && storm.blocked) {
        this.time.delayedCall(400, () => {
          NS.sfx('shield');
          const dome = this.add.circle(sh.p.x, sh.p.y - 30, 30, 0x7df9ff, 0.25).setStrokeStyle(5, 0x7df9ff, 1).setDepth(2600);
          this.tweens.add({ targets: dome, radius: 170, alpha: 0, duration: 900, onComplete: () => dome.destroy() });
        });
      }
    }

    showReport(rep) {
      const lines = rep.lines.length ? rep.lines.slice() : [{ kind: 'good', text: 'A calm day. Everything ran smoothly!' }];
      const named = { power: 'power', air: 'air', food: 'food', hearts: 'hearts', science: 'science', shield: 'shield' };
      const summary = Object.keys(named).filter((k) => rep.deltas[k]).map((k) => (rep.deltas[k] > 0 ? '+' : '') + rep.deltas[k] + ' ' + named[k]);
      const doseLine = 'Radiation: ' + rep.doseDelta.map((d, i) => NS.CONTENT.CREW[i].name + ' +' + d.toFixed(1)).join(', ') + ' mSv';
      lines.unshift({ kind: 'info', text: doseLine });
      const done = this.state.status !== 'playing';
      const bad = lines.filter((l) => l.kind === 'bad');
      this.guide.say(bad.length ? 'Uh-oh! ' + bad.map((l) => l.text).join(' ') : rep.storm ? 'The shelter kept everyone safe from the storm!' : 'Day ' + rep.day + ' done! ' + (summary.slice(0, 3).join(', ') || 'All steady.'),
        { expr: bad.length ? 'worried' : rep.storm ? 'wow' : 'happy' });
      if (!bad.length && !rep.storm) NS.sfx('star', 0);
      this.overlay('DAY ' + rep.day + ' REPORT' + (rep.dust ? ' · dust storm' : rep.lit ? ' · daytime' : ' · night'), lines, [[done ? 'Continue' : 'Next day', NS.C.teal, null]], null, summary.join('   '));
    }

    overlay(title, lines, buttons, icon, sub) {
      this.busy = true;
      const D = 5000, x = 296, w = 688;
      const h = Math.min(360, 136 + lines.length * 30);
      const y = Math.max(250, 360 - h / 2);
      const parts = [];
      parts.push(this.add.rectangle(0, 0, NS.W, NS.H, 0x0b0626, 0.4).setOrigin(0).setDepth(D).setInteractive());
      parts.push(NS.panel(this, x, y, w, h, { r: 24 }).setDepth(D + 1));
      if (icon) parts.push(NS.icon(this, icon, x + 40, y + 34, 30).setDepth(D + 2));
      parts.push(NS.title(this, x + (icon ? 66 : 28), y + 16, title, 24, NS.C.inkHex, false).setDepth(D + 2));
      if (sub) parts.push(NS.text(this, x + 28, y + 52, sub, 15, NS.C.slateHex, '800').setDepth(D + 2).setWordWrapWidth(w - 56));
      lines.slice(0, 8).forEach((l, k) => {
        const ly = y + (sub ? 84 : 64) + k * 30;
        parts.push(NS.icon(this, l.kind === 'bad' ? 'storm' : l.kind === 'good' ? 'star' : 'radio', x + 42, ly + 10, 18,
          { color: l.kind === 'bad' ? NS.C.red : l.kind === 'good' ? NS.C.yellow : NS.C.teal }).setDepth(D + 2));
        parts.push(NS.text(this, x + 62, ly, l.text, 16, l.kind === 'bad' ? '#c0392b' : NS.C.inkHex, '700').setDepth(D + 2).setWordWrapWidth(w - 90));
      });
      this.overlayBtns = buttons.map(([label, col, fn], i) => {
        const b = NS.button(this, x + w - 110 - (buttons.length - 1 - i) * 200, y + h - 36, 184, 54, label, () => { if (fn) fn(); this.closeOverlay(); }, { color: col, size: 19 }).setDepth(D + 2);
        parts.push(b);
        return b;
      });
      parts.forEach((p) => { if (p.setAlpha) { p.setAlpha(0); this.tweens.add({ targets: p, alpha: 1, duration: 180 }); } });
      this.overlayParts = parts;
      this.updateFocus();
    }

    closeOverlay() {
      if (!this.overlayParts) return;
      this.overlayParts.forEach((o) => o.destroy());
      this.overlayParts = null;
      this.overlayBtns = null;
      this.busy = false;
      if (this.state.status !== 'playing') {
        NS.sfx(this.state.status === 'won' ? 'win' : 'lose');
        NS.go(this, 'Results');
        return;
      }
      this.crew.forEach((c, i) => { const h = this.spotFor('crew', i); c.walkTo(h.x, h.y); });
      const s = this.state;
      if (s.advice.ready && s.advice.ready.forDay < s.day) { NS.sfx('radio'); this.guide.say('Earth’s reply just arrived! Tap “Read Earth’s reply”.', { expr: 'wow' }); }
      const tomorrow = NS.ENGINE.stormOn(s, s.day + 1);
      const hot = s.dose.findIndex((d, i) => !s.grounded[i] && d >= this.M.doseLimit * 0.6);
      if (hot >= 0 && !tomorrow) {
        NS.sfx('alarm');
        this.guide.say(NS.CONTENT.CREW[hot].name + ' has soaked up a lot of radiation (' + s.dose[hot].toFixed(1) + ' of ' + this.M.doseLimit + ' mSv). Give them an inside job today!', { expr: 'worried' });
      } else if (tomorrow) { NS.sfx('alarm'); this.guide.say('Storm warning for tomorrow! Charge the shelter today. ' + this.eventLabel(tomorrow), { expr: 'worried' }); }
      else if (!NS.ENGINE.isLit(s, s.day) && s.log.length && s.log[s.log.length - 1].lit) this.guide.say('The Sun has set. It will be dark for many days. Save power!', { expr: 'worried' });
      this.refresh();
    }

    rewind() {
      if (this.busy || NS.run.history.length <= 1) return;
      NS.run.history.pop();
      this.state = NS.run.history[NS.run.history.length - 1];
      const last = this.state.log[this.state.log.length - 1];
      this.plan = { on: Object.assign({}, this.state.on), jobs: last ? last.jobs.slice() : this.defaultJobs() };
      NS.sfx('radio');
      this.guide.say('Rewind! Back to the start of day ' + this.state.day + '.', { expr: 'wow' });
      this.cameras.main.flash(250, 180, 200, 255);
      this.refresh();
    }
  }
  NS.MissionScene = MissionScene;
})();
