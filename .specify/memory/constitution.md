<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAJOR: Principle I's required resource set was redefined; the privacy
  constraint was narrowed to allow optional live NASA open-data requests)
- Modified principles:
  I. Meaningful Choices: now "few core resources, deep consequences". At most 3 core meters are visible
     at once, following the 2026 Space Apps challenge guidance; radiation dose is tracked per astronaut.
  II. Real Science: optional live data (current DONKI space weather) is allowed and must always be
     labeled live or archived.
  III. Kid-First Design: adds audio and character expressiveness as requirements.
  IV. Consistent Original Art: adds a vibrant art direction with expressive characters.
- Added sections: none
- Removed sections: none
- Templates reviewed: plan, spec and tasks templates. No changes are needed.
- Deferred TODOs: none
-->

# Little Space Outpost Constitution

Little Space Outpost is a browser STEM game for children aged 7–12 about building and running a
small Moon outpost. It began as a NASA Space Apps Challenge entry. Development now continues
long-term with no fixed deadline. The goal is a deep, replayable campaign of about 60–90 minutes,
not a five-minute demo.

## Core Principles

### I. Meaningful Choices

- Every player decision MUST produce a visible, explainable consequence in the game state.
- At most THREE core resource meters (power, air and food) may be shown at once. Radiation dose is
  tracked per astronaut on the crew cards, and the shelter's shield charge is shown on the
  building itself. This follows the challenge guidance that "two or three core resources … are
  usually more effective than five or six."
- Resources MUST be interconnected: buildings, placement, crew assignments and events each affect
  several of them. Every option MUST have a cost; there is no free "safe" choice.
- Missions MUST vary between playthroughs (for example, storms drawn from real event archives or
  live data, and seeded events), so that replaying teaches through different situations.
- The game MUST be losable but forgiving. When things go wrong, the game explains the chain of
  causes in kid-friendly words and offers a rewind or retry. It never ends a run without a lesson.
- No single strategy may dominate. Each mission MUST have at least two viable approaches.
- Balance MUST be checked by automated simulation tests (for example, scripted or random policy
  runs proving that the mission is winnable, losable, and not won by one repeated action).

Rationale: the original entry could not be lost, so its trade-offs meant nothing. Choices with
real consequences are the core of both the fun and the learning.

### II. Real Science, Honestly Labeled

- Mechanics MUST be grounded in real lunar science. Examples: a lunar day and night of about 14
  Earth days each, south-pole illumination and permanently shadowed regions, water ice, radiation
  and solar particle events, and Earth–Moon communication delay.
- Real NASA data MUST be used wherever feasible. Examples: DONKI space-weather events, LRO
  terrain and illumination products, and Artemis candidate landing regions. Data MUST be bundled
  for offline play, and its source, retrieval date and license MUST be recorded in the repository.
- Anything simplified, scaled or fictional MUST be labeled as such in-game or in the Logbook.
- The game MUST NOT claim that data is live, real-time or a forecast unless it actually is.
- Optional live requests to NASA open-data APIs (for example, current DONKI space weather) are
  allowed. They MUST send no personal data, MUST be cached locally, MUST fall back to a bundled
  archive when offline, and MUST be labeled "LIVE" or "ARCHIVE" wherever their values appear.

Rationale: NASA Space Apps values real NASA data, and teachers and parents need to trust that
what children learn is accurate.

### III. Kid-First Design (Ages 7–12)

- On-screen text MUST be large, high-contrast and written in short sentences. All story and
  instruction text MUST have voice-over or audio playback, so pre-fluent readers can play.
- The tone MUST be positive and encouraging. Failure is framed as learning.
- The game MUST feel alive. It needs sound effects and music (both mutable), characters with
  visible faces and expressions that react to the mission state, and clear motion feedback for
  every action.
- The game MUST NOT contain ads, purchases, accounts, chat, dark patterns or collection of
  personal data. Progress is stored only on the device.
- The game MUST be fully playable with touch, mouse and keyboard on Chromebooks, tablets and
  desktop browsers.
- Color MUST NOT be the only carrier of meaning, and the palette MUST be colorblind-safe.
  Design decisions follow WCAG 2.2 AA guidance where it applies to a game canvas.

