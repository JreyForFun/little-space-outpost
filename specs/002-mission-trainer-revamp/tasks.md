# Tasks: Junior Astronaut Mission Trainer Revamp

**Plan summary**: Keep the architecture (pure `src/sim` engine with Phaser scenes as the view). Add:

- `src/audio.js` (WebAudio synth);
- `src/live.js` (DONKI fetch and cache);
- `src/data/osdr-studies.js`;
- new scenes: Title, Briefing and Journal (Journal replaces Logbook).

Art is regenerated with `tools/blender/render_assets.py` and `tools/compose_sheets.py`.
Constitution check: passes v2.0.0. The only new runtime request is the optional NASA DONKI call
(Principle II). There are no new dependencies; the fonts are bundled files.

## Phase 1: Foundations

- [x] T001 Write the art direction document `docs/ART-DIRECTION.md`.
- [x] T002 [P] Bundle the Fredoka and Nunito fonts with their OFL licenses in `assets/fonts/`, and
  load them before the game starts.
- [x] T003 [P] Add the WebAudio music and SFX engine in `src/audio.js`, with persistent toggles.

## Phase 2: Simulation v3 (US2, US3, US4, US5)

- [x] T004 Rework the content: 3 core resources, per-crew dose, 5 jobs, Ice Digger as a booster,
  the Mars site and mission 6, and seeded event slots.
- [x] T005 Rework the engine: dose, grounding, seeded storms and dust, `advise()` with
  communication delay, and live/archive event pools.
- [x] T006 Update the unit and balance tests to cover several seeds.

## Phase 3: Real data (US3, US6)

- [x] T007 Add `src/live.js`: live DONKI flares (last 30 days), a 6-hour cache, labels, and
  mapping to the game's storm scale.
- [x] T008 [P] Add `tools/fetch_osdr.py`, which bundles `src/data/osdr-studies.js`, plus the
  Journal health cards.

## Phase 4: Art (US1, US5)

- [x] T009 Render the chibi crew with faces: sprite sheets plus portraits with 3 expressions.
- [x] T010 Render the ASTRO robot: a sprite plus portraits with 4 expressions.
- [x] T011 Use a vibrant palette for buildings and terrain, and render the Mars site and map.
- [x] T012 Compose the nebula skies and render the tiny-planet title diorama.

## Phase 5: Scenes (US1, US4, US6)

- [x] T013 Add the UI theme (glass panels, chunky buttons, meters) and polish (motion, particles,
  glows).
- [x] T014 Add the Title scene and the Today's Sun card.
- [x] T015 Add the Briefing scene (dialogues) and the mission patches.
- [x] T016 Build the Mission HUD v3: 3 meters, hearts, crew dose and expressions, Ask Mission
  Control, and day/night with the sky.
- [x] T017 Restyle Campaign, Explore, Build and Results, and turn the Logbook into the Journal.

## Phase 6: Verify

- [x] T018 Update the E2E playtest, the README and DATA-SOURCES, check performance, and fix any
  issues.
