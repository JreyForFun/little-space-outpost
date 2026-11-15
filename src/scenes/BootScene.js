/* Loads everything listed in assets.js, builds animations, then starts the first scene. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
      const { W, H } = NS;
      this.cameras.main.setBackgroundColor('#141a3d');
      const g = this.add.graphics();
      const label = NS.text(this, W / 2, H / 2 - 40, 'Little Space Outpost', 34, '#fff0dc').setOrigin(0.5);
      const sub = NS.text(this, W / 2, H / 2 + 36, 'Loading…', 16, '#aab0c8').setOrigin(0.5);
      this.load.on('progress', (p) => {
        g.clear();
        g.fillStyle(0x222a4d, 1).fillRoundedRect(W / 2 - 160, H / 2, 320, 18, 9);
        g.fillStyle(0x54c8c6, 1).fillRoundedRect(W / 2 - 158, H / 2 + 2, Math.max(12, 316 * p), 14, 7);
        sub.setText('Loading… ' + Math.round(p * 100) + '%');
      });
      this.load.on('loaderror', (f) => { sub.setText('Could not load ' + f.src + ' (serve this folder over http, not file://)'); });

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
      // ?scene=build or ?scene=mission jumps ahead (handy for testing)
      const q = new URLSearchParams(location.search).get('scene');
      if (q === 'build') { NS.state.site = NS.AREAS[0]; this.scene.start('Build'); }
      else if (q === 'mission') {
        NS.state.site = NS.AREAS[0];
        NS.BUILD_ORDER.forEach((id) => {
          NS.state.built[id] = true;
          NS.state.res[NS.BUILDINGS[id].grants] = true;
        });
        this.scene.start('Mission');
      }
      else this.scene.start('Explore');
    }
  }
  NS.BootScene = BootScene;
})();
