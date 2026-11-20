/*
 * MISSION ENGINE - the pure, deterministic Moon/Mars outpost simulation.
 * No Phaser, no DOM. Randomness comes only from the mission seed, so
 * same mission + site + layout + seed + plans  =>  same result.
 *
 *   let st = Engine.createMission('m3', 'plain', layout, { seed: 42, live })
 *   st = Engine.step(st, { on: { oxygen: true }, jobs: ['tune', 'garden', 'science'] })
 *
 * Every step returns a NEW state (the old one is untouched), so rewinding is just
 * keeping the previous states.
 */
(function (root) {
  const isNode = typeof module === 'object' && module.exports;
  const C = isNode ? require('./content.js') : root.OUTPOST_CONTENT;
  let DONKI = null;
  try { DONKI = isNode ? require('../data/donki-events.js') : root.OUTPOST_DONKI; } catch (e) { DONKI = null; }

  const CORE = ['power', 'air', 'food'];
  const RES_KEYS = ['power', 'air', 'food', 'hearts', 'science', 'shield'];
  const ADVICE_PER_MISSION = 3;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const mission = (id) => C.MISSIONS.find((m) => m.id === id);
  const round1 = (x) => Math.round(x * 10) / 10;

  // ---------------------------------------------------------------- seeded random (mulberry32)
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- solar flares -> storms
  function classValue(cls) {
    return ({ A: 0.01, B: 0.1, C: 1, M: 10, X: 100 }[String(cls)[0]] || 0) * parseFloat(String(cls).slice(1) || '1');
  }
  // gameplay strength 1-3 (documented simplification): M = 1, X = 2, X5+ or X with particle event = 3
  function strengthOf(cls, particles) {
    const v = classValue(cls);
    if (v < 100) return 1;
    return v >= 500 || particles ? 3 : 2;
  }

  // Where do storms come from? LIVE (fetched today) > ARCHIVE (bundled real events) > PRACTICE.
  function flarePool(periodId, live) {
    const mx = (f) => f && /^[MX]/.test(f.cls);
    if (live && Array.isArray(live.flares) && live.flares.filter(mx).length) {
      return { source: 'LIVE', label: 'LIVE from NASA DONKI (fetched ' + live.fetched + ')', flares: live.flares.filter(mx) };
    }
    const periods = (DONKI && DONKI.periods) || [];
    const p = periods.find((x) => x.id === periodId && x.flares && x.flares.length) || periods.find((x) => x.flares && x.flares.length);
    if (p) return { source: 'ARCHIVE', label: 'ARCHIVE: ' + p.title + ' (NASA DONKI)', flares: p.flares.filter(mx) };
    return { source: 'PRACTICE', label: 'PRACTICE storm (real data not loaded)', flares: C.PRACTICE_FLARES };
  }

  function planEvents(M, seed, live) {
    const r = rng(seed);
    const events = [];
    const taken = new Set();
    (M.storms || []).forEach((slot) => {
      const [a, b] = slot.window;
      let day = a + Math.floor(r() * (b - a + 1));
      while (taken.has(day) && day < b) day++;
      taken.add(day);
      const pool = flarePool(slot.period, live);
      const strong = pool.flares.filter((f) => (f.strength || strengthOf(f.cls, f.particles)) >= (slot.minStrength || 1));
      const list = strong.length ? strong : pool.flares;
      const f = list[Math.floor(r() * list.length)];
      events.push({
        type: 'storm', day, source: pool.source, label: pool.label, cls: f.cls,
        strength: f.strength || strengthOf(f.cls, f.particles), particles: !!f.particles,
        date: f.peak ? String(f.peak).slice(0, 10) : (f.date || null), region: f.activeRegion || null,
      });
    });
    if (M.dust) {
      const [a, b] = M.dust.window;
      events.push({ type: 'dust', day: a + Math.floor(r() * (b - a + 1)), length: M.dust.length });
    }
    return events.sort((x, y) => x.day - y.day);
  }

  // ---------------------------------------------------------------- light & weather
  function siteOf(state) { return C.SITES[state.siteId]; }
  function isLit(state, day) {
    const L = siteOf(state).light;
    if (L.lit <= 0) return false;
    if (L.lit >= L.cycle) return true;
    return ((day - 1 + state.lightOffset) % L.cycle + L.cycle) % L.cycle < L.lit;
  }
  function dustOn(state, day) {
    return state.events.some((e) => e.type === 'dust' && day >= e.day && day < e.day + e.length);
  }
  function stormOn(state, day) { return state.events.find((e) => e.type === 'storm' && e.day === day) || null; }

  // ---------------------------------------------------------------- layout
  const count = (layout, type) => layout.filter((b) => b.type === type).length;
  const has = (layout, type) => layout.some((b) => b.type === type);
  const layoutCost = (layout) => layout.reduce((s, b) => s + C.BUILDINGS[b.type].cost, 0);
  function padTags(siteId, pad) { return C.PAD_SETS[C.SITES[siteId].padSet][pad] || []; }

  function canPlace(missionId, siteId, layout, type, padIndex) {
    const M = mission(missionId), B = C.BUILDINGS[type], site = C.SITES[siteId];
    if (!M.buildings.includes(type)) return { ok: false, reason: 'not part of this mission' };
    if (layout.some((b) => b.pad === padIndex)) return { ok: false, reason: 'that spot is taken' };
    if (count(layout, type) >= B.max) return { ok: false, reason: 'you already have the most allowed' };
    if (B.needsIce && !site.ice) return { ok: false, reason: 'there is no ice at this site' };
    if (layoutCost(layout) + B.cost > M.budget) return { ok: false, reason: 'not enough supply crates' };
    const tags = padTags(siteId, padIndex);
    if (!B.allowedTags.some((t) => tags.includes(t))) return { ok: false, reason: 'needs a ' + B.allowedTags.join(' or ') + ' spot' };
    return { ok: true, reason: '' };
  }

  function validateLayout(missionId, siteId, layout) {
    const M = mission(missionId);
    const missing = M.required.filter((t) => !has(layout, t));
    const over = layoutCost(layout) > M.budget;
    return { ok: missing.length === 0 && !over, missing, over, cost: layoutCost(layout), budget: M.budget };
  }

  const capacityOf = (layout) => layout.reduce((s, b) => s + (C.BUILDINGS[b.type].capacity || 0), 0);
  function shieldCap(state) {
    const sh = state.layout.find((b) => b.type === 'shelter');
    if (!sh) return 0;
    return C.CAPS.shield + (padTags(state.siteId, sh.pad).includes('shaded') ? 1 : 0);
  }
  function solarOutput(state, day) {
    const site = siteOf(state);
    const total = state.layout.filter((b) => b.type === 'solar')
      .reduce((s, b) => s + site.solar + (padTags(state.siteId, b.pad).includes('sunny') ? 1 : 0), 0);
    return dustOn(state, day == null ? state.day : day) ? Math.floor(total / 2) : total;
  }
  function doseRate(state) { return C.DOSE_RATES[siteOf(state).body].perDay * C.DAY_IN_EARTH_DAYS; }

  // ---------------------------------------------------------------- create
  function createMission(missionId, siteId, layout, opts) {
    opts = opts || {};
    const M = mission(missionId);
    if (!M) throw new Error('unknown mission ' + missionId);
    if (!C.SITES[siteId]) throw new Error('unknown site ' + siteId);
    const seed = opts.seed == null ? 1 : opts.seed;
    const on = {};
    layout.forEach((b) => { if (C.BUILDINGS[b.type].toggle) on[b.type] = true; });
    const st = {
      missionId, siteId, body: C.SITES[siteId].body, layout: clone(layout), day: 1, days: M.days,
      lightOffset: M.lightOffset || 0, seed,
      res: { power: M.start.power, air: M.start.air, food: M.start.food, hearts: M.start.hearts, science: 0, shield: 0 },
      dose: [0, 0, 0], grounded: [false, false, false],
      capacity: capacityOf(layout), on, status: 'playing',
      events: planEvents(M, seed, opts.live), log: [], facts: [],
      advice: { used: 0, pending: null, ready: null },
    };
    st.res.power = Math.min(st.res.power, st.capacity);
    return st;
  }

  // ---------------------------------------------------------------- jobs
  function jobAvailable(state, jobId, crewIndex) {
    const J = C.JOBS[jobId];
    if (!J) return false;
    if (crewIndex != null && state.grounded[crewIndex] && jobId !== 'rest') return false;
    return !J.needs || has(state.layout, J.needs);
  }
  function jobPower(jobId, crewIndex) {
    const crew = C.CREW[crewIndex];
    return crew && C.JOBS[jobId].role === crew.role ? 2 : 1;
  }
  function cleanJobs(state, jobs) {
    return [0, 1, 2].map((i) => {
      const j = (jobs || [])[i];
      return jobAvailable(state, j, i) ? j : 'rest';
    });
  }

  // ---------------------------------------------------------------- step
  function step(prev, plan) {
    if (prev.status !== 'playing') return prev;
    const s = clone(prev);
    const r = s.res;
    const M = mission(s.missionId);
    const before = clone(r);
    const doseBefore = s.dose.slice();
    const lines = [];
    const add = (kind, text, cause) => lines.push({ kind, text, cause: cause || null });
    const lit = isLit(s, s.day);
    const dust = dustOn(s, s.day);
    const jobs = cleanJobs(s, plan && plan.jobs);
    s.on = Object.assign({}, s.on, (plan && plan.on) || {});
    Object.keys(s.on).forEach((k) => { if (!has(s.layout, k)) delete s.on[k]; });

    // 1) power made today
    let made = 0;
    if (has(s.layout, 'solar')) {
      if (lit) made += solarOutput(s, s.day);
      else add('info', 'Night: the solar panels make no power.', 'night');
      if (lit && dust) add('bad', 'Dust storm! The solar panels make only half power.', 'dust');
    }
    jobs.forEach((j, i) => {
      if (j !== 'tune') return;
      if (lit) made += jobPower(j, i);
      else add('info', C.CREW[i].name + ' cannot tune panels in the dark.', 'night');
    });
    let pool = r.power + made;

    // 2) machines run in priority order (life support first)
    const running = {};
    Object.keys(C.BUILDINGS).filter((k) => C.BUILDINGS[k].power && has(s.layout, k))
      .sort((a, b) => C.BUILDINGS[a].priority - C.BUILDINGS[b].priority)
      .forEach((k) => {
        const B = C.BUILDINGS[k];
        if (B.toggle && !s.on[k]) return;
        if (pool < B.power) { add('bad', B.name + ' shut down: not enough power.', 'power'); return; }
        pool -= B.power;
        running[k] = true;
      });
    Object.keys(running).forEach((k) => {
      const B = C.BUILDINGS[k];
      Object.keys(B.outputs || {}).forEach((res) => { r[res] += B.outputs[res]; });
      if (running.ice && B.iceBonus) Object.keys(B.iceBonus).forEach((res) => { r[res] += B.iceBonus[res]; });
    });

    // 3) crew jobs
    jobs.forEach((j, i) => {
      const p = jobPower(j, i), who = C.CREW[i].name;
      if (j === 'garden') {
        if (running.greenhouse) r.food += p; else add('info', who + ' tends the garden, but it is switched off.');
      } else if (j === 'shelter') {
        const room = shieldCap(s) - r.shield;
        if (room <= 0) add('info', 'The shelter is already full.');
        else if (pool < 1) add('bad', who + ' could not charge the shelter: no power left.', 'power');
        else { pool -= 1; r.shield += Math.min(p, room); }
      } else if (j === 'science') {
        r.science += p;
      }
    });
    // resting helps the whole crew recover, but only 1 heart per day (it doesn't stack)
    if (jobs.includes('rest')) r.hearts = Math.min(C.CAPS.hearts, r.hearts + 1);

    // 4) crew needs
    Object.keys(C.CREW_NEEDS).forEach((res) => {
      r[res] -= C.CREW_NEEDS[res];
      if (r[res] < 0) {
        r[res] = 0;
        r.hearts -= C.SHORTAGE_HARM[res];
        add('bad', 'The crew ran out of ' + res + '! −' + C.SHORTAGE_HARM[res] + ' hearts.', res);
      }
    });

    // 5) store power, apply caps
    if (pool > s.capacity) add('info', 'Batteries full: ' + (pool - s.capacity) + ' extra power was wasted.');
    r.power = Math.max(0, Math.min(pool, s.capacity));
    r.air = Math.min(r.air, C.CAPS.air);
    r.food = Math.min(r.food, C.CAPS.food);
    r.shield = Math.min(r.shield, shieldCap(s));

    // 6) radiation: everyday dose (real surface rates) - outdoor jobs get the full dose
    const rate = doseRate(s);
    const habitat = has(s.layout, 'crew');
    jobs.forEach((j, i) => {
      const outside = C.JOBS[j].outdoor || !habitat;
      s.dose[i] = round1(s.dose[i] + rate * (outside ? 1 : C.INDOOR_FACTOR));
    });

    // 7) solar storm
    const ev = stormOn(s, s.day);
    let storm = null;
    if (ev) {
      const blocked = Math.min(r.shield, ev.strength);
      r.shield -= blocked;
      const unblocked = ev.strength - blocked;
      const extra = unblocked * C.STORM_DOSE;
      if (extra) s.dose = s.dose.map((d) => round1(d + extra));
      storm = Object.assign({ blocked, extra }, ev);
      if (extra) add('bad', 'Solar storm (' + ev.cls + ')! The shelter blocked ' + blocked + ' of ' + ev.strength + '. Everyone got +' + extra + ' mSv.', 'storm');
      else add('good', 'Solar storm (' + ev.cls + ')! The shelter blocked it all. Everyone is safe.');
    }

    // 8) dose limit: an astronaut over the limit must stay inside and rest
    s.dose.forEach((d, i) => {
      if (!s.grounded[i] && d >= M.doseLimit) {
        s.grounded[i] = true;
        add('bad', C.CREW[i].name + ' reached the radiation limit (' + M.doseLimit + ' mSv) and must stay inside.', 'dose');
      }
    });

    // 9) facts the player has now seen (Journal unlocks)
    const fact = (id) => { if (!s.facts.includes(id)) s.facts.push(id); };
    if (!lit && has(s.layout, 'solar')) fact('lunar-day');
    if (ev) fact('flare');
    if (running.ice) fact('ice');
    if (running.greenhouse) fact('plants');
    if (dust) fact('mars-dust');
    if (s.dose.some((d) => d >= M.doseLimit / 2)) fact('radiation');

    r.hearts = Math.min(C.CAPS.hearts, r.hearts);
    const deltas = {};
    RES_KEYS.forEach((k) => { deltas[k] = r[k] - before[k]; });
    const doseDelta = s.dose.map((d, i) => round1(d - doseBefore[i]));
    s.log.push({ day: s.day, lit, dust, deltas, doseDelta, lines, storm, made, jobs, running });

    // 10) end of day
    if (r.hearts <= 0) {
      r.hearts = 0;
      s.status = 'lost';
    } else if (s.day >= s.days) {
      s.status = 'won';
    } else {
      s.day += 1;
      // a delayed radio answer from Earth arrives
      const a = s.advice;
      if (a.pending && a.pending.arrives <= s.day) { a.ready = a.pending; a.pending = null; }
    }
    return s;
  }

  // ---------------------------------------------------------------- Mission Control advice (comm delay)
  function adviceScore(st, M) {
    if (st.status === 'lost') return -1e9;
    const r = st.res;
    const soon = st.events.find((e) => e.type === 'storm' && e.day >= st.day && e.day <= st.day + 1);
    const shieldNeed = soon ? soon.strength : 0;
    return r.hearts * 40 + Math.min(r.air, 8) * 4 + Math.min(r.food, 8) * 3 + r.power * 1.5 +
      Math.min(r.shield, shieldNeed) * 30 + Math.min(r.science, M.scienceGoal) * 3 -
      st.dose.reduce((a, b) => a + b, 0) * 0.6 - st.grounded.filter(Boolean).length * 60 +
      (st.status === 'won' ? 1000 : 0);
  }
  function candidatePlans(state) {
    const toggles = Object.keys(state.on);
    const per = [0, 1, 2].map((i) => C.JOB_ORDER.filter((j) => jobAvailable(state, j, i)));
    const plans = [];
    for (let m = 0; m < 1 << toggles.length; m++) {
      const on = {};
      toggles.forEach((t, i) => { on[t] = !!(m & (1 << i)); });
      per[0].forEach((a) => per[1].forEach((b) => per[2].forEach((c) => plans.push({ on, jobs: [a, b, c] }))));
    }
    return plans;
  }
  function advise(state) {
    const M = mission(state.missionId);
    let best = null;
    candidatePlans(state).forEach((p) => {
      const n = step(state, p);
      const sc = adviceScore(n, M);
      if (!best || sc > best.sc) best = { sc, plan: p, next: n };
    });
    const p = best.plan, n = best.next;
    const reasons = [];
    const storm = state.events.find((e) => e.type === 'storm' && e.day === state.day + 1);
    if (storm && p.jobs.includes('shelter')) reasons.push('A solar storm is coming tomorrow: charge the shelter today.');
    if (state.res.air <= 4 && p.on.oxygen !== false) reasons.push('Air is low: keep the Oxygen Maker running.');
    if (!isLit(state, state.day) && p.on.greenhouse === false) reasons.push('It is night: switching off the greenhouse saves power.');
    if (state.dose.some((d) => d >= M.doseLimit * 0.6)) reasons.push('Someone has a lot of radiation: keep them inside today.');
    if (!reasons.length) reasons.push('This plan keeps everyone healthy and makes progress.');
    return { plan: p, reasons, preview: { hearts: n.res.hearts, air: n.res.air, food: n.res.food, power: n.res.power } };
  }
  // Ask Earth: the answer is computed from TODAY's situation but arrives after the radio delay.
  function requestAdvice(state) {
    if (state.status !== 'playing' || state.advice.used >= ADVICE_PER_MISSION || state.advice.pending) return state;
    const s = clone(state);
    const delay = C.COMM_DELAY[s.body].days;
    const a = Object.assign({ forDay: s.day, arrives: s.day + delay }, advise(state));
    s.advice.used += 1;
    if (delay === 0) s.advice.ready = a; else s.advice.pending = a;
    if (s.body === 'mars' && !s.facts.includes('mars-delay')) s.facts.push('mars-delay');
    return s;
  }

  // ---------------------------------------------------------------- outlook
  function forecast(state, n) {
    const out = [];
    for (let d = state.day; d < state.day + (n || 5) && d <= state.days; d++) {
      out.push({ day: d, lit: isLit(state, d), dust: dustOn(state, d), storm: stormOn(state, d) });
    }
    return out;
  }
  function energyOutlook(state, plan) {
    const lit = isLit(state, state.day);
    let made = lit && has(state.layout, 'solar') ? solarOutput(state, state.day) : 0;
    const on = Object.assign({}, state.on, (plan && plan.on) || {});
    let use = 0;
    Object.keys(C.BUILDINGS).forEach((k) => {
      const B = C.BUILDINGS[k];
      if (!B.power || !has(state.layout, k)) return;
      if (!B.toggle || on[k]) use += B.power;
    });
    cleanJobs(state, plan && plan.jobs).forEach((j, i) => {
      if (j === 'tune' && lit) made += jobPower(j, i);
      if (j === 'shelter') use += 1;
    });
    return { lit, made, use, stored: state.res.power, capacity: state.capacity };
  }

  function stars(state) {
    if (state.status !== 'won') return 0;
    const M = mission(state.missionId);
    if (state.res.hearts < M.healthGoal || state.grounded.some(Boolean)) return 1;
    return state.res.science >= M.scienceGoal ? 3 : 2;
  }

  // Kid-friendly cause chain for a lost mission: newest problems last.
  function explain(state) {
    const recent = state.log.slice(-3);
    const chain = [];
    const seen = new Set();
    recent.forEach((d) => {
      if (!d.lit && d.lines.some((l) => l.cause === 'power') && !seen.has('night')) {
        chain.push('Day ' + d.day + ': it was night, so the solar panels made no power.'); seen.add('night');
      }
      d.lines.filter((l) => l.kind === 'bad').forEach((l) => {
        if (!seen.has(l.text)) { chain.push('Day ' + d.day + ': ' + l.text); seen.add(l.text); }
      });
    });
    const causes = new Set(state.log.flatMap((d) => d.lines.map((l) => l.cause)));
    const tips = [];
    if (causes.has('power')) tips.push('Build more batteries, or switch off the greenhouse at night to save power.');
    if (causes.has('dust')) tips.push('Dust storms halve solar power: store power before they arrive.');
    if (causes.has('air')) tips.push('Keep the Oxygen Maker running: it turns water into air.');
    if (causes.has('food')) tips.push('Run the greenhouse and let the botanist tend the garden.');
    if (causes.has('storm')) tips.push('When a storm warning appears, charge the shelter the day before.');
    if (causes.has('dose')) tips.push('Share the outside jobs so nobody soaks up too much radiation.');
    return { chain: chain.length ? chain : ['The crew got too tired.'], tips };
  }

  const API = {
    CORE, RES_KEYS, ADVICE_PER_MISSION, mission, rng, classValue, strengthOf, flarePool, planEvents,
    isLit, dustOn, stormOn, createMission, step, advise, requestAdvice, candidatePlans, forecast, energyOutlook,
    stars, explain, canPlace, validateLayout, layoutCost, padTags, jobAvailable, jobPower, capacityOf, shieldCap,
    solarOutput, doseRate,
  };
  if (isNode) module.exports = API;
  else root.OUTPOST_ENGINE = API;
})(typeof self !== 'undefined' ? self : this);
