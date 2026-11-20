/* UI KIT - theme, text, glass panels, chunky buttons, icons, meters, ASTRO's speech bubble,
 * portraits, keyboard focus, voice-over, effects (glow, twinkles, confetti) and mission patches.
 * Art direction: docs/ART-DIRECTION.md. Static shapes are baked into cached textures because live
 * Phaser Graphics are re-tessellated every frame (slow on Chromebooks). */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  NS.CONTENT = window.OUTPOST_CONTENT;
  NS.ENGINE = window.OUTPOST_ENGINE;
  NS.LOGBOOK = window.OUTPOST_LOGBOOK;
  NS.OSDR = window.OUTPOST_OSDR || { studies: [] };
  NS.STORYDATA = window.OUTPOST_STORY;
  let storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }
  NS.save = window.OUTPOST_SAVE.create(storage);

  // ------------------------------------------------------------------ theme
  NS.FONT = '"Nunito","Trebuchet MS","Segoe UI",Arial,sans-serif';
  NS.DISPLAY = '"Fredoka","Nunito","Trebuchet MS",Arial,sans-serif';
  NS.C = {
    ink: 0x241a4f, inkHex: '#241a4f', deep: 0x140d3d, violet: 0x3b1f78, glass: 0x1b1350, edge: 0x8fe3ff,
    paper: 0xfffaf2, cream: 0xfff3e0, creamHex: '#fff7ea', dimHex: '#cfc6ff', slateHex: '#5d5390',
    teal: 0x3fd3c7, tealDark: 0x1fa39a, orange: 0xff8a5c, green: 0x7ee36b, greenDark: 0x3fb052,
    yellow: 0xffd23f, pink: 0xff5fae, gray: 0xb8b3d9, white: 0xffffff, red: 0xff5a5a,
    power: 0xffd23f, air: 0x4fd6ff, food: 0x7ee36b, rad: 0xff7a59, science: 0xb98cff, heart: 0xff5c8a,
  };
  NS.C.navy = NS.C.ink; NS.C.navyHex = NS.C.inkHex; // older names

  NS.text = function (scene, x, y, str, size, color, weight) {
    return scene.add.text(x, y, str, { fontFamily: NS.FONT, fontSize: size + 'px', color: color || NS.C.inkHex, fontStyle: weight || '800' });
  };
  NS.title = function (scene, x, y, str, size, color, stroke) {
    const t = scene.add.text(x, y, str, { fontFamily: NS.DISPLAY, fontSize: size + 'px', color: color || '#ffffff', fontStyle: '600' });
    if (stroke !== false) t.setStroke(stroke || NS.C.inkHex, Math.max(4, Math.round(size / 7)));
    t.setShadow(0, Math.max(2, size / 14), 'rgba(20,10,60,0.55)', 0, true, true);
    return t;
  };

  // bake a drawing into a cached texture once, then reuse it as an image
  NS.bake = function (scene, key, w, h, draw) {
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    }
    return key;
  };

  // ------------------------------------------------------------------ panels
  // dark glass panel (HUD)
  NS.glass = function (scene, x, y, w, h, opts) {
    opts = opts || {};
    const r = opts.r || 18, a = opts.alpha == null ? 0.86 : opts.alpha;
    const key = NS.bake(scene, 'glass:' + w + 'x' + h + ':' + r + ':' + a + ':' + (opts.edge || 0), w + 8, h + 10, (g) => {
      g.fillStyle(0x0b0626, 0.35).fillRoundedRect(4, 8, w, h, r);
      g.fillStyle(NS.C.glass, a).fillRoundedRect(3, 3, w, h, r);
      g.fillStyle(0xffffff, 0.07).fillRoundedRect(3 + 4, 3 + 4, w - 8, Math.min(h * 0.42, 40), Math.max(4, r - 4));
      g.lineStyle(2, opts.edge || NS.C.edge, 0.65).strokeRoundedRect(3, 3, w, h, r);
    });
    return scene.add.image(x - 3, y - 3, key).setOrigin(0, 0);
  };
  // light paper card (dialogue, reports)
  NS.panel = function (scene, x, y, w, h, opts) {
    opts = opts || {};
    const r = opts.r || 22, fill = opts.fill || NS.C.paper, a = opts.alpha == null ? 0.98 : opts.alpha;
    const key = NS.bake(scene, 'panel:' + w + 'x' + h + ':' + r + ':' + fill + ':' + a, w + 10, h + 12, (g) => {
      g.fillStyle(0x0b0626, 0.35).fillRoundedRect(6, 9, w, h, r);
      g.fillStyle(fill, a).fillRoundedRect(3, 3, w, h, r);
      g.lineStyle(4, NS.C.ink, 1).strokeRoundedRect(3, 3, w, h, r);
    });
    return scene.add.image(x - 3, y - 3, key).setOrigin(0, 0);
  };

  // ------------------------------------------------------------------ effects
  function canvasTexture(scene, key, w, h, paint) {
    if (scene.textures.exists(key)) return key;
    const t = scene.textures.createCanvas(key, w, h);
    paint(t.getContext(), w, h);
    t.refresh();
    return key;
  }
  NS.fxTextures = function (scene) {
    canvasTexture(scene, 'fx.glow', 128, 128, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    canvasTexture(scene, 'fx.star', 32, 32, (c, w) => {
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(15, 2, 2, 28); c.fillRect(2, 15, 28, 2);
    });
    canvasTexture(scene, 'fx.dot', 16, 16, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(8, 8, 7, 0, Math.PI * 2); c.fill(); });
    canvasTexture(scene, 'fx.square', 12, 8, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 12, 8); });
  };
  NS.glow = function (scene, x, y, color, size, alpha) {
    NS.fxTextures(scene);
    return scene.add.image(x, y, 'fx.glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setScale((size || 120) / 128).setAlpha(alpha == null ? 0.6 : alpha);
  };
  NS.twinkles = function (scene, n, area, depth) {
    NS.fxTextures(scene);
    area = area || { x: 0, y: 0, w: NS.W, h: NS.H * 0.45 };
    for (let i = 0; i < n; i++) {
      const s = scene.add.image(area.x + Math.random() * area.w, area.y + Math.random() * area.h, 'fx.star')
        .setScale(0.25 + Math.random() * 0.45).setAlpha(0.2).setDepth(depth == null ? -90 : depth).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: s, alpha: { from: 0.1, to: 0.9 }, scale: s.scale * 1.3, duration: 900 + Math.random() * 1800,
        yoyo: true, repeat: -1, delay: Math.random() * 2000, ease: 'Sine.easeInOut' });
    }
  };
  NS.confetti = function (scene, x, y, n) {
    NS.fxTextures(scene);
    const cols = [NS.C.yellow, NS.C.pink, NS.C.teal, NS.C.green, NS.C.orange, NS.C.science];
    for (let i = 0; i < (n || 70); i++) {
      const p = scene.add.image(x, y, i % 2 ? 'fx.square' : 'fx.dot').setTint(cols[i % cols.length]).setDepth(9000).setScale(0.6 + Math.random() * 0.6);
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 380;
      scene.tweens.add({ targets: p, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp * 0.6 + 280, angle: Math.random() * 720,
        alpha: 0, duration: 1400 + Math.random() * 900, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    }
  };
  NS.dust = function (scene, x, y, color) {
    for (let k = 0; k < 10; k++) {
      const c = scene.add.circle(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-8, 12), Phaser.Math.Between(6, 13), color || 0xe0dafa, 0.9).setDepth(y + 1);
      scene.tweens.add({ targets: c, y: c.y - Phaser.Math.Between(20, 50), alpha: 0, scale: 1.6, duration: 700, onComplete: () => c.destroy() });
    }
  };

  // shared animated sky for menu scenes
  NS.skyBackdrop = function (scene) {
    NS.put(scene, 'bg.sky', 0, 0).setDepth(-200);
    NS.twinkles(scene, 40, { x: 0, y: 0, w: NS.W, h: NS.H * 0.8 });
  };

  // ------------------------------------------------------------------ sprites
  NS.put = function (scene, key, x, y) {
    const m = NS.meta(key);
    const img = scene.add.image(x, y, key);
    if (m.width) img.setScale(m.width / img.width);
    else if (m.scale) img.setScale(m.scale);
    if (m.origin) img.setOrigin(m.origin[0], m.origin[1]);
    return img;
  };
  NS.retexture = function (img, key) {
    const m = NS.meta(key);
    img.setTexture(key);
    if (m.width) img.setScale(m.width / img.width);
    else if (m.scale) img.setScale(m.scale);
    return img;
  };
  NS.portrait = function (scene, who, expr, x, y, size) {
    const img = scene.add.image(x, y, 'char.' + who + '.' + (expr || 'happy'));
    img.setScale((size || 160) / img.width);
    img.setExpr = (e) => { img.setTexture('char.' + who + '.' + e); return img; };
    return img;
  };

  NS.makeAstronaut = function (scene, name, x, y) {
    const key = 'astro.' + name;
    const m = NS.meta(key);
    const s = scene.add.sprite(x, y, key).setOrigin(m.origin[0], m.origin[1]).setScale(m.scale).setDepth(y);
    s.play(key + '.idle');
    s.anims.setProgress(Math.random());
    s.walkTo = function (tx, ty, done) {
      if (s._tw) s._tw.stop();
      const dist = Phaser.Math.Distance.Between(s.x, s.y, tx, ty);
      if (dist < 3) { s.play(key + '.idle', true); if (done) done(); return; }
      if (Math.abs(tx - s.x) > 2) s.setFlipX(tx < s.x);
      s.play(key + '.walk', true);
      s._tw = scene.tweens.add({
        targets: s, x: tx, y: ty, duration: (dist / NS.ASSETS.walkSpeed) * 1000, ease: 'Linear',
        onUpdate: () => s.setDepth(s.y),
        onComplete: () => { s._tw = null; s.play(key + '.idle', true); if (done) done(); },
      });
    };
    return s;
  };

  // little speech bubble with an icon over a character (crew reactions)
  NS.emote = function (scene, x, y, icon, color) {
    const c = scene.add.container(x, y).setDepth(4000);
    const key = NS.bake(scene, 'emote', 54, 58, (g) => {
      g.fillStyle(NS.C.white, 1).fillRoundedRect(2, 2, 48, 42, 16);
      g.fillTriangle(18, 42, 32, 42, 22, 54);
      g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(2, 2, 48, 42, 16);
    });
    c.add(scene.add.image(0, 0, key).setOrigin(0.5, 1));
    c.add(NS.icon(scene, icon, 0, -33, 26, color ? { color } : undefined));
    c.setScale(0);
    scene.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: c, y: y - 14, alpha: 0, delay: 1900, duration: 400, onComplete: () => c.destroy() });
    return c;
  };

  NS.dashedEllipse = function (g, cx, cy, rx, ry, phase, N, fill) {
    N = N || 30; fill = fill || 0.6; phase = phase || 0;
    const step = (Math.PI * 2) / N;
    for (let i = 0; i < N; i++) {
      const a0 = i * step + phase, a1 = a0 + step * fill;
      g.beginPath();
      for (let k = 0; k <= 4; k++) {
        const a = a0 + ((a1 - a0) * k) / 4;
        const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
  };

  // ------------------------------------------------------------------ voice-over (optional, off by default)
  NS.voice = {
    supported: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
    enabled() { return this.supported && NS.save.data.settings.voice; },
    say(text, force) {
      if ((!this.enabled() && !force) || !this.supported || !text) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/[·★☀☾⚡♥]/g, ' '));
        u.rate = NS.save.data.settings.rate || 0.95; u.pitch = 1.1; u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch (e) { /* optional */ }
    },
    stop() { try { if (this.supported) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
  };
  NS.sfx = (name, arg) => NS.audio && NS.audio.sfx(name, arg);

  // ------------------------------------------------------------------ keyboard focus
  NS.Focus = class {
    constructor(scene) {
      this.scene = scene; this.items = []; this.index = -1; this.visible = false;
      this.g = scene.add.graphics().setDepth(9500);
      const kb = scene.input.keyboard;
      if (!kb) return;
      this._onKey = (ev) => this.key(ev);
      kb.on('keydown', this._onKey);
      scene.input.on('pointerdown', () => { this.visible = false; this.draw(); });
      scene.events.once('shutdown', () => kb.off('keydown', this._onKey));
    }
    set(items) {
      const cur = this.items[this.index];
      this.items = items.filter(Boolean);
      const keep = cur ? this.items.findIndex((i) => i.id && i.id === cur.id) : -1;
      this.index = keep >= 0 ? keep : Math.min(Math.max(this.index, 0), this.items.length - 1);
      this.draw();
    }
    usable(i) { const it = this.items[i]; return it && (!it.enabled || it.enabled()); }
    move(d) {
      if (!this.items.length) return;
      let i = this.index;
      for (let n = 0; n < this.items.length; n++) { i = (i + d + this.items.length) % this.items.length; if (this.usable(i)) break; }
      this.index = i;
    }
    key(ev) {
      const k = ev.key;
      if (k === 'Tab') { if (ev.preventDefault) ev.preventDefault(); this.visible = true; this.move(ev.shiftKey ? -1 : 1); }
      else if (k === 'ArrowDown') { this.visible = true; this.move(1); }
      else if (k === 'ArrowUp') { this.visible = true; this.move(-1); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const it = this.items[this.index], fn = it && (k === 'ArrowLeft' ? it.left : it.right);
        this.visible = true;
        if (fn) fn(); else this.move(k === 'ArrowLeft' ? -1 : 1);
      } else if (k === 'Enter' || k === ' ') {
        const it = this.items[this.index];
        if (this.visible && it && this.usable(this.index)) { if (ev.preventDefault) ev.preventDefault(); if (it.activate) it.activate(); }
        else if (!this.visible) { this.visible = true; if (!this.usable(this.index)) this.move(1); }
      } else return;
      this.draw();
    }
    draw() {
      const g = this.g; g.clear();
      const it = this.items[this.index];
      if (!this.visible || !it) return;
      const b = typeof it.bounds === 'function' ? it.bounds() : it;
      g.lineStyle(6, 0xffd23f, 1).strokeRoundedRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12, 14);
      g.lineStyle(2, NS.C.ink, 1).strokeRoundedRect(b.x - 9, b.y - 9, b.w + 18, b.h + 18, 16);
    }
  };

  // ------------------------------------------------------------------ icons (vector, baked once)
  NS.ICON_COLORS = {
    energy: NS.C.power, power: NS.C.power, air: NS.C.air, food: NS.C.food, shield: NS.C.rad, rad: NS.C.rad,
    health: NS.C.heart, science: NS.C.science, sun: NS.C.yellow, night: 0xa99cff, storm: NS.C.rad, dust: 0xffb37a,
    crate: 0xe5a96a, flag: NS.C.orange, radio: NS.C.teal, crew: NS.C.teal, lock: 0xb8b3d9, star: NS.C.yellow,
    water: NS.C.air, book: NS.C.yellow, speaker: NS.C.cream, rewind: NS.C.cream, music: NS.C.pink, disc: 0xc9ecf0,
    live: NS.C.red, planet: 0xb7b1e6,
  };
  NS.icon = function (scene, kind, x, y, size, opts) {
    const s = size || 28;
    const key = 'icon:' + kind + ':' + s + ':' + JSON.stringify(opts || {});
    if (!scene.textures.exists(key)) {
      const pad = Math.ceil(s * 0.2) + 4, dim = s + pad * 2;
      const g = drawIcon(scene, kind, dim / 2, dim / 2, s, opts);
      g.generateTexture(key, dim, dim);
      g.destroy();
    }
    return scene.add.image(x, y, key);
  };
  function drawIcon(scene, kind, x, y, size, opts) {
    const s = size || 28, g = scene.add.graphics();
    g.translateCanvas(x, y);
    const col = (opts && opts.color) || NS.ICON_COLORS[kind] || 0xffffff;
    const ink = NS.C.ink, h = s / 2;
    g.lineStyle(Math.max(2, s / 12), ink, 1);
    g.fillStyle(col, 1);
    const V = (p) => new Phaser.Math.Vector2(p[0] * h, p[1] * h);
    const poly = (pts) => { g.fillPoints(pts.map(V), true); g.strokePoints(pts.map(V), true); };
    switch (kind) {
      case 'energy': case 'power': poly([[0.15, -1], [-0.6, 0.15], [-0.05, 0.15], [-0.2, 1], [0.6, -0.2], [0.05, -0.2], [0.3, -1]]); break;
      case 'air':
        g.fillCircle(-0.3 * h, 0.25 * h, 0.5 * h).strokeCircle(-0.3 * h, 0.25 * h, 0.5 * h);
        g.fillCircle(0.45 * h, -0.35 * h, 0.38 * h).strokeCircle(0.45 * h, -0.35 * h, 0.38 * h);
        g.fillStyle(0xffffff, 0.9).fillCircle(-0.45 * h, 0.05 * h, 0.13 * h); break;
      case 'water': poly([[0, -1], [0.55, -0.05], [0.62, 0.35], [0.4, 0.8], [0, 0.95], [-0.4, 0.8], [-0.62, 0.35], [-0.55, -0.05]]); break;
      case 'food':
        g.fillCircle(0, 0.15 * h, 0.75 * h).strokeCircle(0, 0.15 * h, 0.75 * h);
        g.fillStyle(NS.C.greenDark, 1);
        g.fillEllipse(0.25 * h, -0.65 * h, 0.55 * h, 0.3 * h).strokeEllipse(0.25 * h, -0.65 * h, 0.55 * h, 0.3 * h);
        g.fillStyle(0xffffff, 0.7).fillCircle(-0.3 * h, -0.1 * h, 0.15 * h); break;
      case 'shield': case 'rad': poly([[0, -1], [0.8, -0.65], [0.7, 0.25], [0, 1], [-0.7, 0.25], [-0.8, -0.65]]); break;
      case 'health':
        g.fillCircle(-0.38 * h, -0.25 * h, 0.45 * h).fillCircle(0.38 * h, -0.25 * h, 0.45 * h);
        g.fillTriangle(-0.82 * h, -0.05 * h, 0.82 * h, -0.05 * h, 0, 0.95 * h);
        g.strokeCircle(-0.38 * h, -0.25 * h, 0.45 * h).strokeCircle(0.38 * h, -0.25 * h, 0.45 * h);
        g.fillStyle(0xffffff, 0.75).fillCircle(-0.45 * h, -0.35 * h, 0.13 * h); break;
      case 'science':
        poly([[-0.25, -1], [0.25, -1], [0.25, -0.25], [0.8, 0.85], [-0.8, 0.85], [-0.25, -0.25]]);
        g.fillStyle(0xffffff, 0.8).fillCircle(-0.1 * h, 0.45 * h, 0.12 * h).fillCircle(0.22 * h, 0.6 * h, 0.08 * h); break;
      case 'sun':
        for (let i = 0; i < 8; i++) { // bright rays (visible on dark panels too)
          const a = (i * Math.PI) / 4, a1 = a - 0.3, a2 = a + 0.3;
          const tri = [[Math.cos(a1) * 0.5, Math.sin(a1) * 0.5], [Math.cos(a) * 1.05, Math.sin(a) * 1.05], [Math.cos(a2) * 0.5, Math.sin(a2) * 0.5]];
          g.fillStyle(0xffa63d, 1); g.fillPoints(tri.map(V), true);
          if (s >= 28) { g.lineStyle(Math.max(1.5, s / 20), ink, 1); g.strokePoints(tri.map(V), true); }
        }
        g.lineStyle(Math.max(1.5, s / 14), ink, 1);
        g.fillStyle(col, 1).fillCircle(0, 0, 0.56 * h).strokeCircle(0, 0, 0.56 * h);
        g.fillStyle(0xffffff, 0.6).fillCircle(-0.15 * h, -0.15 * h, 0.15 * h); break;
      case 'night':
        g.fillCircle(0, 0, 0.8 * h).strokeCircle(0, 0, 0.8 * h);
        g.fillStyle(0x221a52, 1).fillCircle(0.38 * h, -0.3 * h, 0.62 * h); break;
      case 'storm':
        g.fillCircle(0, 0, 0.55 * h).strokeCircle(0, 0, 0.55 * h);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + 0.3;
          g.fillTriangle(Math.cos(a - 0.25) * 0.55 * h, Math.sin(a - 0.25) * 0.55 * h, Math.cos(a + 0.25) * 0.55 * h, Math.sin(a + 0.25) * 0.55 * h, Math.cos(a) * h, Math.sin(a) * h);
        }
        g.fillStyle(ink, 1).fillRect(-0.08 * h, -0.35 * h, 0.16 * h, 0.4 * h).fillCircle(0, 0.25 * h, 0.09 * h); break;
      case 'dust':
        [[-0.4, 0.1, 0.45], [0.2, -0.2, 0.55], [0.45, 0.35, 0.35]].forEach(([cx, cy, r]) => g.fillCircle(cx * h, cy * h, r * h).strokeCircle(cx * h, cy * h, r * h)); break;
      case 'crate':
        g.fillRect(-0.8 * h, -0.7 * h, 1.6 * h, 1.4 * h).strokeRect(-0.8 * h, -0.7 * h, 1.6 * h, 1.4 * h);
        g.lineBetween(-0.8 * h, -0.7 * h, 0.8 * h, 0.7 * h).lineBetween(0.8 * h, -0.7 * h, -0.8 * h, 0.7 * h); break;
      case 'flag': g.lineBetween(-0.6 * h, h, -0.6 * h, -h); poly([[-0.6, -1], [0.85, -0.6], [-0.6, -0.15]]); break;
      case 'radio':
        g.fillCircle(0, 0.2 * h, 0.25 * h).strokeCircle(0, 0.2 * h, 0.25 * h);
        g.beginPath().arc(0, 0.2 * h, 0.6 * h, -2.5, -0.64).strokePath();
        g.beginPath().arc(0, 0.2 * h, 0.95 * h, -2.5, -0.64).strokePath(); break;
      case 'crew':
        g.fillCircle(0, -0.35 * h, 0.5 * h).strokeCircle(0, -0.35 * h, 0.5 * h);
        g.fillRoundedRect(-0.6 * h, 0.15 * h, 1.2 * h, 0.85 * h, 0.3 * h).strokeRoundedRect(-0.6 * h, 0.15 * h, 1.2 * h, 0.85 * h, 0.3 * h); break;
      case 'lock':
        g.strokeCircle(0, -0.25 * h, 0.42 * h);
        g.fillRoundedRect(-0.65 * h, -0.2 * h, 1.3 * h, 1.1 * h, 0.2 * h).strokeRoundedRect(-0.65 * h, -0.2 * h, 1.3 * h, 1.1 * h, 0.2 * h); break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.45 : 1; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        poly(pts); break;
      }
      case 'speaker':
        poly([[-0.9, -0.3], [-0.4, -0.3], [0.15, -0.85], [0.15, 0.85], [-0.4, 0.3], [-0.9, 0.3]]);
        if (!(opts && opts.muted)) { g.beginPath().arc(0.3 * h, 0, 0.4 * h, -0.9, 0.9).strokePath(); g.beginPath().arc(0.3 * h, 0, 0.7 * h, -0.9, 0.9).strokePath(); }
        else g.lineBetween(0.4 * h, -0.4 * h, 0.95 * h, 0.4 * h).lineBetween(0.95 * h, -0.4 * h, 0.4 * h, 0.4 * h);
        break;
      case 'music':
        g.fillCircle(-0.45 * h, 0.55 * h, 0.3 * h).strokeCircle(-0.45 * h, 0.55 * h, 0.3 * h);
        g.fillCircle(0.5 * h, 0.35 * h, 0.3 * h).strokeCircle(0.5 * h, 0.35 * h, 0.3 * h);
        g.lineBetween(-0.17 * h, 0.55 * h, -0.17 * h, -0.8 * h).lineBetween(0.78 * h, 0.35 * h, 0.78 * h, -1 * h).lineBetween(-0.17 * h, -0.8 * h, 0.78 * h, -1 * h);
        if (opts && opts.muted) g.lineStyle(Math.max(2, s / 10), NS.C.red, 1).lineBetween(-0.9 * h, -0.9 * h, 0.9 * h, 0.9 * h);
        break;
      case 'book':
        g.fillRoundedRect(-0.85 * h, -0.75 * h, 1.7 * h, 1.5 * h, 0.15 * h).strokeRoundedRect(-0.85 * h, -0.75 * h, 1.7 * h, 1.5 * h, 0.15 * h);
        g.lineBetween(0, -0.75 * h, 0, 0.75 * h); break;
      case 'rewind': poly([[0.9, -0.7], [0.9, 0.7], [0.05, 0], [0.05, 0.7], [-0.85, 0], [0.05, -0.7], [0.05, 0]]); break;
      case 'live': g.fillCircle(0, 0, 0.55 * h).strokeCircle(0, 0, 0.55 * h); break;
      case 'planet':
        g.fillCircle(0, 0, 0.7 * h).strokeCircle(0, 0, 0.7 * h);
        g.lineStyle(Math.max(2, s / 12), ink, 1).strokeEllipse(0, 0, 2 * h, 0.6 * h); break;
      case 'disc': g.fillCircle(0, 0, h).strokeCircle(0, 0, h); break;
      default: g.fillCircle(0, 0, 0.8 * h).strokeCircle(0, 0, 0.8 * h);
    }
    return g;
  }

  // ------------------------------------------------------------------ chunky button
  NS.button = function (scene, x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const color = opts.color || NS.C.teal;
    const c = scene.add.container(x, y);
    let enabled = true, hover = false, pressed = false;
    const r = Math.min(h / 2.1, 24);
    const stateKey = () => 'btn2:' + w + 'x' + h + ':' + color + ':' + (!enabled ? 'off' : hover ? 'hover' : 'on') + (pressed ? ':p' : '') + (opts.selected ? ':sel' : '');
    const bake = (key) => NS.bake(scene, key, w + 6, h + 12, (g) => {
      const base = opts.selected ? NS.C.teal : color;
      const fill = !enabled ? 0x8f88b8 : hover ? Phaser.Display.Color.ValueToColor(base).lighten(10).color : base;
      const off = pressed ? 5 : 0, ox = 3, oy = 3;
      g.fillStyle(NS.C.ink, 1).fillRoundedRect(ox, oy + 6, w, h, r);
      g.fillStyle(fill, 1).fillRoundedRect(ox, oy + off, w, h, r);
      g.fillStyle(0xffffff, enabled ? 0.28 : 0.1).fillRoundedRect(ox + 6, oy + off + 4, w - 12, Math.max(6, h * 0.32), Math.max(3, r - 6));
      g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(ox, oy + off, w, h, r);
      if (opts.selected) g.lineStyle(3, 0xffffff, 1).strokeRoundedRect(ox + 5, oy + 5 + off, w - 10, h - 10, Math.max(3, r - 5));
    });
    const g = scene.add.image(-w / 2 - 3, -h / 2 - 3, '__DEFAULT').setOrigin(0, 0);
    const draw = () => { const k = stateKey(); bake(k); g.setTexture(k); };
    const size = opts.size || Math.round(Math.min(h * 0.42, 26));
    const t = scene.add.text(0, 0, label, { fontFamily: NS.DISPLAY, fontSize: size + 'px', color: opts.textColor || NS.C.inkHex, fontStyle: '600' }).setOrigin(0.5);
    const parts = [g, t];
    let ic = null;
    if (opts.icon) { ic = NS.icon(scene, opts.icon, 0, 0, Math.min(h * 0.55, 32), opts.iconOpts); parts.push(ic); }
    const layout = () => {
      const dy = pressed ? 5 : 0;
      if (ic && label) { const total = 30 + 8 + t.width; ic.x = -total / 2 + 15; t.x = ic.x + 15 + 8 + t.width / 2; }
      else if (ic) ic.x = 0;
      t.y = dy - 1; if (ic) ic.y = dy;
    };
    c.add(parts);
    layout(); draw();
    c.setSize(w, h + 8).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { hover = true; draw(); if (enabled) NS.sfx('hover'); });
    c.on('pointerout', () => { hover = false; pressed = false; layout(); draw(); });
    c.on('pointerdown', () => { if (!enabled) { NS.sfx('error'); return; } pressed = true; layout(); draw(); });
    c.on('pointerup', () => {
      const was = pressed; pressed = false; layout(); draw();
      if (enabled && was) { NS.sfx(opts.sound || 'click'); scene.tweens.add({ targets: c, scaleX: 1.06, scaleY: 0.94, yoyo: true, duration: 80 }); if (onClick) onClick(); }
    });
    c.setEnabled = (on) => { enabled = on; t.setAlpha(on ? 1 : 0.6); if (ic) ic.setAlpha(on ? 1 : 0.5); draw(); return c; };
    c.isEnabled = () => enabled;
    c.setLabel = (s) => { t.setText(s); layout(); return c; };
    c.setSelected = (on) => { if (opts.selected !== on) { opts.selected = on; draw(); } return c; };
    c.press = () => { if (enabled && onClick) { NS.sfx(opts.sound || 'click'); onClick(); } };
    c.pulse = () => scene.tweens.add({ targets: c, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
    c.focusItem = (id) => ({ id, bounds: () => ({ x: c.x - w / 2, y: c.y - h / 2, w, h }), activate: () => c.press(), enabled: () => enabled && c.visible });
    return c;
  };

  // ------------------------------------------------------------------ resource meter (HUD)
  NS.meter = function (scene, x, y, w, kind, label) {
    const c = scene.add.container(x, y);
    const h = 66;
    c.add(NS.glass(scene, 0, 0, w, h, { r: 16 }));
    const badgeKey = NS.bake(scene, 'badge:' + kind, 56, 56, (g) => {
      g.fillStyle(NS.ICON_COLORS[kind], 0.25).fillCircle(28, 28, 26);
      g.lineStyle(2, NS.ICON_COLORS[kind], 0.9).strokeCircle(28, 28, 25);
    });
    c.add(scene.add.image(34, h / 2, badgeKey));
    const ic = NS.icon(scene, kind, 34, h / 2, 30);
    c.add(ic);
    const lab = NS.text(scene, 68, 8, label, 13, NS.C.dimHex);
    const val = scene.add.text(68, 22, '0', { fontFamily: NS.DISPLAY, fontSize: '26px', color: '#ffffff', fontStyle: '600' });
    const bar = scene.add.graphics();
    c.add([lab, val, bar]);
    let shown = 0, warnTween = null;
    const m = {
      c, kind, value: 0,
      set(value, max, warn, suffix) {
        m.value = value;
        const fromV = shown;
        scene.tweens.addCounter({ from: fromV, to: value, duration: 450, onUpdate: (tw) => { shown = Math.round(tw.getValue()); val.setText(shown + (suffix || '')); } });
        if (fromV === value) val.setText(value + (suffix || ''));
        bar.clear();
        if (max) {
          const bw = w - 82, segs = Math.min(max, 16), gap = 3, sw = (bw - gap * (segs - 1)) / segs;
          for (let i = 0; i < segs; i++) {
            const filled = (i + 1) / segs <= value / max + 1e-6;
            bar.fillStyle(filled ? (warn ? NS.C.red : NS.ICON_COLORS[kind]) : 0x3a2f7a, 1).fillRoundedRect(68 + i * (sw + gap), 52, sw, 7, 3);
          }
        }
        val.setColor(warn ? '#ff9a9a' : '#ffffff');
        if (warn && !warnTween) warnTween = scene.tweens.add({ targets: ic, scale: 1.25, yoyo: true, repeat: -1, duration: 380 });
        if (!warn && warnTween) { warnTween.stop(); warnTween = null; ic.setScale(1); }
      },
      pulse(delta) {
        if (!delta) return;
        const t = scene.add.text(x + w / 2 + 20, y + 30, (delta > 0 ? '+' : '') + delta, { fontFamily: NS.DISPLAY, fontSize: '26px', color: delta > 0 ? '#9dff8a' : '#ff8a8a', fontStyle: '600' })
          .setOrigin(0.5).setDepth(6000).setStroke(NS.C.inkHex, 5);
        scene.tweens.add({ targets: t, y: y - 10, alpha: 0, duration: 1400, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
        scene.tweens.add({ targets: c, scaleX: 1.05, scaleY: 1.05, yoyo: true, duration: 140 });
      },
    };
    return m;
  };

  NS.starsRow = function (scene, x, y, n, size, gap) {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(NS.icon(scene, 'star', x + (i - 1) * (gap || size * 1.2), y, size, { color: i < n ? NS.C.yellow : 0x6f669e }));
    return out;
  };

  // ------------------------------------------------------------------ ASTRO speech bubble
  NS.createGuide = function (scene, x, y, w, opts) {
    opts = opts || {};
    const D = opts.depth || 3000, H = 92;
    const bubbleKey = NS.bake(scene, 'bubble:' + w, w + 10, H + 14, (g) => {
      g.fillStyle(0x0b0626, 0.35).fillRoundedRect(110, 10, w - 110, H, 22);
      g.fillStyle(NS.C.paper, 1).fillRoundedRect(106, 3, w - 110, H, 22);
      g.fillTriangle(108, 34, 108, 58, 86, 46);
      g.lineStyle(4, NS.C.ink, 1).strokeRoundedRect(106, 3, w - 110, H, 22);
      g.lineBetween(108, 34, 87, 46).lineBetween(87, 46, 108, 58);
      g.fillStyle(NS.C.paper, 1).fillRect(105, 37, 8, 18);
      // portrait ring
      g.fillStyle(0x0b0626, 0.35).fillCircle(50, 54, 46);
      g.fillStyle(0x3b2a8f, 1).fillCircle(48, 48, 46);
      g.lineStyle(4, NS.C.ink, 1).strokeCircle(48, 48, 46);
      g.lineStyle(3, NS.C.edge, 0.9).strokeCircle(48, 48, 40);
    });
    const bg = scene.add.image(x - 3, y - 3, bubbleKey).setOrigin(0, 0).setDepth(D);
    const face = scene.add.image(x + 45, y + 47, 'char.astro.happy').setDepth(D + 1);
    face.setScale(104 / face.width);
    const faceBase = face.scale;
    const tagKey = NS.bake(scene, 'tag:astro', 84, 30, (g) => {
      g.fillStyle(NS.C.teal, 1).fillRoundedRect(3, 3, 76, 22, 11);
      g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(3, 3, 76, 22, 11);
    });
    const tag = scene.add.image(x + 124, y - 14, tagKey).setOrigin(0, 0).setDepth(D + 2);
    const tagT = scene.add.text(x + 165, y - 1, 'ASTRO', { fontFamily: NS.DISPLAY, fontSize: '14px', color: NS.C.inkHex, fontStyle: '600' }).setOrigin(0.5).setDepth(D + 3);
    const body = NS.text(scene, x + 126, y + 12, '', 19, NS.C.inkHex, '700').setWordWrapWidth(w - 186).setDepth(D + 2).setLineSpacing(2);
    const spk = NS.icon(scene, 'speaker', x + w - 30, y + 24, 22).setDepth(D + 3).setInteractive({ useHandCursor: true });
    scene.tweens.add({ targets: face, y: face.y - 4, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.easeInOut' });
    const api = {
      objects: [bg, face, tag, tagT, body, spk], last: '',
      say(text, o) {
        o = o || {};
        face.setTexture('char.astro.' + (o.expr || 'talk'));
        face.setScale(104 / face.width);
        scene.tweens.add({ targets: face, scale: faceBase * 1.12, yoyo: true, duration: 140 });
        if (NS.voice.enabled() && !o.silent) NS.voice.say(text);
        if (api._ev) api._ev.remove(false);
        for (const size of [19, 17, 15, 14]) { body.setFontSize(size + 'px'); body.setText(text); if (body.height <= 70) break; }
        body.setText('');
        let i = 0;
        api._ev = scene.time.addEvent({
          delay: 16, repeat: Math.max(0, text.length - 1),
          callback: () => {
            i++; body.setText(text.slice(0, i));
            if (i % 3 === 0) NS.sfx('blip');
            if (i >= text.length) { face.setTexture('char.astro.' + (o.end || o.expr || 'happy')); face.setScale(104 / face.width); }
          },
        });
        api.last = text;
      },
    };
    spk.on('pointerdown', () => NS.voice.say(api.last, true));
    return api;
  };

  // ------------------------------------------------------------------ toast
  NS.toast = function (scene, str, color) {
    const t = scene.add.text(0, 0, str, { fontFamily: NS.DISPLAY, fontSize: '22px', color: NS.C.inkHex, fontStyle: '600' }).setOrigin(0.5);
    const w = Math.ceil(t.width + 56), h = 48;
    const key = NS.bake(scene, 'toast:' + w + ':' + (color || NS.C.green), w + 6, h + 10, (g) => {
      g.fillStyle(NS.C.ink, 1).fillRoundedRect(3, 9, w, h, 24);
      g.fillStyle(color || NS.C.green, 1).fillRoundedRect(3, 3, w, h, 24);
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(10, 7, w - 14, 14, 7);
      g.lineStyle(3, NS.C.ink, 1).strokeRoundedRect(3, 3, w, h, 24);
    });
    const c = scene.add.container(NS.W / 2, -60).setDepth(7000);
    c.add([scene.add.image(0, 0, key), t]);
    scene.tweens.add({
      targets: c, y: 230, duration: 380, ease: 'Back.easeOut',
      onComplete: () => scene.time.delayedCall(1800, () => scene.tweens.add({ targets: c, y: -60, alpha: 0, duration: 280, onComplete: () => c.destroy() })),
    });
  };

  // ------------------------------------------------------------------ mission patch
  NS.patch = function (scene, x, y, missionIndex, size, earned) {
    const M = NS.CONTENT.MISSIONS[missionIndex];
    const key = 'patch:' + M.id + ':' + (earned ? 1 : 0);
    const S = 200;
    NS.bake(scene, key, S, S + 8, (g) => {
      const col = earned ? M.patch.color : 0x5c548c;
      g.fillStyle(NS.C.ink, 1).fillCircle(S / 2, S / 2 + 4, 96);
      g.fillStyle(col, 1).fillCircle(S / 2, S / 2, 96);
      g.fillStyle(earned ? 0x1d1452 : 0x2b2560, 1).fillCircle(S / 2, S / 2, 74);
      g.lineStyle(5, NS.C.ink, 1).strokeCircle(S / 2, S / 2, 96).strokeCircle(S / 2, S / 2, 74);
      for (let i = 0; i < 12; i++) {
        const a2 = (i / 12) * Math.PI * 2;
        g.fillStyle(0xffffff, earned ? 0.85 : 0.3).fillCircle(S / 2 + Math.cos(a2) * 85, S / 2 + Math.sin(a2) * 85, 3);
      }
      g.fillStyle(M.body === 'mars' ? 0xe58a5a : 0xb7b1e6, 1).fillCircle(S / 2, S / 2 + 46, 40);
    });
    const c = scene.add.container(x, y);
    c.add(scene.add.image(0, 0, key));
    c.add(NS.icon(scene, M.patch.icon, 0, -12, 64, earned ? undefined : { color: 0x8f88b8 }));
    c.setScale((size || 120) / S);
    return c;
  };
})();
