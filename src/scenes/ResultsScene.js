/* RESULTS: a mission patch + stars after a win, or a friendly "what happened" after a loss. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  class ResultsScene extends Phaser.Scene {
    constructor() { super('Results'); }

    create() {
      const E = NS.ENGINE, CT = NS.CONTENT;
      const M = NS.mission();
      const st = NS.run.history[NS.run.history.length - 1];
      const won = st.status === 'won';
      const stars = E.stars(st);
      this.cameras.main.fadeIn(350);
      NS.put(this, 'bg.site.' + M.map, 0, 0).setDepth(-100);
      this.add.rectangle(0, 0, NS.W, NS.H, 0x140d3d, 0.6).setOrigin(0);
      NS.twinkles(this, 30, { x: 0, y: 0, w: NS.W, h: NS.H });
      this.focus = new NS.Focus(this);

      const rec = NS.save.recordResult(NS.run.missionIndex, M.id, stars);
      const facts = won ? NS.save.unlockFacts(M.logbook) : [];
      const isLast = NS.run.missionIndex >= CT.MISSIONS.length - 1;
      const x = 170, y = 40, w = 940, h = 640;
      NS.glass(this, x, y, w, h, { r: 28, alpha: 0.9 });
      NS.title(this, NS.W / 2, y + 22, won ? 'MISSION COMPLETE!' : 'MISSION PAUSED', 46, won ? '#ffd23f' : '#ffffff').setOrigin(0.5, 0);
      NS.text(this, NS.W / 2, y + 84, (NS.run.missionIndex + 1) + '. ' + M.title + ' · ' + CT.SITES[st.siteId].name, 18, NS.C.dimHex).setOrigin(0.5, 0);

      const buttons = [];
      if (won) {
        // patch + stars
        NS.glow(this, 330, y + 230, M.patch.color, 300, 0.5);
        const patch = NS.patch(this, 330, y + 230, NS.run.missionIndex, 200, true).setScale(0).setAngle(-20);
        this.tweens.add({ targets: patch, scale: 1, angle: 0, duration: 700, ease: 'Back.easeOut', delay: 200 });
        this.time.delayedCall(300, () => { NS.confetti(this, 330, y + 200, 80); NS.sfx('win'); });
        NS.text(this, 330, y + 350, 'Mission patch earned!', 16, '#ffd23f').setOrigin(0.5);
        for (let i = 0; i < 3; i++) {
          const sx = 640 + i * 92, sy = y + 170;
          NS.icon(this, 'star', sx, sy, 70, { color: 0x4a4280 });
          if (i < stars) this.time.delayedCall(700 + i * 380, () => {
            const s = NS.icon(this, 'star', sx, sy, 70).setScale(0.2);
            NS.glow(this, sx, sy, NS.C.yellow, 140, 0.6);
            this.tweens.add({ targets: s, scale: 1, duration: 360, ease: 'Back.easeOut' });
            NS.sfx('star', i);
          });
        }
        const goals = [
          ['Survived all ' + M.days + ' days', true],
          ['Hearts ' + st.res.hearts + '/10 (goal ' + M.healthGoal + ') · ' + (st.grounded.some(Boolean) ? 'someone hit the radiation limit' : 'nobody over the radiation limit'),
            st.res.hearts >= M.healthGoal && !st.grounded.some(Boolean)],
          ['Science ' + st.res.science + ' (goal ' + M.scienceGoal + ')', st.res.science >= M.scienceGoal],
        ];
        goals.forEach(([t, ok], i) => {
          NS.icon(this, 'star', 560, y + 252 + i * 34, 20, { color: ok ? NS.C.yellow : 0x6f669e });
          NS.text(this, 582, y + 241 + i * 34, t, 17, ok ? '#ffffff' : NS.C.dimHex, '800').setWordWrapWidth(480);
        });
        const dose = st.dose.map((d, i) => CT.CREW[i].name + ' ' + d.toFixed(1)).join(' · ');
        NS.text(this, 560, y + 352, 'Radiation dose (mSv): ' + dose, 15, '#ffb38a', '800');
        let msg = rec.newBest ? 'New best: ' + stars + ' star' + (stars > 1 ? 's' : '') + '!' : 'Your best is ' + NS.save.starsFor(M.id) + ' stars.';
        if (rec.unlockedNext && !isLast) msg += ' Mission ' + (NS.run.missionIndex + 2) + ' unlocked!';
        if (isLast) msg = 'You finished the Junior Astronaut Academy! You built the first outpost on Mars. 🎉';
        NS.title(this, NS.W / 2, y + 404, msg, 22, '#7df9ff', false).setOrigin(0.5, 0);
        if (facts.length) {
          const names = facts.map((id) => (NS.LOGBOOK.byId(id) || NS.OSDR.studies.find((s) => s.id === id) || { title: id }).title.slice(0, 34));
          NS.text(this, NS.W / 2, y + 446, 'New in your Journal: ' + names.join(' · '), 15, '#ffffff', '700').setOrigin(0.5, 0).setWordWrapWidth(840).setAlign('center');
        }
        this.time.delayedCall(500, () => NS.voice.say('Mission complete! You earned ' + stars + ' stars. ' + msg));
        if (!isLast) buttons.push(NS.button(this, NS.W / 2 + 240, y + h - 56, 250, 64, 'Next mission', () => this.next(), { color: NS.C.yellow, icon: 'flag', sound: 'unlock' }));
        buttons.push(NS.button(this, NS.W / 2, y + h - 56, 200, 64, 'Replay', () => this.retry(), { color: NS.C.teal }));
        buttons.push(NS.button(this, NS.W / 2 - 230, y + h - 56, 200, 64, 'Map', () => NS.go(this, 'Campaign'), { color: NS.C.cream }));
      } else {
        const why = E.explain(st);
        NS.portrait(this, 'astro', 'worried', 280, y + 230, 220);
        NS.title(this, 430, y + 124, 'What happened:', 22, '#ffffff', false);
        why.chain.slice(-5).forEach((t, i) => {
          NS.icon(this, 'storm', 446, y + 176 + i * 32, 18, { color: NS.C.red });
          NS.text(this, 468, y + 165 + i * 32, t, 17, '#ffb3a8', '700').setWordWrapWidth(600);
        });
        const ty = y + 176 + Math.min(5, why.chain.length) * 32 + 16;
        NS.title(this, 430, ty, 'Try this next time:', 22, '#ffffff', false);
        why.tips.slice(0, 3).forEach((t, i) => {
          NS.icon(this, 'star', 446, ty + 48 + i * 30, 18);
          NS.text(this, 468, ty + 37 + i * 30, t, 17, '#ffffff', '700').setWordWrapWidth(600);
        });
        NS.title(this, NS.W / 2, y + h - 130, 'No worries, Commander! Every mission teaches us something.', 21, '#7df9ff', false).setOrigin(0.5, 0);
        this.time.delayedCall(500, () => NS.voice.say('Mission paused. ' + why.chain.slice(-2).join(' ') + ' ' + (why.tips[0] || '')));
        buttons.push(NS.button(this, NS.W / 2 + 310, y + h - 56, 230, 64, 'Rewind a day', () => this.rewind(), { color: NS.C.green, icon: 'rewind' }));
        buttons.push(NS.button(this, NS.W / 2 + 70, y + h - 56, 220, 64, 'Try again', () => this.retry(), { color: NS.C.teal }));
        buttons.push(NS.button(this, NS.W / 2 - 160, y + h - 56, 200, 64, 'Rebuild', () => this.rebuild(), { color: NS.C.yellow, icon: 'crate' }));
        buttons.push(NS.button(this, NS.W / 2 - 350, y + h - 56, 140, 64, 'Map', () => NS.go(this, 'Campaign'), { color: NS.C.cream }));
      }
      this.focus.set(buttons.map((b, i) => b.focusItem('b' + i)));
      window.__outpost = Object.assign(window.__outpost || {}, { results: this, lastStars: stars });
    }

    next() { NS.run = NS.freshRun(NS.run.missionIndex + 1); NS.go(this, 'Briefing'); }
    retry() { NS.run.history = []; NS.run.seed = NS.SEED != null ? NS.SEED : Math.floor(Math.random() * 1e9); NS.go(this, 'Mission'); }
    rebuild() { NS.run.history = []; NS.go(this, 'Build'); }
    rewind() { if (NS.run.history.length > 1) NS.run.history.pop(); NS.go(this, 'Mission', { resume: true }); }
  }
  NS.ResultsScene = ResultsScene;
})();