Rationale: the audience includes young children in classrooms on low-end, shared devices.

### IV. Consistent Original Art

- All scenes, characters, buildings, effects and UI MUST follow one documented art direction
  (palette, outline weight, lighting, proportions), kept in `docs/ART-DIRECTION.md`. The
  direction is vibrant and warm: saturated skies and glowing lights, never grey and flat.
- Every asset MUST be original or carry a documented license and provenance. A credits file MUST
  list every third-party or NASA-derived asset with its source and terms.
- Generated art (Blender scenes, Python or SVG pipelines) MUST be reproducible from source files
  and scripts committed to the repository.
- No asset may imitate the characters, art or branding of an existing game or franchise.
  NASA insignia and logos MUST NOT be used as game art.

Rationale: the original assets were mismatched in style and their licensing was undocumented.
Both weaken quality and put eligibility at risk.

### V. Always Playable, Incrementally Delivered

- Every feature MUST land as a vertical slice that leaves the game playable end to end.
- Content MUST be data-driven. Game data (missions, buildings, events, text) stays separate from
  code, and art is referenced only through the asset registry (today `src/data.js` and
  `src/assets.js`).
- Player progress MUST persist locally across sessions and survive game updates, either through
  versioned save data or a safe reset with notice.

Rationale: long-term development without a deadline needs a game that works at every step.

### VI. Tested & Performant

- Simulation and game-rule logic MUST be pure JavaScript that runs without Phaser or a browser,
  so it can be unit-tested headlessly.
- Unit tests for the simulation, balance tests (Principle I) and a Playwright end-to-end
  playthrough of the full campaign path MUST pass before any change is merged.
- The game MUST hold 60 FPS during normal play on a mid-range Chromebook. The first scene MUST be
  interactive within 5 seconds on a typical school connection, using lazy loading for later
  content.

Rationale: tests keep game balance and deep systems from regressing, and performance targets
protect the main classroom hardware.

### VII. Simplicity

- Prefer plain web technologies (HTML, CSS, vanilla JavaScript, Phaser 3) and minimal
  dependencies.
- A new dependency, build step or tool MUST be justified in the feature plan's Complexity
  Tracking section, stating the problem it solves and the simpler option that was rejected.
- The game MUST remain servable as static files.

Rationale: a small team maintains this long-term, and static hosting keeps deployment free.

## Technical & Content Constraints

- **Platform**: static web app. Phaser 3 is vendored in `lib/`. It runs from any static HTTP
  server and requires no backend.
- **Offline-first data**: NASA datasets are pre-processed into compact JSON committed to the
  repository, with a provenance entry for each dataset.
- **Asset budget**: the initial download stays small enough for the 5-second interactive target.
  Larger scene art loads per mission.
- **Localization-ready**: player-facing strings live in data files, not in scene code.
- **Privacy**: no analytics or trackers. The only runtime third-party requests allowed are
  optional NASA open-data requests (Principle II) and links the player explicitly opens.

## Development Workflow & Quality Gates

- **Spec-driven flow**: every feature follows `/speckit-specify` → (`/speckit-clarify`) →
  `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement`.
- **Owner approval gate**: implementation of any feature MUST NOT begin until the project owner
  explicitly approves its spec and task list.
- **Constitution check**: every plan MUST include a Constitution Check against each principle
  and justify any deviation.
- **Merge gate**: unit, balance and E2E tests pass. New assets are recorded in the credits file.
  Player-facing text has been reviewed for reading level and tone.
- **Attribution**: commit messages and pull requests MUST NOT include AI co-author trailers or
  "Generated with" lines.

## Governance

- This constitution supersedes all other project practices and guidance files.
- Amendments are made through `/speckit-constitution`. Each one records its rationale in the
  Sync Impact Report and requires the project owner's approval.
- Versioning follows semantic versioning:
  - MAJOR: a principle is removed or redefined incompatibly.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications and wording only.
- Compliance is reviewed at plan time (Constitution Check) and at merge time (quality gates).
  Unjustified complexity or a principle violation blocks the merge.

**Version**: 2.0.0 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
