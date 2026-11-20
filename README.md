# Little Space Outpost: Junior Astronaut Mission Trainer

**Build. Balance. Protect. Grow.** A browser game for ages 7–12 about running an outpost on the
Moon and then on Mars, built for the 2026 NASA Space Apps Challenge *"Build a Junior Astronaut
Mission Trainer"*. It is now in long-term development.

Train with **ASTRO**, the robot coach, and a crew of three: **Rio** (engineer), **Sage** (botanist)
and **Lumi** (geologist). Over six missions you learn the trade-offs real mission planners face:

- life support;
- power budgeting;
- food production;
- radiation shielding;
- communication delay.

## What makes it tick

- **Three core meters, no more:** POWER, AIR and FOOD, following the challenge's own advice.
  Health is team hearts, the shelter shows its own shield, and **radiation dose is tracked per
  astronaut**. Outside jobs (tuning panels, field science) earn the full real daily dose.
  Inside jobs get habitat shielding. Anyone who reaches the limit must rest inside, so sharing
  the outside work is a real strategy.
- **Every choice has a cost.** Automated balance tests prove that every mission can be won with
  3 stars, can be lost by neglect, and can't be beaten by repeating one job, across several
  random seeds.
- **Real space weather, live.** The game fetches the **last 30 days of real solar flares** from
  NASA DONKI in the browser and turns them into the mission's storms, labelled **LIVE**.
  Offline, it uses real past storms (**ARCHIVE**) or labelled **PRACTICE** storms. Nothing is
  ever presented as a forecast.
- **Communication delay you can feel.** "Ask Mission Control" gets advice from Earth. On the Moon
  it arrives after the real round-trip radio time. On Mars it arrives **the next day**, and
  it's about yesterday.
- **Moon and Mars.** Real places:
  - the equator;
  - the lunar south pole (Artemis III regions: Malapert Massif, Mons Mouton, Haworth);
  - Jezero Crater and Arcadia Planitia on Mars, with dust storms that halve solar power.
- **Different every time.** Seeded storm days, real flares and Mars dust storms change between
  playthroughs.
- **Characters with feelings.** The crew's faces turn worried or tired when air runs low, a
  storm is coming, or their radiation climbs. Each mission opens with an illustrated briefing.
  Each win earns a mission patch.
- **Cadet Journal.** It collects Moon and Mars facts, real **NASA OSDR** health studies (muscle
  and bone loss, space gardens, radiation), every real flare you've faced, and the data sources
  behind each number.
- **Sound and accessibility:**
  - synthesized music and sound effects;
  - optional read-aloud;
  - full keyboard play (Tab / arrows / Enter, `1–3` change jobs, `E` end the day,
    `M` Mission Control, `R` rewind);
  - no accounts, no ads, progress saved on the device.

### The six missions

| # | Mission | Teaches |
| --- | --- | --- |
| 1 | First Breath (Moon) | Power & air (tutorial) |
| 2 | Moon Garden | Food vs. power |
| 3 | Storm Watch | Radiation shielding with real (live or archived) flares |
| 4 | The Long Night | The two-week lunar night & batteries |
| 5 | Ridge of Light | South-pole ice vs. sunlight (Artemis regions) |
| 6 | Red Planet (Mars) | Dust storms, lower radiation, and a radio delay |

Stars:

- ★ survive every day;
- ★★ also keep enough hearts with nobody over the radiation limit;
- ★★★ also reach the science goal.

## Run locally

```powershell
python -m http.server 8000
```

Open <http://localhost:8000> (landing page) or <http://localhost:8000/play.html> (game). It must be
served over HTTP, not opened as a file.

**Testing shortcuts:** `?fast` shortens animations, `?seed=N` fixes the random seed, and
`?scene=campaign|briefing|explore|build|mission|journal&mission=N` jumps straight to a scene.

## Tests

```powershell
npm test                                   # engine + balance (several seeds) + save tests, no dependencies
python tools/playtest.py test-shots 8000   # end-to-end browser run (server must be running)
```

The end-to-end test intercepts NASA requests, so it checks both the LIVE path and the offline
fallback without using real API quota.

## NASA data used

| Dataset | How it's used |
| --- | --- |
| **DONKI** (space weather) | Live flares from the last 30 days in the browser, plus the bundled May 2024 / Oct 2024 / Sep 2017 storms |
| **OSDR** (space biology) | Real study records (OSD-342, OSD-412, OSD-146) in the Journal's Health Lab |
| **Curiosity RAD** | Mars surface dose, 0.64 mSv/day |
| **Chang’e-4 LND** | Moon surface dose, 1.37 mSv/day (the only direct lunar-surface measurement) |
| **Artemis III regions, Mars 2020, SWIM** | Real landing-site names |

Every source and simplification is listed in [DATA-SOURCES.md](./DATA-SOURCES.md) and inside the
game (Journal → Sources).

## Making the art and data

```powershell
blender -b --factory-startup --python tools/blender/render_assets.py   # every model is built in code
python tools/compose_sheets.py                                          # skies, sprite sheets, title art
python tools/fetch_donki.py [NASA_API_KEY]                              # bundle the archive storms
python tools/fetch_osdr.py                                              # bundle OSDR study records
```

The art direction is described in [docs/ART-DIRECTION.md](./docs/ART-DIRECTION.md), and the
credits in [CREDITS.md](./CREDITS.md).

## Project structure

```text
src/sim/      pure rules: content.js (missions, sites, buildings), engine.js, save.js
src/data/     story.js, logbook.js, osdr-studies.js, donki-events.js (generated)
src/          ui.js (theme kit), audio.js (Web Audio synth), live.js (live DONKI), assets.js, data.js
src/scenes/   Boot, Title, Campaign, Briefing, Explore, Build, Mission, Results, Journal
tools/        blender/render_assets.py, compose_sheets.py, fetch_donki.py, fetch_osdr.py, playtest.py
tests/        node:test suites + automated players (helpers/policies.js)
specs/        spec-kit features 001 and 002 · .specify/ constitution (v2.0.0)
```

## Development process

This project uses [GitHub Spec Kit](https://github.github.com/spec-kit/):

- constitution → spec → plan → tasks → implement;
- the current features are in `specs/001-deep-moon-mission/` and
  `specs/002-mission-trainer-revamp/`.

The original competition pitch materials ([guide](./PITCH-DECK-GUIDE.md),
[deck](./Little-Space-Outpost-Pitch-Deck.pptx), [video](./Little-Space-Outpost-Pitch.mp4))
describe the first version.
