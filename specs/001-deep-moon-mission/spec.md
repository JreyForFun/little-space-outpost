# Feature Specification: Deep Moon Mission Campaign

**Feature Branch**: `001-deep-moon-mission`
**Created**: 2026-11-20
**Status**: Approved by project owner (blanket approval given 2026-11-20)
**Input**: User description: "Replace the shallow, unlosable 5-day mission with a deep, replayable
campaign: interconnected resources, buildings that produce and consume, lunar day/night, crew jobs,
real NASA DONKI solar events, multiple landing sites with trade-offs, ~6 missions with stars and
unlocks, cause-and-effect explanations with rewind, local save, Moon Logbook, voice-over, keyboard
support, automated balance tests, Build choices that carry into the mission, and fixes for existing
inconsistencies."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Moon outpost where choices really matter (Priority: P1)

A child (aged 7–12) plays a mission one Moon day at a time. Each day they decide which systems to
power and what job each of their three astronauts does. Then they see how energy, air, water, food,
shielding and crew health changed, and why. Bad plans can make the crew run short. Good plans keep
everyone healthy and earn science.

**Why this priority**: The original game could not be lost, so its choices meant nothing. This is
the core loop everything else depends on.

**Independent Test**: Start any mission directly. Play it with a sensible plan and win. Replay it
while ignoring air and water and lose. On the loss screen, see an explanation of what caused it.

**Acceptance Scenarios**:

1. **Given** a mission in progress, **When** the player turns off the oxygen system for several
   days, **Then** air falls each day, a warning appears before it runs out, and crew health drops
   once air is empty.
2. **Given** night has fallen at an equator site, **When** the solar panels produce nothing,
   **Then** systems draw from the battery, and once it is empty the systems shut down in a shown
   priority order.
3. **Given** crew health reaches zero, **When** the day ends, **Then** the mission ends with a
   friendly "Mission paused" screen. The screen shows the chain of causes in plain words and
   offers "Rewind a day" and "Try again".
4. **Given** any day, **When** the player presses "Rewind a day", **Then** the state returns
   exactly to the start of the previous day.

---

### User Story 2 - A campaign that teaches one idea at a time (Priority: P1)

The player starts a campaign of six missions. Each mission introduces one concept:

1. Air & energy
2. Growing food & water
3. Solar storms
4. The long lunar night
5. South-pole ice & sunlight
6. Everything together

Missions unlock in order. Each one awards 1–3 stars, and progress is saved on the device.

**Why this priority**: Turns a five-minute demo into a 60–90 minute experience with replay value.

**Independent Test**: Finish mission 1, reload the page, and confirm that mission 2 is unlocked and
mission 1 shows its stars.

**Acceptance Scenarios**:

1. **Given** a new player, **When** the campaign map opens, **Then** only mission 1 is playable,
   and later missions show as locked with their names visible.
2. **Given** a completed mission, **When** results are shown, **Then** stars are awarded:
   1 for completing it, 2 for finishing with crew health at or above the mission threshold,
   3 for also reaching the mission's science goal. The best result is kept.
3. **Given** saved progress, **When** the page is reloaded, **Then** unlocked missions, best stars,
   Logbook entries and settings are restored.

---

### User Story 3 - Site and build decisions carry into the mission (Priority: P2)

Before each mission the player scouts landing sites with real trade-offs and builds the outpost
with a limited supply budget. Example sites: an equator plain with a long night and no ice, a
sunlit south-pole ridge with distant ice, or a shadowed crater rim with ice but little sun. Which
buildings they choose, how many, and where they place them change the mission's numbers.

**Why this priority**: Makes Explore and Build meaningful instead of decoration.

**Independent Test**: Play the same mission twice, once with two solar panels on sunny pads and
once with one panel on a plain pad. Confirm that daily energy differs as shown in the mission.

**Acceptance Scenarios**:

1. **Given** a mission with a supply budget, **When** the player places buildings, **Then** each
   building's cost is deducted, and the player cannot exceed the budget or skip required buildings.
2. **Given** a solar panel placed on a "sunny" pad, **When** the mission runs, **Then** it
   produces more energy than the same panel on a plain pad, and the bonus is shown.
3. **Given** a south-pole site with ice, **When** an ice extractor is built, **Then** it can make
   water. At a site without ice, the extractor is unavailable and the reason is explained.

---

### User Story 4 - Real solar storms from NASA records (Priority: P2)

