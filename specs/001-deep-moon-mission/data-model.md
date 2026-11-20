# Data Model: Deep Moon Mission Campaign

## BuildingType (`content.BUILDINGS[id]`)

| Field | Meaning |
|---|---|
| `cost` | supply crates spent in Build |
| `max` | maximum copies (1 for most; solar 4, battery 3) |
| `allowedTags` / `bonusTag` | pad traits it may be placed on, and the trait that boosts it |
| `energy` | energy used per day while ON |
| `inputs` / `outputs` | per-day resource changes while running, e.g. oxygen uses `{water:1}` and makes `{air:3}` |
| `priority` | shutdown order when energy is short (higher number = shut down first) |
| `capacity` | battery capacity added |
| `solar` | energy made per lit day (+1 on a `sunny` pad) |
| `needsIce` | allowed only at sites with ice |

## Job (`content.JOBS[id]`) & CrewMember

- **Job**: `{ id, label, role }`. An astronaut whose `role` matches the job gets a doubled effect.
- **Crew member**: `{ id, name, role }`. Roles are engineer, botanist, geologist and medic.

## Site

```text
{ id, name, region?, safe, x, y, light: { cycle, lit, offset }, ice, padSet, traits[], report }
```

`light`: the day is lit when `(day - 1 + offset) mod cycle < lit`.

## Mission

```text
{ id, title, concept, days, sites[], buildings[], required[], budget,
  start: { energy, air, water, food, shield, health },
  events: [{ day, period, flare }], healthGoal, scienceGoal, logbook[] }
```

## MissionState (immutable per step)

```text
{ missionId, day, days, site, layout[], res: { energy, air, water, food, shield, health, science },
  capacity, on: { buildingId: bool }, status: 'playing' | 'won' | 'lost',
  log: [dayReports], causes[], seenFacts[] }
```

- **Day report**: `{ day, lit, deltas, lines: [{ kind, text }], storm? }`
- **Plan**: `{ on: { buildingId: bool }, jobs: [jobId × 3] }`

## SaveData (`lso.save.v1`)

```text
{ version: 1, unlocked: n, stars: { missionId: 0-3 }, logbook: [ids], settings: { voice, rate } }
```

Validation: an unknown version or bad shape is discarded, and a fresh save is started with a
notice.
