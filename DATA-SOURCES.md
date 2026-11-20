# Data Sources

Every real-world value in Little Space Outpost is listed here. **Simplified** marks anything
adapted for gameplay. The same list appears in the game (Journal → Sources).

## 1. NASA/CCMC DONKI: solar flares (live and archived)

- **What:** real solar flares (class, peak time, active region), particle events and
  geomagnetic storms.
- **Where:** NASA Open APIs, `https://api.nasa.gov/DONKI/` (`notifications?type=FLR`, `SEP`,
  `GST`). DONKI is run by the Community Coordinated Modeling Center, NASA Goddard.
- **License:** U.S. Government work, public domain.

### LIVE

`src/live.js` asks for the **last 30 days** of flare notifications from the player's browser.

- The request sends no personal data and uses the public `DEMO_KEY`.
- The result is cached in `localStorage` for 6 hours.
- The values are labelled **LIVE** with the fetch date.
- Players can switch this off on the Mission Map (Storms: NASA archive).

### ARCHIVE

`tools/fetch_donki.py` bundles three historic storm periods into `src/data/donki-events.js` and
caches the raw responses in `tools/donki-raw/`:

- May 2024;
- October 2024;
- September 2017.

*The bundle is still pending:* the shared DEMO_KEY was rate-limited during development. Run
`python tools/fetch_donki.py YOUR_KEY` with a free key from api.nasa.gov. Until then the file is a
placeholder, and offline storms are labelled **PRACTICE**.

### Simplified

- **Strength scale:** M-class = 1, X-class = 2, X5+ or an X flare linked to a particle event = 3.
- **Storm dose:** 10 mSv per unblocked strength point.
- **Warning:** a one-day warning before a storm is a game helper. Real particle storms can arrive
  within hours.
- **Storm day:** the day within the mission is chosen by the mission seed.

## 2. Radiation dose rates

| Body | Rate used | Source |
| --- | --- | --- |
| Moon | **1.37 mSv/day** | Chang’e-4 Lunar Lander Neutrons & Dosimetry (Zhang et al., *Science Advances*, 2020): 1,369 µSv/day, the first direct measurement on the lunar surface |
| Mars | **0.64 mSv/day** | NASA Curiosity Radiation Assessment Detector (Hassler et al., *Science*, 2014) |

The Moon rate is not a NASA dataset, but it is the only published direct surface measurement.

**Simplified:**

- one game day is 2 Earth days;
- habitat walls halve the dose for inside jobs;
- mission dose limits are game values, not NASA limits.

## 3. NASA Open Science Data Repository (OSDR)

`tools/fetch_osdr.py` pulls study records from the OSDR search API
(`https://osdr.nasa.gov/osdr/data/search`, public). The bundled studies are in
`src/data/osdr-studies.js`:

| Accession | Study | Mission |
| --- | --- | --- |
| OSD-342 | Targeting myostatin/activin A protects against skeletal muscle and bone loss during spaceflight | ISS |
| OSD-412 | Microbial communities on leafy greens grown in the Veggie hardware | ISS |
| OSD-146 | Mouse fecal microbiome after exposure to high-LET radiation | Ground study |

The titles and metadata come from OSDR. The one-paragraph kid summaries are written by us, and the
game labels them as such.

## 4. Places

- **Moon south pole:** Malapert Massif, Mons Mouton Plateau and Haworth are NASA Artemis III
  candidate regions (2024 update). Shackleton crater floor is permanently shadowed and colder than
  −170 °C (NASA LRO Diviner).
- **Mars:**
  - Jezero Crater is the Perseverance landing site (NASA Mars 2020).
  - Arcadia Planitia is a region mapped for shallow buried ice (NASA Subsurface Water Ice Mapping
    project).
  - Valles Marineris is a real canyon system.
- **Simplified:** sunlight fractions (Moon sites lit 6–12 of 14 days), ice levels, and solar
  output (Mars panels 2 vs. Moon 3 per day) are game values.

## 5. Facts in the Journal

Each entry in `src/data/logbook.js` names its source. The main ones:

- **Life support:** NASA ISS ECLSS (oxygen from water; about 98% water recovery, 2023).
- **Food in space:** NASA Veggie (lettuce eaten on the ISS, 2015); CNSA Chang’e 4 cotton sprout
  (2019).
- **Ice:** NASA LCROSS (water ice in Cabeus crater, 2009).
- **Moon environment:**
  - synodic month ≈ 29.5 days;
  - LRO Diviner temperatures (about +120 °C in the day and −130 °C at night at the equator).
- **Communication delay:** Earth–Moon light time ≈ 1.3 s; Earth–Mars 3–22 minutes.
- **Mars dust:** the 2018 global dust storm and the end of NASA's Opportunity rover.
- **Space weather:** the May 2024 geomagnetic storm (DONKI GST, Kp 9).
- **History:** Apollo had 12 moonwalkers, 1969–1972.
