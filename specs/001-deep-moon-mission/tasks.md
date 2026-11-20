# Tasks: Deep Moon Mission Campaign

**Input**: Design documents from `/specs/001-deep-moon-mission/`

**Prerequisites**: plan.md, spec.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel with other [P] tasks (different files, no dependencies).
- **[Story]**: the user story the task belongs to (US1–US6).

## Phase 1: Setup

- [x] T001 Add `npm test` (`node --test tests/`) and the `serve` script to `package.json`.
- [x] T002 [P] Create the `src/sim/`, `src/data/`, `tests/` and `tools/blender/` folders.
- [ ] T003 [P] Create `tools/fetch_donki.py` and bundle real events into *(script and cache done; the bundle is waiting on the NASA API rate limit, so a labelled placeholder is used until then)*
  `src/data/donki-events.js`, caching raw responses in `tools/donki-raw/`.

## Phase 2: Foundational (blocking)

- [x] T004 Write the content data: buildings, jobs, crew, sites and 6 missions in
  `src/sim/content.js`.
- [x] T005 Write the pure simulation in `src/sim/engine.js`: `createMission`, `step`, `forecast`,
  `stars`, `explainLoss`, `canAfford`/`validateLayout`.
- [x] T006 [P] Write the versioned save module with injected storage in `src/sim/save.js`.
- [x] T007 [P] Write the Moon Logbook entries with source notes in `src/data/logbook.js`.

## Phase 3: User Story 1 — Choices matter (P1) 🎯 MVP

- [x] T008 [P] [US1] Write engine unit tests in `tests/engine.test.js`: consumption, brownout
  priority, night, storms, shortages, determinism, rewind via snapshots.
- [x] T009 [US1] Rebuild `src/scenes/MissionScene.js`: resource HUD, base view with the real
  layout, system toggles, crew job picker, end-day flow, daily report, forecast strip, rewind.
- [x] T010 [US1] Add a cause-chain explanation on loss (engine `explainLoss` plus the Results UI).

## Phase 4: User Story 2 — Campaign (P1)

- [x] T011 [P] [US2] Write balance tests in `tests/balance.test.js`. For every mission, a
  beam-search plan wins with 3 stars, a neglect plan loses, and no repeated single job earns
  3 stars.
- [x] T012 [US2] Create `src/scenes/CampaignScene.js`: mission path, locks, stars, Logbook and
  settings buttons.
- [x] T013 [US2] Create `src/scenes/ResultsScene.js`: stars, best-result saving, unlocks,
  next/retry/rewind.
- [x] T014 [P] [US2] Write save tests in `tests/save.test.js`: round trip, corrupt data, old version.

## Phase 5: User Story 3 — Site and build carry over (P2)

- [x] T015 [US3] Rework `src/scenes/ExploreScene.js` to use mission sites with trait display.
- [x] T016 [US3] Rework `src/scenes/BuildScene.js`: budget, required list, multiples,
  remove/refund, pad bonuses, code-drawn cards and buttons.

## Phase 6: User Story 4 — Real storms (P2)

- [x] T017 [US4] Show the storm warning and event panel with the real date and class and the
  "replayed, not live" label in the Mission scene.

## Phase 7: User Story 5 — Logbook (P3)

- [x] T018 [US5] Create `src/scenes/LogbookScene.js` with read-aloud and unlock toasts.

## Phase 8: User Story 6 — Accessibility (P3)

- [x] T019 [US6] Add voice-over (`NS.voice`) and a keyboard focus manager (`NS.focus`) in
  `src/ui.js`, wired into all scenes.

## Phase 9: Art & Polish

- [x] T020 Write Blender scripts in `tools/blender/` for backdrops (equator plain, polar ridge,
  explore maps with Earth) and the new buildings (battery, ice extractor). Render into `assets/`.
- [x] T021 Fix the inconsistencies: stage labels, the unused `panel.solarEvent`, the wrong planet,
  and art with baked-in text replaced by code-drawn UI.
- [x] T022 Update `tools/playtest.py` for Campaign → Explore → Build → Mission → Results.
- [x] T023 [P] Write `CREDITS.md` and `DATA-SOURCES.md`, and update `README.md` and the landing
  page copy.
- [x] T024 Run the full test suite and playtest, then fix any failures.

## Dependencies & Execution Order

- **Setup and foundations**: T001–T007 come first. T004 and T005 block every user-story phase.
- **Main path**: US1 (T008–T010) → US2 (T011–T014). US3–US6 can follow in any order.
- **Last**: T022 and T024 run after all scenes exist.

## Implementation Strategy

1. Build the simulation and its tests first. This produces the MVP: the mission is losable and
   explained.
2. Then add the campaign wrapper, then Explore and Build carry-over, then storms, the Logbook,
   accessibility, and finally art.