Some missions replay real solar events recorded by NASA's space-weather database (DONKI), for
example the strong storms of May 2024. A warning arrives a day ahead. The player can charge the
radiation shelter and send the crew inside. The game clearly says these are real past events
replayed for practice, not live forecasts.

**Why this priority**: Real NASA data is central to the project's purpose and to NASA Space Apps
judging.

**Independent Test**: Start the storm mission and confirm that the event panel names the real
event date and class with a "replayed from NASA DONKI records" label, and that shielding changes
the health outcome.

**Acceptance Scenarios**:

1. **Given** a mission scheduled with a real event, **When** the day before it arrives, **Then** a
   warning shows the real date and flare class.
2. **Given** a storm day, **When** the shelter charge is at or above the storm strength, **Then**
   the crew takes no radiation harm. Otherwise health drops by the remaining amount.

---

### User Story 5 - Learn real Moon science through a Logbook (Priority: P3)

Playing unlocks Moon Logbook entries: short, accurate facts with source notes. Examples include
lunar day length, water ice in shadowed craters, how oxygen can be split from water, radiation,
radio delay, and the Artemis landing regions. The player can open the Logbook from the campaign
map and have entries read aloud.

**Independent Test**: Complete mission 1 and confirm that new Logbook entries appear and can be
read aloud.

**Acceptance Scenarios**:

1. **Given** a mission event (first night, first storm, first ice), **When** it happens, **Then**
   the related Logbook entry unlocks with a small notification.

---

### User Story 6 - Accessible to young and pre-fluent readers (Priority: P3)

All story and guide text can be read aloud. The game can be played fully with keyboard, mouse or
touch. Voice-over can be turned off in settings.

**Independent Test**: Play mission 1 using only the keyboard with voice-over on.

**Acceptance Scenarios**:

1. **Given** voice-over is on, **When** ASTRO speaks, **Then** the line is read aloud.
   Turning voice-over off stops all speech.
2. **Given** keyboard only, **When** the player uses number keys, arrow keys, Tab, Enter and
   Space, **Then** every mission action can be performed with a visible focus indicator.

---

### Edge Cases

- **Several resources hit zero on the same day**: all effects apply, and the explanation lists
  every cause in order.
- **Rewind on day 1**: the button is disabled with a tooltip.
- **Saved data from an older version, or corrupt**: the game starts fresh, keeps nothing broken,
  and shows a gentle notice.
- **Speech synthesis unavailable in the browser**: voice options are hidden, and text still shows.
- **Player tries to start a mission without the required buildings**: the Start button stays
  disabled, and a hint lists what is missing.
- **Storage disabled** (private mode): the game is still playable, and progress lasts only for the
  session.
- **The window is resized or a tablet is rotated mid-mission**: the layout scales and no state is
  lost.

## Requirements *(mandatory)*

### Functional Requirements

**Simulation**

- **FR-001**: The mission MUST track energy (with battery storage), air, water, food, shelter
  charge and crew health, all updated once per Moon day.
- **FR-002**: Each building MUST have defined daily inputs and outputs. Its effect applies only
  when it is switched on and its inputs are available.
- **FR-003**: The crew MUST consume air, water and food every day. A shortage of any of them MUST
  reduce crew health.
- **FR-004**: A day/night cycle MUST control solar output. Night length MUST differ by site:
  long at the equator, short at a sunlit polar ridge.
- **FR-005**: When stored energy is insufficient, systems MUST shut down in a fixed, displayed
  priority order (life support last).
- **FR-006**: The player MUST assign each of three astronauts to one daily job. Each astronaut's
  role MUST give a bonus to a matching job.
- **FR-007**: Each day MUST produce a readable report of changes with their causes. When a mission
  is lost, the report MUST show a cause chain.
- **FR-008**: The player MUST be able to rewind to the start of any earlier day of the current
  mission.
- **FR-009**: The simulation MUST be deterministic for a given mission, build and plan sequence.

**Campaign & progression**

- **FR-010**: There MUST be six campaign missions, unlocked in order, each with a goal, day count,
  sites, allowed buildings, supply budget, health threshold and science goal.
- **FR-011**: Stars MUST be awarded per FR-010's thresholds, and the best result MUST be kept.
- **FR-012**: Progress, best stars, unlocked Logbook entries and settings MUST be saved on the
  device and restored on reload. Saves MUST be versioned.

**Explore & Build**

- **FR-013**: Each mission MUST offer 2–4 sites with displayed traits: sunlight, ice, ground and
  shelter shade. Unsafe sites can be scouted but not chosen.
