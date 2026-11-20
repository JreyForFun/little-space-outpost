const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/sim/content.js');
const E = require('../src/sim/engine.js');
const { autoLayout } = require('./helpers/policies.js');

const base = (m, site, wanted, seed) => E.createMission(m, site, autoLayout(m, site, wanted), { seed: seed || 1 });
const allOn = (s) => ({ on: Object.fromEntries(Object.keys(s.on).map((k) => [k, true])), jobs: ['tune', 'rest', 'rest'] });

test('content is consistent', () => {
  assert.equal(C.MISSIONS.length, 6);
  C.MISSIONS.forEach((M) => {
    M.required.forEach((t) => assert.ok(M.buildings.includes(t), M.id + ' requires unknown ' + t));
    M.sites.forEach((s) => assert.ok(C.SITES[s], M.id + ' site ' + s));
    assert.ok(M.sites.some((s) => C.SITES[s].safe), M.id + ' has a safe site');
    assert.ok(M.sites.some((s) => !C.SITES[s].safe), M.id + ' has an unsafe site to learn from');
    M.sites.forEach((s) => assert.equal(C.SITES[s].body, M.body, M.id + ' site body'));
  });
  assert.ok(C.MISSIONS.some((M) => M.body === 'mars'), 'there is a Mars mission');
});

test('only three core resource meters', () => {
  assert.deepEqual(E.CORE, ['power', 'air', 'food']);
  const s = base('m1', 'flats', ['crew', 'oxygen', 'solar']);
  assert.ok(!('water' in s.res), 'no separate water meter');
});

test('crew consumes air and food every day', () => {
  const s0 = base('m1', 'flats', ['crew', 'oxygen', 'solar']);
  const s1 = E.step(s0, { on: { oxygen: false }, jobs: ['rest', 'rest', 'rest'] });
  assert.equal(s1.res.air, s0.res.air - C.CREW_NEEDS.air);
  assert.equal(s1.res.food, s0.res.food - C.CREW_NEEDS.food);
});

test('oxygen maker makes air; running out hurts and can lose the mission', () => {
  const s0 = base('m1', 'flats', ['crew', 'oxygen', 'solar']);
  assert.equal(E.step(s0, allOn(s0)).res.air, s0.res.air + 3 - C.CREW_NEEDS.air);
  let s = s0;
  while (s.status === 'playing') s = E.step(s, { on: { oxygen: false }, jobs: ['rest', 'rest', 'rest'] });
  assert.equal(s.status, 'lost');
  const why = E.explain(s);
  assert.ok(why.chain.some((l) => /air/.test(l)));
  assert.ok(why.tips.length > 0);
});

test('night: no solar power, machines shut down by priority', () => {
  let s = base('m4', 'flats', ['crew', 'oxygen', 'solar', 'battery', 'greenhouse']);
  for (let d = 1; d < 6; d++) s = E.step(s, allOn(s));
  assert.equal(E.isLit(s, s.day), false);
  s.res.power = 3; // habitat (1) + oxygen (2), not greenhouse
  const last = E.step(s, allOn(s)).log.slice(-1)[0];
  assert.equal(last.made, 0);
  assert.ok(last.running.oxygen && !last.running.greenhouse);
});

test('radiation: outdoor jobs get the full real daily dose, indoor half', () => {
  const s0 = base('m2', 'flats', ['crew', 'oxygen', 'solar', 'greenhouse']);
  const s1 = E.step(s0, { on: {}, jobs: ['tune', 'garden', 'science'] }); // outside, inside, outside
  const rate = C.DOSE_RATES.moon.perDay * C.DAY_IN_EARTH_DAYS;
  assert.equal(s1.dose[0], Math.round(rate * 10) / 10);
  assert.equal(s1.dose[1], Math.round(rate * C.INDOOR_FACTOR * 10) / 10);
  assert.ok(C.DOSE_RATES.moon.perDay > C.DOSE_RATES.mars.perDay, 'Moon surface dose is higher than Mars (real data)');
});

