/* JOURNAL: what the cadet has learned - Moon & Mars facts, real NASA health studies (OSDR),
 * the real solar flares they faced (DONKI), and where every number comes from. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const PER_PAGE = 8;
  const TABS = [['facts', 'Facts', 'book'], ['health', 'Health Lab', 'health'], ['sun', 'Sun Watch', 'sun'], ['sources', 'Sources', 'radio']];

  class JournalScene extends Phaser.Scene {
    constructor() { super('Journal'); }
    init(data) { this.back = (data && data.back) || 'Campaign'; }

    create() {
      NS.skyBackdrop(this);
      this.cameras.main.fadeIn(300);
      this.focus = new NS.Focus(this);
      this.unlocked = new Set(NS.save.data.logbook);
      this.tab = 'facts'; this.page = 0; this.sel = 0;

      NS.icon(this, 'book', 52, 48, 40);
      NS.title(this, 84, 22, 'Cadet Journal', 40, '#fff7ea');
      this.tabBtns = TABS.map(([id, label, icon], i) => NS.button(this, 560 + i * 176, 50, 166, 50, label, () => { this.tab = id; this.page = 0; this.sel = 0; this.draw(); },
        { icon, color: NS.C.cream, size: 17 }));
      NS.glass(this, 24, 104, 440, 528);
      NS.panel(this, 484, 104, 772, 528, { r: 22 });
      this.list = this.add.container(0, 0);
      this.detail = this.add.container(0, 0);
      this.btnBack = NS.button(this, 110, 672, 170, 56, 'Back', () => NS.go(this, this.back), { color: NS.C.cream });
      this.btnPrev = NS.button(this, 300, 672, 110, 56, '◀', () => this.turn(-1), { color: 0x8f88b8 });
      this.btnNext = NS.button(this, 420, 672, 110, 56, '▶', () => this.turn(1), { color: 0x8f88b8 });
      this.btnRead = NS.button(this, 1146, 672, 210, 56, 'Read aloud', () => this.readAloud(), { color: NS.C.yellow, icon: 'speaker', size: 18 });
      if (!NS.voice.supported) this.btnRead.setVisible(false);
      this.input.keyboard.on('keydown', (ev) => { if (ev.key === 'Escape') NS.go(this, this.back); });
      this.draw();
      window.__outpost = Object.assign(window.__outpost || {}, { journal: this });
    }

    entries() {
      if (this.tab === 'facts') return NS.LOGBOOK.ENTRIES.map((e) => ({ id: e.id, title: e.title, icon: e.icon, text: e.text, source: e.source, open: this.unlocked.has(e.id) }));
      if (this.tab === 'health') return NS.OSDR.studies.map((s) => ({
        id: s.id, title: s.accession + ': space health study', icon: 'health', open: this.unlocked.has(s.id),
        text: s.kid + '\n\nReal NASA study: “' + s.title + '” (' + s.flightProgram + (s.organism ? ', ' + s.organism : '') + ').',
        source: 'NASA Open Science Data Repository (OSDR), ' + s.url + '. Summary written by us in kid-friendly words.',
      }));
      if (this.tab === 'sun') {
        const storms = NS.save.data.storms.slice().reverse();
        const live = NS.live.summary();
        const out = [{ id: 'today', title: "Today's Sun (" + live.label + ')', icon: 'sun', open: true,
          text: live.text + (live.strongest ? '. Strongest: ' + live.strongest.cls + ' flare.' : '.') + '\n\nFlares are ranked A, B, C, M and X. Each letter is 10 times stronger. In the game, M flares are strength 1, X flares strength 2, and X5+ flares strength 3 (simplified).',
          source: live.label === 'LIVE' ? 'LIVE from NASA/CCMC DONKI via api.nasa.gov, fetched ' + live.fetched : 'Bundled NASA/CCMC DONKI records (no live connection).' }];
        storms.forEach((s, i) => out.push({ id: 'st' + i, title: s.cls + ' flare' + (s.date ? ' · ' + s.date : ''), icon: 'storm', open: true,
          text: 'You faced this storm in a mission! Strength ' + s.strength + ' of 3.\n\n' + (s.source === 'PRACTICE' ? 'This was a practice storm (real data was not available).' : 'This was a REAL solar flare recorded by NASA (' + s.source + ').'),
          source: s.source === 'PRACTICE' ? 'Practice data' : 'NASA/CCMC DONKI' }));
        return out;
      }
      const C = NS.CONTENT;
      return [
        { id: 'src-donki', title: 'NASA DONKI space weather', icon: 'sun', open: true, text: 'Real solar flares. LIVE (last 30 days, fetched in your browser) or ARCHIVE (May 2024, October 2024 and September 2017 storms, bundled). They are never shown as forecasts.', source: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/ · api.nasa.gov' },
        { id: 'src-osdr', title: 'NASA OSDR health studies', icon: 'health', open: true, text: 'Real space-biology studies: muscle and bone loss, space gardens, and radiation. See the Health Lab tab.', source: 'https://osdr.nasa.gov/bio/repo/' },
        { id: 'src-dose', title: 'Radiation on the Moon and Mars', icon: 'rad', open: true, text: 'Daily surface dose: Moon ' + C.DOSE_RATES.moon.perDay + ' mSv, Mars ' + C.DOSE_RATES.mars.perDay + ' mSv. Outside jobs get the full dose; inside the habitat gets half (simplified). Storm dose and limits are game values.', source: C.DOSE_RATES.moon.source + ' · ' + C.DOSE_RATES.mars.source },
        { id: 'src-sites', title: 'Real landing sites', icon: 'flag', open: true, text: 'Malapert Massif, Mons Mouton Plateau and Haworth are NASA Artemis III candidate regions. Jezero Crater is where Perseverance landed. Arcadia Planitia is studied by NASA for buried ice. Sunlight and ice amounts are simplified.', source: 'NASA Artemis III regions (2024); NASA Mars 2020; NASA SWIM project' },
        { id: 'src-time', title: 'Game simplifications', icon: 'night', open: true, text: 'One game day is about 2 Earth days. Resources are small whole numbers so you can plan. A storm warning one day ahead is a game helper.', source: 'Little Space Outpost design notes (DATA-SOURCES.md)' },
      ];
    }

    turn(d) {
      const pages = Math.max(1, Math.ceil(this.entries().length / PER_PAGE));
      this.page = (this.page + d + pages) % pages; this.draw();
    }

    draw() {
      this.tabBtns.forEach((b, i) => b.setSelected(TABS[i][0] === this.tab));
      const list = this.entries();
      this.list.removeAll(true);
      const start = this.page * PER_PAGE;
      const items = [];
      list.slice(start, start + PER_PAGE).forEach((e, k) => {
        const i = start + k, y = 122 + k * 62;
        const g = this.add.graphics();
        g.fillStyle(i === this.sel ? 0x2e6e8a : 0x2a1f6e, e.open ? 0.95 : 0.5).fillRoundedRect(42, y, 404, 52, 14);
        g.lineStyle(2, i === this.sel ? 0xffd23f : NS.C.edge, i === this.sel ? 1 : 0.4).strokeRoundedRect(42, y, 404, 52, 14);
        const ic = NS.icon(this, e.open ? e.icon : 'lock', 72, y + 26, 26);
        const t = NS.text(this, 96, y + 14, e.open ? e.title.slice(0, 34) : '??? (not found yet)', 17, e.open ? '#ffffff' : NS.C.dimHex);
        const z = this.add.zone(244, y + 26, 404, 52).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { NS.sfx('click'); this.sel = i; this.draw(); });
        this.list.add([g, ic, t, z]);
        items.push({ id: this.tab + i, bounds: () => ({ x: 42, y, w: 404, h: 52 }), activate: () => { this.sel = i; this.draw(); this.readAloud(); } });
      });
      const pages = Math.ceil(list.length / PER_PAGE);
      this.btnPrev.setVisible(pages > 1); this.btnNext.setVisible(pages > 1);

      this.detail.removeAll(true);
      const e = list[this.sel];
      if (e && e.open) {
        this.detail.add(NS.icon(this, e.icon, 538, 160, 50));
        this.detail.add(NS.title(this, 576, 138, e.title, 28, NS.C.inkHex, false).setWordWrapWidth(660));
        this.detail.add(NS.text(this, 512, 214, e.text, 21, NS.C.inkHex, '700').setWordWrapWidth(716).setLineSpacing(7));
        this.detail.add(NS.text(this, 512, 566, 'Source: ' + e.source, 13, NS.C.slateHex, '700').setWordWrapWidth(716));
      } else {
        this.detail.add(NS.text(this, 870, 360, 'Play missions to find this entry!', 22, NS.C.slateHex).setOrigin(0.5));
      }
      this.btnRead.setEnabled(!!(e && e.open));
      items.push(this.btnRead.focusItem('read'), this.btnBack.focusItem('back'));
      this.tabBtns.forEach((b, i) => items.push(b.focusItem('tab' + i)));
      this.focus.set(items);
    }

    readAloud() {
      const e = this.entries()[this.sel];
      if (e && e.open) NS.voice.say(e.title + '. ' + e.text, true);
    }
  }
  NS.JournalScene = JournalScene;
})();
