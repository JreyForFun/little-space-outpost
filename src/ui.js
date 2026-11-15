/* Shared helpers: sprites from the asset list, astronauts, ASTRO's speech bubble, buttons, chips, toasts. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  NS.FONT = '"Nunito","Trebuchet MS","Segoe UI",Helvetica,Arial,sans-serif';
  NS.C = {
    navy: 0x222a4d, navyHex: '#222a4d', slateHex: '#5d6385',
    cream: 0xfff0dc, creamHex: '#fff0dc', paper: 0xfff8ea,
    teal: 0x54c8c6, tealDark: 0x2a8f8f, orange: 0xf27f5c, green: 0xa6e590, greenDark: 0x4aa84a,
    yellow: 0xffd166, gray: 0xdcdfe8,
  };

  // ------------------------------------------------------------------ sprites
  // Add an image by asset key, sized/anchored from the asset list.
  NS.put = function (scene, key, x, y) {
    const m = NS.meta(key);
    const img = scene.add.image(x, y, key);
    if (m.width) img.setScale(m.width / img.width);
    else if (m.scale) img.setScale(m.scale);
    if (m.origin) img.setOrigin(m.origin[0], m.origin[1]);
    return img;
  };
  // Swap an image to another asset key keeping the same placement rules.
  NS.retexture = function (img, key) {
    const m = NS.meta(key);
    img.setTexture(key);
    if (m.width) img.setScale(m.width / img.width);
    else if (m.scale) img.setScale(m.scale);
    return img;
  };

  // ---------------------------------------------------------------- astronauts
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

  // --------------------------------------------------------------- primitives
  NS.panel = function (scene, x, y, w, h, opts) {
    opts = opts || {};
    const g = scene.add.graphics();
    g.fillStyle(NS.C.navy, 0.28).fillRoundedRect(x + 3, y + 6, w, h, opts.r || 22); // soft drop shadow
    g.fillStyle(opts.fill || NS.C.paper, opts.alpha == null ? 0.97 : opts.alpha).fillRoundedRect(x, y, w, h, opts.r || 22);
    g.lineStyle(4, NS.C.navy, 1).strokeRoundedRect(x, y, w, h, opts.r || 22);
    return g;
  };

  NS.text = function (scene, x, y, str, size, color, weight) {
    return scene.add.text(x, y, str, {
      fontFamily: NS.FONT, fontSize: size + 'px', color: color || NS.C.navyHex, fontStyle: weight || '800',
    });
  };

  // dashed ellipse ring; phase makes the dashes travel
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

  // ------------------------------------------------------------------ buttons
  // Button from art (the text is baked into the sprite).
  NS.imgButton = function (scene, key, x, y, onClick) {
    const img = NS.put(scene, key, x, y);
    img._base = img.scaleX;
    img._enabled = true;
    img.setInteractive({ useHandCursor: true });
    img.on('pointerover', () => { if (img._enabled) img.setScale(img._base * 1.035); });
    img.on('pointerout', () => { img.setScale(img._base); });
    img.on('pointerdown', () => { if (img._enabled) img.setScale(img._base * 0.97); });
    img.on('pointerup', () => {
      img.setScale(img._base * (img._enabled ? 1.035 : 1));
      if (img._enabled && onClick) onClick();
    });
    // swap the art (e.g. Activate greenhouse <-> Need resources); resizes from the asset list
    img.setKey = (k) => { NS.retexture(img, k); img._base = img.scaleX; return img; };
    img.setEnabled = (on) => { img._enabled = on; return img; };
    return img;
  };

  // Drawn button for labels the art kit doesn't cover (e.g. "Start building").
  NS.textButton = function (scene, x, y, w, h, label, onClick, color) {
    color = color || NS.C.teal;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const draw = (pressed, hover) => {
      g.clear();
      g.fillStyle(NS.C.navy, 1).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2.4);
      g.fillStyle(hover ? 0x7adfdc : color, 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? 5 : 0), w, h, h / 2.4);
      g.lineStyle(4, NS.C.navy, 1).strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 5 : 0), w, h, h / 2.4);
    };
    draw(false, false);
    const t = NS.text(scene, 0, 0, label, Math.round(h * 0.42)).setOrigin(0.5);
    c.add([g, t]);
    // Keep a generous invisible target so the button is easier to tap.
    c.setSize(w + 16, h + 24).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(false, true));
    c.on('pointerout', () => { draw(false, false); t.y = 0; });
    c.on('pointerdown', () => { draw(true, true); t.y = 5; });
    c.on('pointerup', () => { draw(false, true); t.y = 0; if (onClick) onClick(); });
    return c;
  };

  // --------------------------------------------------------------- ASTRO guide
  // Round portrait + speech bubble with a typewriter effect.
  NS.createGuide = function (scene, x, y, w) {
    w = w || 600;
    const D = 3000;
    const g = scene.add.graphics().setDepth(D);
    g.fillStyle(NS.C.navy, 0.28).fillRoundedRect(x + 112, y + 6, w - 112, 80, 20);
    g.fillStyle(NS.C.paper, 0.98).fillRoundedRect(x + 108, y, w - 112, 80, 20);
    g.lineStyle(4, NS.C.navy, 1).strokeRoundedRect(x + 108, y, w - 112, 80, 20);
    g.fillStyle(NS.C.paper, 1).fillTriangle(x + 112, y + 28, x + 112, y + 52, x + 92, y + 42);
    g.lineStyle(4, NS.C.navy, 1).lineBetween(x + 112, y + 28, x + 93, y + 42).lineBetween(x + 93, y + 42, x + 112, y + 52);
    g.fillStyle(NS.C.paper, 1).fillRect(x + 109, y + 31, 6, 18);
    // portrait
    g.fillStyle(NS.C.navy, 0.28).fillCircle(x + 48, y + 46, 46);
    g.fillStyle(0xc9ecf0, 1).fillCircle(x + 48, y + 40, 46);
    g.lineStyle(4, NS.C.navy, 1).strokeCircle(x + 48, y + 40, 46);
    const m = NS.meta('astro.' + NS.GUIDE);
    const face = scene.add.sprite(x + 48, y + 46, 'astro.' + NS.GUIDE, 0).setScale(0.4).setOrigin(0.5, 0.58).setDepth(D + 1);
    const tag = scene.add.graphics().setDepth(D + 2);
    tag.fillStyle(NS.C.teal, 1).fillRoundedRect(x + 128, y - 11, 74, 22, 11);
    tag.lineStyle(3, NS.C.navy, 1).strokeRoundedRect(x + 128, y - 11, 74, 22, 11);
    const tagT = NS.text(scene, x + 165, y, 'ASTRO', 13).setOrigin(0.5).setDepth(D + 3);
    const body = NS.text(scene, x + 128, y + 14, '', 19, NS.C.navyHex, '700')
      .setWordWrapWidth(w - 150).setDepth(D + 2).setLineSpacing(2);
    const api = {
      objects: [g, face, tag, tagT, body],
      say(text) {
        if (api._ev) api._ev.remove(false);
        body.setText('');
        let i = 0;
        api._ev = scene.time.addEvent({
          delay: 14, repeat: Math.max(0, text.length - 1),
          callback: () => { i++; body.setText(text.slice(0, i)); },
        });
        api.last = text;
      },
      last: '',
    };
    return api;
  };

  // ------------------------------------------------------------ chips + toast
  NS.dimChip = function (img) { img.setAlpha(0.4).setTint(0xaab0c8); };
  NS.litChip = function (scene, img, pop) {
    img.clearTint().setAlpha(1);
    if (pop) {
      const s = img.scaleX;
      scene.tweens.add({ targets: img, scaleX: s * 1.12, scaleY: s * 1.12, yoyo: true, duration: 160, ease: 'Sine.easeOut' });
    }
  };

  NS.toast = function (scene, str, color) {
    const t = NS.text(scene, 0, 0, str, 20).setOrigin(0.5);
    const w = t.width + 48, h = 44;
    const c = scene.add.container(NS.W / 2, -60).setDepth(5000);
    const g = scene.add.graphics();
    g.fillStyle(NS.C.navy, 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 22);
    g.fillStyle(color || NS.C.green, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    g.lineStyle(4, NS.C.navy, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    c.add([g, t]);
    scene.tweens.add({
      targets: c, y: 150, duration: 320, ease: 'Back.easeOut',
      onComplete: () => scene.time.delayedCall(1700, () => scene.tweens.add({ targets: c, y: -60, alpha: 0, duration: 260, onComplete: () => c.destroy() })),
    });
  };

  // round tick badge (selected / done markers)
  NS.tickBadge = function (scene, x, y, r) {
    const g = scene.add.graphics();
    g.fillStyle(NS.C.green, 1).fillCircle(x, y, r);
    g.lineStyle(3, NS.C.navy, 1).strokeCircle(x, y, r);
    g.lineStyle(4, NS.C.navy, 1).beginPath()
      .moveTo(x - r * 0.42, y + r * 0.02).lineTo(x - r * 0.1, y + r * 0.36).lineTo(x + r * 0.44, y - r * 0.3).strokePath();
    return g;
  };
})();