test('dose limit grounds an astronaut (rest only)', () => {
  let s = base('m2', 'flats', ['crew', 'oxygen', 'solar', 'greenhouse']);
  while (s.status === 'playing' && !s.grounded[2]) s = E.step(s, { on: {}, jobs: ['rest', 'garden', 'science'] });
  assert.ok(s.grounded[2], 'Lumi grounded after too much field work');
  assert.equal(E.jobAvailable(s, 'science', 2), false);
  assert.equal(E.jobAvailable(s, 'rest', 2), true);
});

test('storms: shield blocks, unblocked storm adds dose to everyone', () => {
  const lay = ['crew', 'oxygen', 'solar', 'shelter', 'battery'];
  const run = (charge) => {
    let s = base('m3', 'plain', lay, 7);
    const ev = s.events.find((e) => e.type === 'storm');
    while (s.day < ev.day) s = E.step(s, { on: {}, jobs: [charge ? 'shelter' : 'rest', 'rest', 'rest'] });
    const before = s.dose[1];
    s = E.step(s, { on: {}, jobs: ['rest', 'rest', 'rest'] });
    return { extra: s.dose[1] - before, storm: s.log.slice(-1)[0].storm };
  };
  const bare = run(false), shielded = run(true);
  assert.ok(bare.storm.extra > 0);
  assert.ok(shielded.storm.blocked > 0 && shielded.extra < bare.extra);
});

test('seeds change storm days; same seed is deterministic', () => {
  const lay = autoLayout('m3', 'plain', ['crew', 'oxygen', 'solar', 'shelter']);
  const days = new Set();
  for (let seed = 1; seed <= 20; seed++) days.add(E.createMission('m3', 'plain', lay, { seed }).events.map((e) => e.day).join(','));
  assert.ok(days.size > 1, 'different seeds give different storm days');
  const a = E.createMission('m3', 'plain', lay, { seed: 5 }), b = E.createMission('m3', 'plain', lay, { seed: 5 });
  assert.deepEqual(a.events, b.events);
  const p = { on: {}, jobs: ['tune', 'rest', 'science'] };
  assert.deepEqual(E.step(a, p), E.step(b, p));
});

test('storm sources: LIVE data is used when provided, labelled', () => {
  const lay = autoLayout('m3', 'plain', ['crew', 'oxygen', 'solar', 'shelter']);
  const live = { fetched: '2026-11-20', flares: [{ cls: 'X2.1', peak: '2026-11-11T10:00Z', strength: 2 }, { cls: 'M4.0', peak: '2026-11-15T01:00Z', strength: 1 }] };
  const s = E.createMission('m3', 'plain', lay, { seed: 3, live });
  s.events.filter((e) => e.type === 'storm').forEach((e) => {
    assert.equal(e.source, 'LIVE');
    assert.match(e.label, /LIVE/);
    assert.ok(['X2.1', 'M4.0'].includes(e.cls));
  });
  const offline = E.createMission('m3', 'plain', lay, { seed: 3 });
  offline.events.filter((e) => e.type === 'storm').forEach((e) => assert.ok(['ARCHIVE', 'PRACTICE'].includes(e.source)));
});

test('Mars: dust storm halves solar power', () => {
  const lay = autoLayout('m6', 'jezero', ['crew', 'oxygen', 'solar', 'greenhouse', 'solar']);
  const s = E.createMission('m6', 'jezero', lay, { seed: 2 });
  const dust = s.events.find((e) => e.type === 'dust');
  assert.ok(dust);
  assert.equal(E.solarOutput(s, dust.day), Math.floor(E.solarOutput(s, 1) / 2));
});

test('communication delay: Moon advice is instant, Mars advice arrives next day', () => {
  const moon = E.requestAdvice(base('m1', 'flats', ['crew', 'oxygen', 'solar']));
  assert.ok(moon.advice.ready && !moon.advice.pending);
  const lay = autoLayout('m6', 'jezero', ['crew', 'oxygen', 'solar', 'greenhouse']);
  let mars = E.requestAdvice(E.createMission('m6', 'jezero', lay, { seed: 1 }));
  assert.ok(mars.advice.pending && !mars.advice.ready);
  assert.equal(mars.advice.pending.forDay, 1);
  mars = E.step(mars, { on: {}, jobs: ['tune', 'garden', 'rest'] });
  assert.ok(mars.advice.ready, 'answer arrives on day 2');
  assert.equal(mars.advice.ready.forDay, 1, 'and it is about yesterday');
});

