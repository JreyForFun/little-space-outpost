/* Balance: across several seeds, every mission must be winnable with 3 stars, losable by neglect,
 * and not beatable (3 stars) by repeating one job (except the guided tutorial, mission 1). */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/sim/content.js');
const E = require('../src/sim/engine.js');
const P = require('./helpers/policies.js');

// Reference layouts found by the beam-search tuner (tests/helpers/policies.js)
const REFERENCE = {
  m1: ['flats', ['crew', 'oxygen', 'solar', 'battery']],
  m2: ['flats', ['crew', 'oxygen', 'solar', 'greenhouse', 'solar']],
  m3: ['plain', ['crew', 'oxygen', 'solar', 'shelter', 'battery', 'greenhouse']],
  m4: ['flats', ['crew', 'oxygen', 'solar', 'battery', 'greenhouse', 'shelter', 'solar']],
  m5: ['mouton', ['crew', 'oxygen', 'solar', 'ice', 'greenhouse', 'shelter', 'solar']],
  m6: ['jezero', ['crew', 'oxygen', 'solar', 'greenhouse', 'battery', 'battery', 'battery', 'shelter', 'solar']],
};
const SEEDS = [1, 2, 3];

C.MISSIONS.forEach((M) => {
  const [site, wanted] = REFERENCE[M.id];
  const layout = P.autoLayout(M.id, site, wanted);

  test(M.id + ' reference layout is legal', () => {
    assert.equal(layout.length, wanted.length);
    assert.ok(E.validateLayout(M.id, site, layout).ok);
  });

  test(M.id + ' a good plan wins with 3 stars (several seeds)', () => {
    SEEDS.forEach((seed) => {
      const best = P.beam(M.id, site, layout, 6, seed);
      assert.equal(E.stars(best), 3, 'seed ' + seed + ' ' + JSON.stringify(best.res) + ' dose ' + best.dose);
    });
  });

  test(M.id + ' neglect loses', () => {
    SEEDS.forEach((seed) => {
      const s = P.fixed(M.id, site, layout, (st) => ({
        on: Object.fromEntries(Object.keys(st.on).map((k) => [k, false])), jobs: ['science', 'science', 'science'],
      }), seed);
      assert.equal(s.status, 'lost', 'seed ' + seed);
    });
  });

  if (!M.tutorial) {
    test(M.id + ' no single repeated job earns 3 stars (any site, any layout)', () => {
      M.sites.filter((sid) => C.SITES[sid].safe).forEach((sid) => {
        P.candidateLayouts(M.id, sid).forEach((lay) => {
          C.JOB_ORDER.forEach((j) => {
            const s = P.fixed(M.id, sid, lay, () => ({ on: {}, jobs: [j, j, j] }), 1);
            assert.ok(E.stars(s) < 3, M.id + '/' + sid + ' job ' + j + ' got 3 stars');
          });
        });
      });
    });
  }
});
