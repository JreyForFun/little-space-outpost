/*
 * GAME CONTENT - buildings, crew jobs, sites and the six campaign missions.
 * Pure data: no Phaser, no art paths. Loaded in the browser (window.OUTPOST_CONTENT)
 * and in Node tests (require).
 *
 * Design rule (2026 Space Apps challenge guidance): only THREE core meters - POWER, AIR, FOOD.
 * Radiation is tracked per astronaut (dose in mSv), crew health is team hearts, and the shelter's
 * shield charge lives on the shelter.
 *
 * Time scale (simplified, shown in-game): one mission "day" step = about 2 Earth days.
 */
(function (root) {
  const DAY_IN_EARTH_DAYS = 2;

  // ------------------------------------------------------------------ core rules
  const CAPS = { air: 12, food: 16, shield: 3, hearts: 10 };
  const CREW_NEEDS = { air: 2, food: 2 }; // whole crew, per day step
  const SHORTAGE_HARM = { air: 4, food: 2 }; // hearts lost when a need is not met
  const INDOOR_FACTOR = 0.5; // habitat walls block part of the radiation (simplified)
  const STORM_DOSE = 10; // mSv per unblocked storm strength point (simplified)

  // Real measured surface radiation (dose equivalent, mSv per Earth day)
  const DOSE_RATES = {
    moon: { perDay: 1.37, source: 'Chang’e-4 Lunar Lander Neutrons & Dosimetry (Zhang et al., Science Advances 2020): 1,369 µSv/day' },
    mars: { perDay: 0.64, source: 'NASA Curiosity Radiation Assessment Detector (Hassler et al., Science 2014): 0.64 mSv/day' },
  };

  // ------------------------------------------------------------------ buildings
  // priority: when power runs short, LOWER numbers get power first (life support first).
  const BUILDINGS = {
    crew: {
      name: 'Crew Habitat', short: 'Habitat', cost: 3, max: 1, allowedTags: ['flat'],
      power: 1, priority: 0, capacity: 4, toggle: false,
      about: 'Home for the crew. Uses 1 power a day, stores 4 power, and its walls block some radiation.',
    },
    oxygen: {
      name: 'Oxygen Maker', short: 'Oxygen', cost: 3, max: 1, allowedTags: ['flat'],
      power: 2, outputs: { air: 3 }, iceBonus: { air: 1 }, priority: 1, toggle: true,
      about: 'Splits water into oxygen. Uses 2 power, makes 3 air.',
    },
    ice: {
      name: 'Ice Digger', short: 'Ice', cost: 3, max: 1, allowedTags: ['shaded'], needsIce: true,
      power: 1, priority: 2, toggle: true,
      about: 'Digs frozen water. Uses 1 power. With fresh water, the Oxygen Maker makes +1 air and the Greenhouse +1 food.',
    },
    greenhouse: {
      name: 'Greenhouse', short: 'Garden', cost: 4, max: 1, allowedTags: ['flat', 'sunny'],
      power: 2, outputs: { food: 2, science: 1 }, iceBonus: { food: 1 }, priority: 3, toggle: true,
      about: 'Grows food under lights. Uses 2 power, makes 2 food and 1 science.',
    },
    solar: {
      name: 'Solar Panels', short: 'Solar', cost: 2, max: 4, allowedTags: ['sunny', 'flat'], bonusTag: 'sunny',
      toggle: false,
      about: 'Makes power when the Sun is up (more on a sunny spot). Nothing at night!',
    },
    battery: {
      name: 'Battery Bank', short: 'Battery', cost: 2, max: 3, allowedTags: ['flat', 'shaded'],
      capacity: 6, toggle: false,
      about: 'Stores 6 more power for the night.',
    },
    shelter: {
      name: 'Radiation Shelter', short: 'Shelter', cost: 3, max: 1, allowedTags: ['shaded', 'flat'], bonusTag: 'shaded',
      toggle: false,
      about: 'Charge it before a solar storm. Each shield blocks one storm point (holds 3, or 4 on a shaded spot).',
    },
  };
  const BUILD_ORDER = ['crew', 'solar', 'battery', 'oxygen', 'ice', 'greenhouse', 'shelter'];

  // ------------------------------------------------------------------ crew + jobs
  const CREW = [
    { id: 'coral', name: 'Rio', role: 'engineer', roleName: 'Engineer' },
    { id: 'sage', name: 'Sage', role: 'botanist', roleName: 'Botanist' },
    { id: 'lavender', name: 'Lumi', role: 'geologist', roleName: 'Geologist' },
  ];
  // outdoor jobs earn the full radiation dose; indoor jobs get habitat protection
  const JOBS = {
    tune: { label: 'Tune panels', role: 'engineer', needs: 'solar', icon: 'energy', outdoor: true, about: '+1 power on a sunny day (outside)' },
    shelter: { label: 'Charge shelter', role: 'engineer', needs: 'shelter', icon: 'shield', outdoor: false, about: '+1 shield, uses 1 power (inside)' },
    garden: { label: 'Tend garden', role: 'botanist', needs: 'greenhouse', icon: 'food', outdoor: false, about: '+1 food if the garden runs (inside)' },
    science: { label: 'Field science', role: 'geologist', icon: 'science', outdoor: true, about: '+1 science (outside: more radiation!)' },
    rest: { label: 'Rest', role: null, icon: 'health', outdoor: false, about: 'crew heals 1 heart a day (inside)' },
  };
  const JOB_ORDER = ['tune', 'shelter', 'garden', 'science', 'rest'];

  // ------------------------------------------------------------------ build pads
  const PAD_SETS = {
    plain: [['flat', 'sunny'], ['flat'], ['sunny'], ['shaded'], ['shaded'], ['flat'], ['flat', 'sunny'], ['flat'], ['flat', 'sunny']],
    ridge: [['flat', 'sunny'], ['flat', 'sunny'], ['sunny'], ['shaded'], ['flat'], ['flat', 'sunny'], ['flat', 'sunny'], ['flat'], ['sunny']],
    crater: [['flat'], ['flat'], ['shaded'], ['shaded'], ['shaded'], ['flat'], ['flat', 'sunny'], ['flat'], ['shaded']],
  };

  // ------------------------------------------------------------------ sites
  // light: day d is lit when (d - 1 + offset) mod cycle < lit   (cycle 14 ~ one lunar day+night)
  // solar: power per panel on a lit day (+1 on a sunny pad). body: 'moon' | 'mars' (dose, comm delay)
  const moonLight = { cycle: 14, lit: 7 };
  const SITES = {
    flats: { body: 'moon', name: 'Landing Flats', safe: true, x: 300, y: 500, padSet: 'plain', ice: 0, solar: 3, light: moonLight,
      traits: ['Smooth ground', 'Sun: half the time', 'No ice'], report: 'Smooth, steady ground near the Moon’s equator. Sunny now, but a long night will come.' },
    plain: { body: 'moon', name: 'Quiet Plain', safe: true, x: 620, y: 545, padSet: 'plain', ice: 0, solar: 3, light: moonLight,
      traits: ['Open ground', 'Sun: half the time', 'No ice'], report: 'Open, flat ground that is easy for the crew to reach.' },
    basin: { body: 'moon', name: 'Sunny Basin', safe: true, x: 930, y: 500, padSet: 'ridge', ice: 0, solar: 3, light: moonLight,
      traits: ['Many sunny spots', 'Sun: half the time', 'No ice'], report: 'Level ground with lots of sunny spots for solar panels.' },
    rim: { body: 'moon', name: 'Crater Rim', safe: false, x: 480, y: 420, padSet: 'plain', ice: 0, solar: 3, light: moonLight,
      traits: ['Too steep'], report: 'Too steep and crumbly for a safe home. Let’s scout another spot!' },
    boulders: { body: 'moon', name: 'Boulder Field', safe: false, x: 820, y: 430, padSet: 'plain', ice: 0, solar: 3, light: moonLight,
      traits: ['Blocked by boulders'], report: 'Big boulders block the builders. Let’s find a clearer spot!' },
    // Moon south pole - real Artemis III candidate region names (NASA, 2024)
    malapert: { body: 'moon', name: 'Malapert Massif', region: 'Artemis III candidate region', safe: true, x: 330, y: 470, padSet: 'ridge', ice: 1, solar: 3,
      light: { cycle: 14, lit: 12 }, traits: ['Sunlit ridge', 'Sun: almost always', 'Little ice'],
      report: 'A tall mountain ridge that stays sunny most of the time. Ice is far away.' },
    mouton: { body: 'moon', name: 'Mons Mouton Plateau', region: 'Artemis III candidate region', safe: true, x: 650, y: 520, padSet: 'plain', ice: 2, solar: 3,
      light: { cycle: 14, lit: 10 }, traits: ['Flat plateau', 'Sun: most of the time', 'Some ice'],
      report: 'A wide, flat-topped mountain. Lots of sun and some ice in nearby shadows.' },
    haworth: { body: 'moon', name: 'Haworth', region: 'Artemis III candidate region', safe: true, x: 960, y: 480, padSet: 'crater', ice: 3, solar: 3,
      light: { cycle: 14, lit: 6 }, traits: ['Crater edge', 'Sun: less than half', 'Lots of ice'],
      report: 'Next to a big shadowed crater full of ice, but the Sun hides behind the hills for long stretches.' },
    shackleton: { body: 'moon', name: 'Shackleton Crater floor', safe: false, x: 1120, y: 560, padSet: 'crater', ice: 3, solar: 3,
      light: { cycle: 14, lit: 0 }, traits: ['Always dark', 'Super cold'],
      report: 'Sunlight never reaches this crater floor. It is colder than −170 °C. Too dark and cold to land!' },
    // Mars - real places (NASA Perseverance landing site; SWIM buried-ice study region)
    jezero: { body: 'mars', name: 'Jezero Crater', region: 'Perseverance rover landing site', safe: true, x: 330, y: 480, padSet: 'ridge', ice: 0, solar: 2,
      light: { cycle: 1, lit: 1 }, traits: ['Ancient lake bed', 'Weaker sunlight', 'No ice'],
      report: 'An old lake bed where NASA’s Perseverance rover explores. Sunlight on Mars is weaker than on the Moon.' },
    arcadia: { body: 'mars', name: 'Arcadia Planitia', region: 'NASA buried-ice mapping area (SWIM)', safe: true, x: 690, y: 530, padSet: 'crater', ice: 2, solar: 2,
      light: { cycle: 1, lit: 1 }, traits: ['Flat plains', 'Ice under the ground', 'Fewer sunny spots'],
      report: 'Wide plains with ice hiding just under the dust. Great for water, but fewer sunny spots.' },
    valles: { body: 'mars', name: 'Valles Marineris cliffs', safe: false, x: 1010, y: 470, padSet: 'plain', ice: 0, solar: 2,
      light: { cycle: 1, lit: 1 }, traits: ['Giant canyon', 'Steep cliffs'],
      report: 'A canyon longer than the USA is wide! The cliffs are far too steep to land on.' },
  };
  const COMM_DELAY = {
    moon: { days: 0, oneWay: '1.3 seconds', seconds: 1.3 },
    mars: { days: 1, oneWay: '3 to 22 minutes', seconds: 12.5 * 60 },
  };

  // ------------------------------------------------------------------ campaign
  // storms: each picks a seeded day in `window` and a real flare (LIVE > ARCHIVE > PRACTICE)
  const MISSIONS = [
    {
      id: 'm1', title: 'First Breath', concept: 'Power & air', map: 'equator', body: 'moon',
      days: 6, sites: ['flats', 'plain', 'rim'], buildings: ['crew', 'solar', 'battery', 'oxygen'],
      required: ['crew', 'oxygen', 'solar'], budget: 10,
      start: { power: 3, air: 4, food: 12, hearts: 10 }, lightOffset: 0, doseLimit: 14,
      storms: [], healthGoal: 9, scienceGoal: 8, tutorial: true, logbook: ['air', 'solar', 'radio'],
      patch: { color: 0x4fd6ff, icon: 'air' },
    },
    {
      id: 'm2', title: 'Moon Garden', concept: 'Food vs. power', map: 'equator', body: 'moon',
      days: 8, sites: ['flats', 'basin', 'boulders'], buildings: ['crew', 'solar', 'battery', 'oxygen', 'greenhouse'],
      required: ['crew', 'oxygen', 'solar', 'greenhouse'], budget: 15,
      start: { power: 3, air: 8, food: 6, hearts: 10 }, lightOffset: 0, doseLimit: 17,
      storms: [], healthGoal: 9, scienceGoal: 14, logbook: ['plants', 'osdr-veggie'],
      patch: { color: 0x7ee36b, icon: 'food' },
    },
    {
      id: 'm3', title: 'Storm Watch', concept: 'Radiation shielding', map: 'equator', body: 'moon',
      days: 8, sites: ['plain', 'basin', 'rim'], buildings: ['crew', 'solar', 'battery', 'oxygen', 'greenhouse', 'shelter'],
      required: ['crew', 'oxygen', 'solar', 'shelter'], budget: 17,
      start: { power: 4, air: 8, food: 10, hearts: 10 }, lightOffset: 0, doseLimit: 22,
      storms: [{ window: [3, 5], period: 'oct2024', minStrength: 2 }, { window: [6, 8], period: 'oct2024' }],
      healthGoal: 8, scienceGoal: 12, logbook: ['flare', 'radiation', 'donki'],
      patch: { color: 0xff7a59, icon: 'shield' },
    },
    {
      id: 'm4', title: 'The Long Night', concept: 'Lunar night & batteries', map: 'equator', body: 'moon',
      days: 12, sites: ['flats', 'plain', 'basin', 'boulders'], buildings: ['crew', 'solar', 'battery', 'oxygen', 'greenhouse', 'shelter'],
      required: ['crew', 'oxygen', 'solar', 'battery'], budget: 20,
      start: { power: 4, air: 10, food: 12, hearts: 10 }, lightOffset: 2, doseLimit: 26,
      storms: [{ window: [8, 11], period: 'may2024' }],
      healthGoal: 8, scienceGoal: 16, logbook: ['lunar-day', 'battery', 'cold'],
      patch: { color: 0x8f7bff, icon: 'night' },
    },
    {
      id: 'm5', title: 'Ridge of Light', concept: 'South-pole ice & sunlight', map: 'pole', body: 'moon',
      days: 12, sites: ['malapert', 'mouton', 'haworth', 'shackleton'], buildings: ['crew', 'solar', 'battery', 'oxygen', 'ice', 'greenhouse', 'shelter'],
      required: ['crew', 'oxygen', 'solar', 'ice'], budget: 21,
      start: { power: 4, air: 8, food: 10, hearts: 10 }, lightOffset: 0, doseLimit: 26,
      storms: [{ window: [6, 10], period: 'sep2017' }],
      healthGoal: 8, scienceGoal: 18, logbook: ['south-pole', 'ice', 'artemis', 'osdr-bone'],
      patch: { color: 0xffd23f, icon: 'sun' },
    },
    {
      id: 'm6', title: 'Red Planet', concept: 'Mars: dust & radio delay', map: 'mars', body: 'mars',
      days: 12, sites: ['jezero', 'arcadia', 'valles'], buildings: ['crew', 'solar', 'battery', 'oxygen', 'ice', 'greenhouse', 'shelter'],
      required: ['crew', 'oxygen', 'solar', 'greenhouse'], budget: 23,
      start: { power: 4, air: 10, food: 10, hearts: 10 }, lightOffset: 0, doseLimit: 14,
      storms: [{ window: [8, 11], period: 'may2024' }], dust: { window: [4, 7], length: 3 },
      healthGoal: 8, scienceGoal: 18, logbook: ['mars-delay', 'mars-dust', 'mars-radiation'],
      patch: { color: 0xff8a5c, icon: 'radio' },
    },
  ];

  // Practice flares, used only when no real data is available (always labelled PRACTICE)
  const PRACTICE_FLARES = [
    { cls: 'M5.0', strength: 1 }, { cls: 'X1.5', strength: 2 }, { cls: 'X3.0', strength: 2 }, { cls: 'X5.0', strength: 3 },
  ];

  const CONTENT = {
    DAY_IN_EARTH_DAYS, CAPS, CREW_NEEDS, SHORTAGE_HARM, INDOOR_FACTOR, STORM_DOSE, DOSE_RATES, COMM_DELAY,
    BUILDINGS, BUILD_ORDER, CREW, JOBS, JOB_ORDER, PAD_SETS, SITES, MISSIONS, PRACTICE_FLARES,
  };
  if (typeof module === 'object' && module.exports) module.exports = CONTENT;
  else root.OUTPOST_CONTENT = CONTENT;
})(typeof self !== 'undefined' ? self : this);
