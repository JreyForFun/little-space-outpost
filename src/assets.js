/*
 * THE ASSET LIST  -  the only place that knows about artwork files.
 *
 * Every sprite the game draws is loaded from this list and looked up by key.
 * To swap in new art: overwrite the PNG at `path` (keep the same canvas size),
 * or point `path` at a new file. Display size/origin live here too, so game
 * logic never contains pixel numbers for artwork.
 *
 *   width   = displayed width in game pixels (height follows the aspect ratio)
 *   scale   = alternative to width: plain scale factor
 *   origin  = [x, y] anchor (0..1)
 *
 * Building variants share one 384x272 canvas and one ground anchor
 * (shadow centre, ~86% down), so idle / ghost / build / ready line up exactly.
 */
(function () {
  const NS = (window.OUTPOST = window.OUTPOST || {});

  const BUILDING_IDS = ['crew', 'oxygen', 'solar', 'shelter', 'greenhouse'];
  const BUILDING_VARIANTS = ['idle', 'ghost', 'build', 'ready'];
  const CREW_COLORS = ['blueberry', 'bluey', 'coral', 'lavender', 'sage'];

  const images = {
    // --- backdrops (1920x1080 art shown at the 1280x720 game size)
    'bg.explore': { path: 'assets/environment/moon_explore2.png', width: 1280, origin: [0, 0] },
    'bg.site': { path: 'assets/environment/moon_site.png', width: 1280, origin: [0, 0] },

    // --- building selector cards (Choose your building)
    'card.crew': { path: 'assets/ui/card_crew.png', width: 150 },
    'card.oxygen': { path: 'assets/ui/card_oxygen.png', width: 150 },
    'card.solar': { path: 'assets/ui/card_solar.png', width: 150 },
    'card.shelter': { path: 'assets/ui/card_shelter.png', width: 150 },
    'card.greenhouse': { path: 'assets/ui/card_greenhouse.png', width: 150 },

    // --- action buttons (text is part of the art)
    'btn.selectLocation': { path: 'assets/ui/btn_select_location.png', width: 300 },
    'btn.placeBuilding': { path: 'assets/ui/btn_place_building.png', width: 300 },
    'btn.activateEquipment': { path: 'assets/ui/btn_activate_equipment.png', width: 300 },
    'btn.activatePanels': { path: 'assets/ui/btn_activate_panels.png', width: 300 },
    'btn.placeShelter': { path: 'assets/ui/btn_place_shelter.png', width: 300 },
    'btn.activateGreenhouse': { path: 'assets/ui/btn_activate_greenhouse.png', width: 300 },
    'btn.confirm': { path: 'assets/ui/btn_confirm.png', width: 250 },
    'btn.cancel': { path: 'assets/ui/btn_cancel.png', width: 200 },
    'btn.needResources': { path: 'assets/ui/btn_need_resources.png', width: 300 },

    // --- resource / system chips
    'chip.oxygenOnline': { path: 'assets/ui/chip_oxygen_online.png', width: 196 },
    'chip.powerAvailable': { path: 'assets/ui/chip_power_available.png', width: 196 },
    'chip.suppliesReady': { path: 'assets/ui/chip_supplies_ready.png', width: 196 },
    'chip.foodResearchActive': { path: 'assets/ui/chip_food_research_active.png', width: 196 },
    'chip.protectionReady': { path: 'assets/ui/chip_protection_ready.png', width: 196 },
    'chip.solarEvent': { path: 'assets/ui/chip_solar_event.png', width: 196 },
    'chip.needsPower': { path: 'assets/ui/chip_needs_power.png', width: 150 },
    'chip.needsSupplies': { path: 'assets/ui/chip_needs_supplies.png', width: 150 },

    // --- placement feedback (ground ring + badge); origin sits on the ring centre
    'marker.valid': { path: 'assets/ui/marker_valid.png', width: 168, origin: [0.5, 0.74] },
    'marker.invalid': { path: 'assets/ui/marker_invalid.png', width: 168, origin: [0.5, 0.74] },
    'marker.rotate': { path: 'assets/ui/marker_rotate.png', width: 168, origin: [0.5, 0.74] },

    // --- ready for the Survive stage (not used yet)
    'panel.solarEvent': { path: 'assets/ui/panel_solar_event.png', width: 520 },
  };

  // buildings: building.<id>.<idle|ghost|build|ready>
  BUILDING_IDS.forEach((id) => {
    BUILDING_VARIANTS.forEach((v) => {
      images[`building.${id}.${v}`] = { path: `assets/buildings/${id}_${v}.png`, scale: 0.56, origin: [0.5, 0.86] };
    });
  });

  // astronauts: 2048x512 sheets, 8 x 2 frames of 256px. row 1 = idle, row 2 = walk
  const spritesheets = {};
  CREW_COLORS.forEach((c) => {
    spritesheets[`astro.${c}`] = {
      path: `assets/astronauts/${c}.png`,
      frameWidth: 256,
      frameHeight: 256,
      idle: { start: 0, end: 7, fps: 6 },
      walk: { start: 8, end: 15, fps: 11 },
      scale: 0.42,
      origin: [0.5, 0.88], // feet
    };
  });

  NS.ASSETS = { images, spritesheets, walkSpeed: 120 /* px per second */ };

  // look up display settings for a key
  NS.meta = (key) => images[key] || spritesheets[key] || {};
})();
