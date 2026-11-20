/* Automated players used by the balance tests (and handy for tuning content). */
const C = require('../../src/sim/content.js');
const E = require('../../src/sim/engine.js');

// Greedy layout: place each wanted building on the best free pad it is allowed on.
function autoLayout(missionId, siteId, wanted) {
  const layout = [];
  const pads = C.PAD_SETS[C.SITES[siteId].padSet];
  wanted.forEach((type) => {
    const B = C.BUILDINGS[type];
    const order = pads.map((tags, i) => ({ i, score: (B.bonusTag && tags.includes(B.bonusTag) ? 2 : 0) - tags.length * 0.1 }))
      .sort((a, b) => b.score - a.score);
    const spot = order.find((p) => E.canPlace(missionId, siteId, layout, type, p.i).ok);
    if (spot) layout.push({ type, pad: spot.i });
  });
  return layout;
}

// Every affordable mix of extras on top of the required buildings.
function candidateLayouts(missionId, siteId) {
  const M = E.mission(missionId);
  const extras = [];
  M.buildings.forEach((t) => {
    const B = C.BUILDINGS[t];
    if (B.needsIce && !C.SITES[siteId].ice) return;
    const n = B.max - (M.required.includes(t) ? 1 : 0);
    for (let k = 0; k < n; k++) extras.push(t);
  });
  const seen = new Set();
  const out = [];
  for (let mask = 0; mask < 1 << extras.length; mask++) {
    const pick = extras.filter((_, i) => mask & (1 << i)).sort();
    const key = pick.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const wanted = M.required.concat(pick);
    const layout = autoLayout(missionId, siteId, wanted);
    if (layout.length === wanted.length && E.validateLayout(missionId, siteId, layout).ok) out.push(layout);
  }
  return out;
}

function score(st) {
  if (st.status === 'lost') return -1e9;
  const r = st.res, M = E.mission(st.missionId);
  const soon = st.events.find((e) => e.type === 'storm' && e.day >= st.day && e.day <= st.day + 2);
  return r.hearts * 40 + Math.min(r.air, 8) * 3 + Math.min(r.food, 10) * 2 + r.power * 1.5 +
    Math.min(r.shield, soon ? soon.strength : 1) * 12 + Math.min(r.science, M.scienceGoal) * 6 + r.science * 0.5 -
    st.dose.reduce((a, b) => a + Math.max(0, b - M.doseLimit * 0.5), 0) * 2 - st.grounded.filter(Boolean).length * 80 +
    (st.status === 'won' ? 1e6 : 0);
}

// Beam search over daily plans: proves a mission is winnable (and how well).
function beam(missionId, siteId, layout, width, seed) {
  width = width || 25;
  let states = [E.createMission(missionId, siteId, layout, { seed: seed || 1 })];
  while (states.some((s) => s.status === 'playing')) {
    const next = [];
    states.forEach((s) => {
      if (s.status !== 'playing') { next.push(s); return; }
      E.candidatePlans(s).forEach((p) => { const n = E.step(s, p); n._score = score(n); next.push(n); });
    });
    next.sort((a, b) => (b._score || score(b)) - (a._score || score(a)));
    const seen = new Set();
    states = [];
    for (const s of next) {
      const k = JSON.stringify(s.res) + s.dose.join() + s.day + s.status;
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(s);
      if (states.length >= width) break;
    }
  }
  states.sort((a, b) => E.stars(b) - E.stars(a) || score(b) - score(a));
  return states[0];
}

// Fixed policy: same plan every day.
function fixed(missionId, siteId, layout, planFn, seed) {
  let s = E.createMission(missionId, siteId, layout, { seed: seed || 1 });
  while (s.status === 'playing') s = E.step(s, planFn(s));
  return s;
}

// The in-game "Ask Mission Control" advisor followed every day (Moon: instant advice).
function advisor(missionId, siteId, layout, seed) {
  let s = E.createMission(missionId, siteId, layout, { seed: seed || 1 });
  while (s.status === 'playing') s = E.step(s, E.advise(s).plan);
  return s;
}

function bestOverLayouts(missionId, siteId, width, seed) {
  let best = null;
  candidateLayouts(missionId, siteId).forEach((layout) => {
    const r = beam(missionId, siteId, layout, width, seed);
    if (!best || E.stars(r) > E.stars(best.state) || (E.stars(r) === E.stars(best.state) && score(r) > score(best.state))) {
      best = { state: r, layout };
    }
  });
  return best;
}

module.exports = { autoLayout, candidateLayouts, beam, fixed, advisor, bestOverLayouts, score };
