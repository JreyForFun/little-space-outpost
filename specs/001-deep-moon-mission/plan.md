# Implementation Plan: Deep Moon Mission Campaign

**Branch**: `001-deep-moon-mission` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-deep-moon-mission/spec.md`

## Summary

Replace the fixed five-click mission with a campaign of six missions. Each mission runs on a pure,
deterministic simulation:

- energy and battery, air, water, food, shield, crew health and science;
- buildings with daily inputs and outputs;
- a day/night cycle that depends on the site;
- daily crew jobs with role bonuses;
- real NASA DONKI solar events.

The simulation lives in plain JavaScript with no Phaser dependency, so Node's built-in test runner
can unit-test it and balance-test it with automated play policies. Phaser scenes become a thin
view layer:

- a new **Campaign map**, **Results** screen and **Logbook**;
- **Explore** reworked with mission-specific sites that have real trade-offs;
- **Build** reworked with a supply budget, multiple panels and batteries, and pad bonuses;
- **Mission** rebuilt to show the real base the player built, with a day/night overlay.

Progress, settings and the Logbook are saved to `localStorage`. Voice-over uses the browser's
speech synthesis, and every action can be done from the keyboard.

## Technical Context

**Language/Version**: JavaScript (ES2020) in the browser; Node ≥ 20 for tests; Python 3 for asset
and data tools.

**Primary Dependencies**:

- Phaser 3.90, vendored in `lib/`;
- Playwright (Python) for the end-to-end playtest;
- Blender 4.x (an offline, optional asset tool).

**Storage**: `localStorage`, under a versioned key `lso.save.v1`.

**Testing**:

- `node --test tests/` for simulation, balance and save unit tests;
- `python tools/playtest.py` for the end-to-end run.

**Target Platform**: evergreen browsers on Chromebook, Windows, macOS, iPad and Android tablets.

**Project Type**: static single-page web game; no build step.

**Performance Goals**: 60 FPS; first scene interactive in under 5 s.

**Constraints**: offline-capable, no backend and no runtime third-party requests. Simulation
modules must load both as browser globals and as CommonJS modules.

**Scale/Scope**: 6 missions, 7 building types, 6 crew jobs, 3 real storm periods and 12 or more
Logbook entries.

## Constitution Check

| Principle | How this plan complies |
|---|---|
| I. Meaningful Choices | Resources depend on each other, the game can be lost, and failures show a cause chain and allow rewind. `tests/balance.test.js` proves each mission can be won, can be lost, and that no single job earns 3 stars. |
| II. Real Science | Real DONKI flares and particle events are bundled through the reproducible `tools/fetch_donki.py`, with raw responses cached in `tools/donki-raw/`. Artemis III candidate region names are real. Simplifications are labeled in-game and in `DATA-SOURCES.md`. |
| III. Kid-First | Voice-over for all guide and Logbook text, large text, keyboard focus system, no accounts or data collection, local save only. |
| IV. Consistent Art | Art is regenerated through reproducible scripts (`tools/`), and `CREDITS.md` records provenance. |
| V. Always Playable | Each phase leaves the game playable. Content lives in data modules (`src/sim/content.js`, `src/data/*`). |
| VI. Tested | Unit, balance and E2E tests are required. Simulation steps are tiny, with no per-frame work. |
| VII. Simplicity | No bundler or framework is added. Tests use Node's built-in runner, so there are no new npm dependencies. |

Gate result: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/001-deep-moon-mission/
├── spec.md
├── plan.md
├── data-model.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── sim/
│   ├── content.js      # buildings, jobs, crew roles, sites, missions (data)
│   ├── engine.js       # pure deterministic simulation (createMission, step, stars, explain)
│   └── save.js         # versioned local save (storage injected → testable)
├── data/
│   ├── donki-events.js # GENERATED real NASA events
│   └── logbook.js      # Moon Logbook facts + source notes
├── assets.js           # asset registry (art only)
├── data.js             # UI text/layout data (pads, story)
├── ui.js               # drawing helpers, guide, focus manager, voice
├── main.js
└── scenes/ Boot, Campaign, Explore, Build, Mission, Results, Logbook
tests/
├── engine.test.js
├── balance.test.js
└── save.test.js
tools/
├── fetch_donki.py, donki-raw/
├── blender/            # reproducible art scenes
└── playtest.py
```

**Structure Decision**: a single static project. The new `src/sim/` layer holds all rules.
Scenes only read state and call `engine.step`.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Blender as an offline art tool | A consistent, higher-quality art set produced from reproducible sources | Hand-drawn PIL shapes can't reach the required quality; it never runs at play time |
