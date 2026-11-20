# Feature Specification: Junior Astronaut Mission Trainer Revamp

**Feature Branch**: `002-mission-trainer-revamp`
**Created**: 2026-11-20
**Status**: Approved by project owner (blanket approval; asked for a game that "feels" as good as top
entries)

**Input**: "It's still plain and doesn't feel good compared to others." References: Pieces of Home
(emotional story, distinctive art, sound) and Space Archaeologist (vibrant colors, a cute
expressive mascot). Challenge: 2026 NASA Space Apps "Build a Junior Astronaut Mission Trainer".

## Why

The challenge brief asks for:

- trade-offs between life support, radiation shielding, power, food production and communication
  delay, for ages 7–12;
- **two or three core resources**, rather than five or six;
- real NASA data (DONKI, OSDR, RadLab, Mars Trek), with **current space weather** named as a
  stand-out;
- replayability;
- a lunar **or Martian** outpost.

Version 2 shows seven meters, uses no live data, has no sound, has faceless characters, has no
Mars mission and plays identically every time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - It feels alive (Priority: P1)

A child opens the game and sees an animated title scene: a vibrant nebula sky, a tiny Moon with
an outpost on it, and ASTRO the robot coach waving. Music and sounds play. Every tap gives motion
and sound feedback. The crew have faces that smile, worry or look tired depending on how the
mission is going.

**Independent Test**: Open the game and confirm the following.

- The title animates.
- Music plays after the first tap and can be muted.
- Buttons click.
- Crew portraits change expression when air runs low.

**Acceptance Scenarios**:

1. **Given** air is at two days or less, **When** the mission screen refreshes, **Then** the crew
   portraits show a worried face and the air meter pulses with a warning sound.
2. **Given** the mute toggle is off, **When** the player mutes music or sounds, **Then** they stop
   immediately and the setting is remembered.

### User Story 2 - Three core resources plus radiation per astronaut (Priority: P1)

The mission shows just **Power, Air and Food**. Radiation dose builds up **per astronaut**, faster
for outdoor jobs and when a storm is not blocked. Sharing outdoor work protects the crew. An
astronaut who reaches the mission dose limit must stay inside and rest.

**Independent Test**: Send the same astronaut outside every day, and confirm that their dose meter
fills faster than an astronaut working indoors and that they are grounded at the limit.

**Acceptance Scenarios**:

1. **Given** Rio does an outdoor job, **When** the day ends, **Then** Rio's dose rises by the site's
   real daily dose (the Moon's surface rate is higher than Mars'). An indoor astronaut gets half.
2. **Given** a storm, **When** the shelter charge is lower than its strength, **Then** every
   astronaut gets extra dose for each unblocked point.

### User Story 3 - Real space weather: live or archived (Priority: P1)

A "Today's Sun" card shows real solar flares from NASA DONKI over the last 30 days, labeled
**LIVE** with the date it was fetched. In storm missions, the storms come from today's real
flares when online (LIVE), or from bundled historic events (ARCHIVE). The day and the storm vary
on every playthrough.

**Independent Test**: Go online and confirm the card shows LIVE flares. Go offline (or block
the request) and confirm it shows ARCHIVE or PRACTICE and storms still happen.

### User Story 4 - Communication delay (Priority: P2)

"Ask Mission Control" gives advice. On the Moon the reply arrives right away, after a radio
signal animation showing the real light time of about 1.3 seconds. On Mars the reply arrives the
**next day**, and it is about yesterday's situation. The game explains why.

### User Story 5 - Mars mission (Priority: P2)

Mission 6 takes the crew to Jezero Crater on Mars. The changes from the Moon:

- weaker sunlight;
- a dust storm that cuts solar power;
- a lower daily radiation dose (Curiosity RAD);
- communication delay;
- a new map and backdrop.

### User Story 6 - Story, mentor and rewards (Priority: P2)

Each mission opens with a short illustrated briefing: ASTRO and the crew talk with portraits and
expressions. Each win awards a mission patch. A Journal collects Moon facts, real NASA health
studies (OSDR) and the real solar flares the player has faced.

### Edge Cases

- **No network, a rate limit or an API error**: the card says "ARCHIVE" and the game never blocks.
- **Audio blocked before the first interaction**: music starts on the first tap.
- **The device cannot render WebGL**: Phaser falls back to the canvas renderer.

## Requirements *(mandatory)*

- **FR-001**: At most 3 core meters (power, air, food) are visible during a mission. Health is shown
  as team hearts, dose on the crew cards, and shield on the shelter.
- **FR-002**: Dose is tracked per astronaut, with site-based daily rates (Moon > Mars),
  indoor/outdoor job factors, storm dose, and grounding at the limit.
- **FR-003**: Every job and machine has a cost. A test verifies that no single repeated job earns
  3 stars, and that every mission can be both won and lost across several seeds.
- **FR-004**: Missions are seeded. Storm days, storm picks and the Mars dust storm vary by seed and
  stay deterministic for a given seed.
- **FR-005**: The game fetches live DONKI flares from the browser, with a localStorage cache
  (6 hours), an archive fallback, and LIVE / ARCHIVE / PRACTICE labels.
- **FR-006**: "Ask Mission Control" gives advice with a site-based communication delay
  (Moon 0 days, Mars 1 day) and a light-time animation.
- **FR-007**: Mission 6 is on Mars (Jezero), with dust storms, Mars solar and dose values, and
  Mars art.
- **FR-008**: A title scene, briefing dialogues with portraits and expressions, mission patches,
  and a Journal with OSDR study cards.
- **FR-009**: Synthesized music and SFX, with separate music and sound toggles that persist.
- **FR-010**: New art: vibrant nebula skies, expressive chibi crew with visible faces
  (3 expressions), the ASTRO robot (4 expressions), a tiny-planet title diorama, re-colored
  terrain and buildings, and Mars terrain. Everything is reproducible by script.
- **FR-011**: Bundled OFL fonts (Fredoka and Nunito) are loaded before any text is drawn.
- **FR-012**: Data sources are attributed in the game (Journal "Sources" tab and on-screen labels)
  and in DATA-SOURCES.md.
- **FR-013**: All tests pass (unit, balance across seeds, E2E), and the game holds 60 FPS.

## Success Criteria *(mandatory)*

- **SC-001**: A first-time player hears sound and sees character expressions within 10 seconds.
- **SC-002**: The mission HUD shows ≤ 3 resource meters.
- **SC-003**: The game uses at least 3 NASA datasets: DONKI (live and archived), OSDR studies,
  and Curiosity RAD / lunar dose values. Each is credited in the game.
- **SC-004**: Two playthroughs of the same mission with different seeds show different storm days
  or events.
- **SC-005**: All automated tests pass with zero console errors.

## Assumptions

- **Daily dose values**: Moon 1.37 mSv/day (Chang’e-4 LND, Zhang et al. 2020) and Mars
  0.64 mSv/day (Curiosity RAD, Hassler et al. 2014). Habitat shielding halves the dose (simplified).
  Storm dose is 10 mSv per unblocked strength point (simplified). The mission dose limit is a
  simplified game value.
- **Live data source**: the browser calls api.nasa.gov with DEMO_KEY. The per-IP rate limit is fine
  for a 6-hour cache.
- **Water**: water is folded into air (the oxygen maker splits water). The Ice Digger boosts the
  oxygen maker and the greenhouse.