- **FR-014**: Build MUST enforce a supply budget and required buildings. It MUST allow multiple
  solar panels and batteries. Pad traits MUST modify building output.
- **FR-015**: The chosen site and the build layout MUST be the inputs to the mission simulation.

**Science data & content**

- **FR-016**: Storm missions MUST use real solar events from NASA DONKI records bundled with the
  game. Each event shows its date, class and a "replayed for practice, not live" label.
- **FR-017**: South-pole sites MUST reference real Artemis III candidate regions by name. Values
  that are simplified MUST be labeled as simplified.
- **FR-018**: The Moon Logbook MUST hold at least 12 accurate entries, each with a source note,
  unlocked through play.
- **FR-019**: A credits and data-sources document MUST list every dataset and asset with its
  source and license.

**Accessibility & polish**

- **FR-020**: All ASTRO, story and Logbook text MUST be speakable through voice-over, with an
  on/off setting.
- **FR-021**: All mission, build, campaign and Logbook actions MUST be operable by keyboard, with
  a visible focus indicator.
- **FR-022**: Stage labels MUST be consistent with the actual flow. Every loaded asset MUST be used
  or removed. The planet in the sky MUST be shown as Earth.
- **FR-023**: The art MUST follow one consistent style across scenes, including new buildings
  (battery, ice extractor) and updated backdrops.

**Quality**

- **FR-024**: Automated tests MUST verify the simulation rules, and MUST verify for each mission (the single-job rule applies to missions 2–6; mission 1 is a guided tutorial)
  that: a reasonable plan wins; a neglectful plan loses; and repeating any single job every day
  for all crew does not earn 3 stars.
- **FR-025**: The end-to-end playtest MUST play through the campaign map, Explore, Build and a full
  mission to the results screen without errors.

### Key Entities

- **Mission definition**:
  - id, title and concept;
  - days and start day/night phase;
  - candidate sites;
  - allowed and required buildings, and the supply budget;
  - starting resources;
  - real events schedule;
  - star thresholds and Logbook unlocks.
- **Site**: name, real region reference (if any), sunlight pattern, ice availability, safety, and
  the trait tags of its pads.
- **Building type**: name, cost, daily inputs and outputs, pad-trait bonuses, shutdown priority,
  and whether multiples are allowed.
- **Layout**: the buildings placed on pads for a mission run.
- **Mission state**: day, light/dark, resources, crew health, active systems, crew jobs, history
  of day snapshots, and the event log.
- **Crew member**: name, role and job bonus.
- **Solar event**: real date, class or type, source (DONKI), and in-game strength.
- **Logbook entry**: id, title, kid-level text and source note.
- **Save data**: version, unlocked missions, best stars, Logbook entries and settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full campaign playthrough takes 60–90 minutes for a first-time player. Each
  mission takes 6–15 minutes.
- **SC-002**: Every mission can be both won and lost, as verified by automated plans. No single
  repeated job earns 3 stars on any mission.
- **SC-003**: After a loss, the player sees at least one specific cause and a one-tap way to retry
  or rewind.
- **SC-004**: 100% of story and guide lines can be read aloud, and every action works by keyboard.
- **SC-005**: Progress survives a page reload with zero loss of stars or unlocks.
- **SC-006**: Every NASA data value shown in the game traces to an entry in the data-sources
  document.
- **SC-007**: The first screen is interactive within 5 seconds, and gameplay stays smooth
  (60 FPS) on a mid-range laptop or Chromebook.
- **SC-008**: The automated test suite and end-to-end playtest pass with zero errors.

## Assumptions

- **One Moon "day" is a simplified time step.** One step represents about two Earth days, so a
  full lunar day/night cycle (about 29.5 Earth days) is about 14 steps. This is labeled in-game.
- **Site sunlight fractions are simplified.** Polar sunlit ridges are lit about 85% of the time
  and equator sites about 50%. They are presented as simplified illustrations, not measurements.
- **Solar event strength is a gameplay scale.** Real DONKI events are mapped to an in-game strength
  of 1–3 by flare class and particle-event presence. The real date and class are always shown.
- **Voice-over uses the browser's built-in speech.** No recorded audio files are needed for this
  feature.
- **Single player only.** A single local save slot, no accounts.
- **Art.** New and replacement art is produced with reproducible scripts (Blender or Python). It
  keeps the friendly cartoon style and is listed in the credits.
- **The pitch deck and video stay as they are.** Historical competition materials are not updated
  by this feature.
