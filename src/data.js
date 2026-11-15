/* Game data: text, map areas, build pads, buildings, resources. No artwork paths in here. */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  NS.W = 1280;
  NS.H = 720;
  NS.GUIDE = 'bluey'; // ASTRO, the guide
  NS.CREW = ['coral', 'sage', 'lavender']; // the player's crew of three
  NS.STORY = {
    exploreIntro: 'ASTRO here, Commander! Help our crew find a steady home for their first Moon garden.',
    buildWelcome: 'Welcome to {site}, Commander! Let’s build a safe home for our Moon garden crew.',
    buildComplete: 'Moon Camp is ready! Now let’s help the crew protect their first garden experiment.',
    missionIntro: 'Five Moon days, one tiny garden, and a crew counting on you. Let’s make a plan!',
    missionDays: [
      'Day 1: The crew plants its first seeds. Grow lights need power, and the crew needs food.',
      'Day 2: The garden is waking up! Choose what Moon Camp needs most today.',
      'Day 3: The crew checks the air, tends the plants, and watches the sky.',
      'Day 4: The garden is growing. Keep an eye on supplies as the mission rolls on.',
      'Day 5: Final day! Help the crew finish their Moon garden experiment safely.',
    ],
  };

  // ---- EXPLORE: places on the Moon map (game coordinates)
  NS.AREAS = [
    { id: 'A', name: 'Landing Flats', x: 300, y: 500, ok: true, report: 'Smooth, steady ground with room for Moon Camp.' },
    { id: 'B', name: 'Quiet Plain', x: 600, y: 540, ok: true, report: 'Open ground that is easy for the crew to reach.' },
    { id: 'C', name: 'Sunny Basin', x: 930, y: 500, ok: true, report: 'Level ground with long hours of sunlight for panels.' },
    { id: 'D', name: 'Crater Rim', x: 480, y: 420, ok: false, report: 'Too steep and unstable for a safe home. Let’s scout another spot!' },
    { id: 'E', name: 'Boulder Field', x: 820, y: 430, ok: false, report: 'Big boulders block the builders. Let’s find a clearer spot!' },
    { id: 'F', name: 'Deep Crater', x: 1100, y: 470, ok: false, report: 'This crater floor is not a safe place for the crew to build.' },
  ];

  // ---- BUILD: pads on the outpost site. tags decide which buildings may go where
  NS.PADS = [
    { x: 380, y: 410, tags: ['flat', 'sunny'] },
    { x: 610, y: 410, tags: ['flat'] },
    { x: 840, y: 410, tags: ['sunny'] },
    { x: 1070, y: 410, tags: ['shaded'] },
    { x: 270, y: 540, tags: ['shaded'] },
    { x: 495, y: 540, tags: ['flat'] },
    { x: 720, y: 540, tags: ['flat', 'sunny'] },
    { x: 945, y: 540, tags: ['flat'] },
    { x: 1160, y: 540, tags: ['flat', 'sunny'] },
  ];
  NS.PAD_RX = 84;
  NS.PAD_RY = 27;

  NS.TAG_WHY = {
    flat: 'the ground here is too rough',
    sunny: 'this spot gets too little sunlight',
    shaded: 'this spot is too exposed for a shelter',
  };

  // ---- BUILD: the five structures (order = suggested build order)
  NS.BUILD_ORDER = ['crew', 'oxygen', 'solar', 'shelter', 'greenhouse'];
  NS.BUILDINGS = {
    crew: {
      name: 'Crew Habitat',
      needs: 'flat',
      select: 'Choose a safe spot',
      intro: 'The crew needs a sturdy home on the Moon. Let’s build their safe place to live and work!',
      action: 'btn.placeBuilding',
      working: 'The habitat team is at work',
      ready: 'Habitat ready! The crew has a safe home.',
      seconds: 3.0,
      grants: 'supplies',
    },
    oxygen: {
      name: 'Oxygen System',
      needs: 'flat',
      select: 'Find an equipment spot',
      intro: 'There is no breathable air outside on the Moon. This system gives the crew air inside.',
      action: 'btn.activateEquipment',
      working: 'The air system is coming online',
      ready: 'Air system online! The crew can breathe inside.',
      seconds: 2.6,
      grants: 'oxygen',
    },
    solar: {
      name: 'Solar Panels',
      needs: 'sunny',
      select: 'Choose a sunny spot',
      intro: 'Solar panels turn sunlight into power. Pick a sunny spot to charge Moon Camp!',
      action: 'btn.activatePanels',
      working: 'The crew is mounting solar panels',
      ready: 'Panels are catching sunlight! Power is flowing.',
      seconds: 2.6,
      grants: 'power',
    },
    shelter: {
      name: 'Radiation Shelter',
      needs: 'shaded',
      select: 'Choose a shelter spot',
      intro: 'Solar storms can bring radiation. A shielded shelter gives the crew a safer place.',
      action: 'btn.placeShelter',
      working: 'The crew is reinforcing the shelter',
      ready: 'Shelter ready! The crew has a place to ride out a solar storm.',
      seconds: 3.0,
      grants: 'protection',
    },
    greenhouse: {
      name: 'Greenhouse',
      needs: 'flat',
      select: 'Choose a growing spot',
      intro: 'The Moon garden starts here! The greenhouse needs power and crew supplies.',
      action: 'btn.activateGreenhouse',
      working: 'The crew is planting the first seed trays',
      ready: 'Seeds are planted! The Moon garden experiment is underway.',
      seconds: 3.2,
      grants: 'food',
      requires: ['power', 'supplies'],
    },
  };

  // HUD chips, in display order (chip art key per resource)
  NS.RESOURCES = [
    { key: 'oxygen', chip: 'chip.oxygenOnline' },
    { key: 'power', chip: 'chip.powerAvailable' },
    { key: 'supplies', chip: 'chip.suppliesReady' },
    { key: 'protection', chip: 'chip.protectionReady' },
    { key: 'food', chip: 'chip.foodResearchActive' },
  ];
  NS.NEEDS_CHIP = { power: 'chip.needsPower', supplies: 'chip.needsSupplies' };
  NS.HAVE_CHIP = { power: 'chip.powerAvailable', supplies: 'chip.suppliesReady' };

  // ---- shared game state, carried between scenes
  const params = new URLSearchParams(location.search);
  NS.FAST = params.has('fast'); // ?fast shortens timers (used for testing)
  NS.freshState = () => ({
    site: null,
    built: { crew: false, oxygen: false, solar: false, shelter: false, greenhouse: false },
    res: { oxygen: false, power: false, supplies: false, protection: false, food: false },
    mission: null,
  });
  NS.state = NS.freshState();
})();
