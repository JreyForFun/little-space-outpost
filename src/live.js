/* LIVE SPACE WEATHER - today's real solar flares from NASA/CCMC DONKI (api.nasa.gov).
 *
 * - Optional (setting "Live Sun"), no personal data sent, cached for 6 hours in localStorage.
 * - Falls back to the bundled ARCHIVE (src/data/donki-events.js) or PRACTICE when offline.
 * - Everything shown from here is labelled LIVE / ARCHIVE / PRACTICE.
 */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});
  const KEY = 'lso.live.v1';
  const MAX_AGE = 6 * 3600 * 1000;
  const API = 'https://api.nasa.gov/DONKI/notifications';

  const iso = (d) => d.toISOString().slice(0, 10);

  function parse(messages) {
    const flares = [];
    const seen = new Set();
    (messages || []).forEach((m) => {
      const body = m.messageBody || '';
      const cls = body.match(/Flare intensity:\s*([A-Z]\d+(?:\.\d+)?)\s*class/);
      const act = body.match(/Activity ID:\s*(\S+?FLR-\d+)/);
      if (!cls || !act || seen.has(act[1])) return;
      seen.add(act[1]);
      const peak = body.match(/Flare peak time:\s*(\S+?)\.?\s/);
      const ar = body.match(/Active Region (\d+)/);
      flares.push({ id: act[1], cls: cls[1], peak: peak ? peak[1].replace(/\.$/, '') : act[1].slice(0, 16), activeRegion: ar ? ar[1] : null, url: m.messageURL || null });
    });
    flares.forEach((f) => { f.strength = NS.ENGINE.strengthOf(f.cls, false); });
    return flares.sort((a, b) => (a.peak < b.peak ? 1 : -1));
  }

  const Live = {
    status: 'idle', // idle | loading | live | archive
    data: null, // { fetched, flares[] }
    error: null,

    enabled() { return NS.save && NS.save.data.settings.live !== false; },

    cached() {
      try {
        const c = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (c && c.fetchedAt && Date.now() - c.fetchedAt < MAX_AGE && Array.isArray(c.flares)) return c;
      } catch (e) { /* ignore */ }
      return null;
    },

    async load(force) {
      if (!this.enabled()) { this.status = 'archive'; return this; }
      const c = !force && this.cached();
      if (c) { this.data = c; this.status = 'live'; return this; }
      this.status = 'loading';
      const end = new Date(), start = new Date(Date.now() - 30 * 86400000);
      const url = API + '?type=FLR&startDate=' + iso(start) + '&endDate=' + iso(end) + '&api_key=DEMO_KEY';
      try {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => ctl && ctl.abort(), 9000);
        const res = await fetch(url, { signal: ctl ? ctl.signal : undefined });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const msgs = await res.json();
        this.data = { fetched: iso(end), fetchedAt: Date.now(), from: iso(start), flares: parse(msgs) };
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage optional */ }
        this.status = 'live';
      } catch (e) {
        this.error = String(e && e.message || e);
        this.status = 'archive';
        this.data = null;
      }
      return this;
    },

    // what the engine should use for storms right now
    forEngine() { return this.status === 'live' && this.data ? { fetched: this.data.fetched, flares: this.data.flares } : null; },

    summary() {
      if (this.status === 'live' && this.data) {
        const f = this.data.flares;
        const m = f.filter((x) => x.cls[0] === 'M').length, x = f.filter((x) => x.cls[0] === 'X').length;
        const strongest = f.slice().sort((a, b) => NS.ENGINE.classValue(b.cls) - NS.ENGINE.classValue(a.cls))[0] || null;
        const risk = x > 0 ? 'HIGH' : m > 3 ? 'MEDIUM' : 'LOW';
        return { label: 'LIVE', m, x, strongest, risk, text: 'Last 30 days: ' + m + ' M-class and ' + x + ' X-class flares', fetched: this.data.fetched };
      }
      const D = window.OUTPOST_DONKI;
      const p = D && D.periods && D.periods.find((pp) => pp.flares && pp.flares.length);
      if (p) {
        const strongest = p.flares.slice().sort((a, b) => NS.ENGINE.classValue(b.cls) - NS.ENGINE.classValue(a.cls))[0];
        return { label: 'ARCHIVE', m: p.flares.filter((x) => x.cls[0] === 'M').length, x: p.flares.filter((x) => x.cls[0] === 'X').length,
          strongest, risk: 'ARCHIVE', text: p.title + ' (real NASA records)', fetched: D.retrieved };
      }
      return { label: 'PRACTICE', m: 0, x: 0, strongest: null, risk: '—', text: 'Offline: practice storms only', fetched: null };
    },
  };

  NS.live = Live;
})();
