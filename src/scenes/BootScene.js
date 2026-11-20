/* Loads everything listed in assets.js, builds animations, starts fetching today's space weather,
 * then opens the title screen (or a testing shortcut). */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
      const { W, H } = NS;
      this.cameras.main.setBackgroundColor('#140d3d');
      const g = this.add.graphics();
      NS.title(this, W / 2, H / 2 - 50, 'Little Space Outpost', 40).setOrigin(0.5);
      const sub = NS.text(this, W / 2, H / 2 + 36, 'Warming up the rockets…', 17, NS.C.dimHex).setOrigin(0.5);
      this.load.on('progress', (p) => {
        g.clear();
        g.fillStyle(0x2b2070, 1).fillRoundedRect(W / 2 - 170, H / 2, 340, 20, 10);
        g.fillStyle(NS.C.teal, 1).fillRoundedRect(W / 2 - 167, H / 2 + 3, Math.max(14, 334 * p), 14, 7);
      });
      this.load.on('loaderror', (f) => sub.setText('Could not load ' + f.src + ' (serve this folder over http, not file://)'));
      Object.keys(NS.ASSETS.images).forEach((key) => this.load.image(key, NS.ASSETS.images[key].path));
      Object.keys(NS.ASSETS.spritesheets).forEach((key) => {
        const m = NS.ASSETS.spritesheets[key];
        this.load.spritesheet(key, m.path, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
      });
    }

    create() {
      Object.keys(NS.ASSETS.spritesheets).forEach((key) => {
        const m = NS.ASSETS.spritesheets[key];
        this.anims.create({ key: key + '.idle', frames: this.anims.generateFrameNumbers(key, { start: m.idle.start, end: m.idle.end }), frameRate: m.idle.fps, repeat: -1 });
        this.anims.create({ key: key + '.walk', frames: this.anims.generateFrameNumbers(key, { start: m.walk.start, end: m.walk.end }), frameRate: m.walk.fps, repeat: -1 });
      });
      NS.fxTextures(this);
      NS.live.load(); // async: today's real solar flares (labelled LIVE), or the archive

      // Testing shortcuts: ?scene=campaign|briefing|explore|build|mission&mission=N
      const q = new URLSearchParams(location.search);
      const mi = Math.max(0, Math.min(NS.CONTENT.MISSIONS.length - 1, (parseInt(q.get('mission'), 10) || 1) - 1));
      const scene = q.get('scene');
      if (scene) {
        NS.run = NS.freshRun(mi);
        const M = NS.mission();
        NS.run.siteId = M.sites.find((s) => NS.CONTENT.SITES[s].safe);
        if (scene === 'mission') NS.run.layout = NS.autoLayout(M, NS.run.siteId);
        const map = { campaign: 'Campaign', briefing: 'Briefing', explore: 'Explore', build: 'Build', mission: 'Mission', journal: 'Journal' };
        if (map[scene]) return this.scene.start(map[scene]);
      }
      this.scene.start('Title');
    }
  }

  // A sensible starter layout (testing shortcut ?scene=mission).
  NS.autoLayout = function (M, siteId) {
    const E = NS.ENGINE, C = NS.CONTENT;
    const layout = [];
    const pads = C.PAD_SETS[C.SITES[siteId].padSet];
    const want = M.required.slice();
    ['solar', 'battery', 'greenhouse', 'shelter', 'ice', 'solar', 'battery'].forEach((t) => { if (M.buildings.includes(t)) want.push(t); });
    want.forEach((type) => {
      const B = C.BUILDINGS[type];
      const order = pads.map((tags, i) => ({ i, s: (B.bonusTag && tags.includes(B.bonusTag) ? 2 : 0) - tags.length * 0.1 })).sort((a, b) => b.s - a.s);
      const spot = order.find((p) => E.canPlace(M.id, siteId, layout, type, p.i).ok);
      if (spot) layout.push({ type, pad: spot.i });
    });
    return layout;
  };

  NS.BootScene = BootScene;
})();
