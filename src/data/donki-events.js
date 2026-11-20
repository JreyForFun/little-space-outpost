/* PLACEHOLDER - real NASA/CCMC DONKI events have not been downloaded yet.
 * Run:  python tools/fetch_donki.py [NASA_API_KEY]   (or: npm run donki)
 * Until then, storm missions use clearly labelled "practice" events (see src/sim/engine.js). */
(function (root) {
  const DATA = { source: 'NASA/CCMC DONKI via api.nasa.gov', retrieved: null, periods: [] };
  if (typeof module === 'object' && module.exports) module.exports = DATA;
  else root.OUTPOST_DONKI = DATA;
})(typeof self !== 'undefined' ? self : this);
