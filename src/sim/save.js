/* Versioned local save. Storage is injected so it can be tested without a browser. */
(function (root) {
  const KEY = 'lso.save.v2';
  const VERSION = 2;

  function fresh() {
    return { version: VERSION, unlocked: 1, stars: {}, logbook: [], settings: { voice: false, rate: 0.95, music: true, sfx: true, live: true }, storms: [], patches: [] };
  }

  function valid(d) {
    return d && d.version === VERSION && Number.isInteger(d.unlocked) && d.unlocked >= 1 &&
      typeof d.stars === 'object' && Array.isArray(d.logbook) && typeof d.settings === 'object' &&
      Array.isArray(d.storms);
  }

  function create(storage) {
    let notice = null;
    let data = fresh();
    try {
      const raw = storage && storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (valid(parsed)) data = Object.assign(fresh(), parsed, { settings: Object.assign(fresh().settings, parsed.settings) });
        else notice = 'Your old save could not be read, so a new adventure begins!';
      }
    } catch (e) {
      notice = 'Your old save could not be read, so a new adventure begins!';
    }

    function write() {
      try { if (storage) storage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
    }

    return {
      get data() { return data; },
      notice,
      starsFor: (id) => data.stars[id] || 0,
      isUnlocked: (index) => index < data.unlocked,
      // record a finished mission; returns { newBest, unlockedNext }
      recordResult(missionIndex, missionId, stars) {
        const prev = data.stars[missionId] || 0;
        const newBest = stars > prev;
        if (newBest) data.stars[missionId] = stars;
        let unlockedNext = false;
        if (stars > 0 && data.unlocked < missionIndex + 2) { data.unlocked = missionIndex + 2; unlockedNext = true; }
        write();
        return { newBest, unlockedNext };
      },
      unlockFacts(ids) {
        const added = Array.from(new Set(ids)).filter((id) => !data.logbook.includes(id));
        if (added.length) { data.logbook = data.logbook.concat(added); write(); }
        return added;
      },
      setSetting(k, v) { data.settings[k] = v; write(); },
      // real solar flares the player has faced (Journal "Sun Watch")
      recordStorm(ev) {
        const key = ev.source + ':' + ev.cls + ':' + (ev.date || '');
        if (data.storms.some((s) => s.key === key)) return;
        data.storms.push({ key, cls: ev.cls, date: ev.date, source: ev.source, strength: ev.strength });
        if (data.storms.length > 40) data.storms.shift();
        write();
      },
      reset() { data = fresh(); write(); },
      write,
    };
  }

  const API = { KEY, VERSION, create, fresh };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.OUTPOST_SAVE = API;
})(typeof self !== 'undefined' ? self : this);