test('advice uses are limited', () => {
  let s = base('m1', 'flats', ['crew', 'oxygen', 'solar']);
  for (let i = 0; i < 5; i++) s = E.requestAdvice(s);
  assert.equal(s.advice.used, E.ADVICE_PER_MISSION);
});

test('sunny pad gives solar bonus; placement rules', () => {
  const sunny = E.createMission('m1', 'flats', [{ type: 'crew', pad: 1 }, { type: 'oxygen', pad: 5 }, { type: 'solar', pad: 2 }]);
  const plainPad = E.createMission('m1', 'flats', [{ type: 'crew', pad: 1 }, { type: 'oxygen', pad: 5 }, { type: 'solar', pad: 7 }]);
  assert.equal(E.solarOutput(sunny), 4);
  assert.equal(E.solarOutput(plainPad), 3);
  assert.equal(E.canPlace('m1', 'flats', [], 'solar', 3).ok, false);
  assert.equal(E.canPlace('m5', 'malapert', [], 'ice', 3).ok, true);
  assert.equal(E.canPlace('m6', 'jezero', [], 'ice', 3).ok, false, 'no ice at Jezero');
  assert.deepEqual(E.validateLayout('m1', 'flats', [{ type: 'crew', pad: 0 }]).missing, ['oxygen', 'solar']);
});

test('ice digger boosts oxygen and greenhouse', () => {
  const lay = autoLayout('m5', 'mouton', ['crew', 'oxygen', 'solar', 'ice', 'greenhouse', 'solar']);
  const s0 = E.createMission('m5', 'mouton', lay);
  const on = E.step(s0, { on: { oxygen: true, ice: true, greenhouse: true }, jobs: ['rest', 'rest', 'rest'] });
  const off = E.step(s0, { on: { oxygen: true, ice: false, greenhouse: true }, jobs: ['rest', 'rest', 'rest'] });
  assert.equal(on.res.air - off.res.air, 1);
  assert.equal(on.res.food - off.res.food, 1);
});

test('role bonus doubles a matching job', () => {
  const s0 = base('m2', 'flats', ['crew', 'oxygen', 'solar', 'greenhouse', 'solar']);
  const botanist = E.step(s0, { on: {}, jobs: ['rest', 'garden', 'rest'] });
  const engineer = E.step(s0, { on: {}, jobs: ['garden', 'rest', 'rest'] });
  assert.equal(botanist.res.food - engineer.res.food, 1);
});

test('stars: 1 win, 2 healthy & nobody grounded, 3 + science', () => {
  const s = base('m1', 'flats', ['crew', 'oxygen', 'solar']);
  const M = E.mission('m1');
  const won = JSON.parse(JSON.stringify(s));
  won.status = 'won'; won.res.hearts = M.healthGoal; won.res.science = M.scienceGoal;
  assert.equal(E.stars(won), 3);
  won.res.science = 0; assert.equal(E.stars(won), 2);
  won.grounded[0] = true; assert.equal(E.stars(won), 1);
});

test('every Journal id referenced by missions or the engine exists', () => {
  const L = require('../src/data/logbook.js');
  const O = require('../src/data/osdr-studies.js');
  const ids = new Set(L.ENTRIES.map((e) => e.id).concat(O.studies.map((s) => s.id)));
  C.MISSIONS.forEach((M) => M.logbook.forEach((id) => assert.ok(ids.has(id), M.id + ' journal ' + id)));
  ['lunar-day', 'flare', 'ice', 'plants', 'mars-dust', 'mars-delay', 'radiation'].forEach((id) => assert.ok(ids.has(id), 'engine fact ' + id));
  L.ENTRIES.forEach((e) => { assert.ok(e.source && e.text && e.title); assert.ok(e.text.length < 280, e.id + ' is short'); });
  O.studies.forEach((s) => assert.match(s.accession, /^OSD-\d+$/));
});
