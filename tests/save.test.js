const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/sim/save.js');

const mem = (init) => {
  const m = new Map(init ? [[S.KEY, init]] : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m };
};

test('fresh save unlocks only mission 1', () => {
  const s = S.create(mem());
  assert.equal(s.isUnlocked(0), true);
  assert.equal(s.isUnlocked(1), false);
  assert.equal(s.notice, null);
});

test('results persist and keep the best stars', () => {
  const store = mem();
  const s = S.create(store);
  assert.deepEqual(s.recordResult(0, 'm1', 2), { newBest: true, unlockedNext: true });
  assert.deepEqual(s.recordResult(0, 'm1', 1), { newBest: false, unlockedNext: false });
  s.unlockFacts(['air', 'air', 'solar']);
  s.setSetting('voice', false);
  const again = S.create(store);
  assert.equal(again.starsFor('m1'), 2);
  assert.equal(again.isUnlocked(1), true);
  assert.deepEqual(again.data.logbook, ['air', 'solar']);
  assert.equal(again.data.settings.voice, false);
});

test('a lost mission (0 stars) does not unlock the next', () => {
  const s = S.create(mem());
  s.recordResult(0, 'm1', 0);
  assert.equal(s.isUnlocked(1), false);
});

test('corrupt or old saves start fresh with a notice', () => {
  for (const bad of ['{not json', JSON.stringify({ version: 1, unlocked: 3, stars: {}, logbook: [], settings: {} })]) {
    const s = S.create(mem(bad));
    assert.equal(s.data.unlocked, 1);
    assert.ok(s.notice);
  }
});

test('storage that throws still lets the game run', () => {
  const s = S.create({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.equal(s.recordResult(0, 'm1', 3).unlockedNext, true);
  assert.equal(s.isUnlocked(1), true);
});

test('storms faced are remembered once', () => {
  const store = mem();
  const s = S.create(store);
  s.recordStorm({ source: 'LIVE', cls: 'X1.1', date: '2026-11-10', strength: 2 });
  s.recordStorm({ source: 'LIVE', cls: 'X1.1', date: '2026-11-10', strength: 2 });
  assert.equal(S.create(store).data.storms.length, 1);
});
