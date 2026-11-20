#!/usr/bin/env python3
"""Headless end-to-end playtest: Title -> Campaign -> Briefing -> Explore -> Build -> Mission -> Results,
plus Ask Mission Control (Moon instant / Mars delayed), lose-and-rewind, LIVE vs offline space weather,
the Journal, and screenshots of every mission.

Usage:  python tools/playtest.py <shots_dir> [port]
Needs the game served over HTTP (python -m http.server 8000) and Playwright:
  python -m pip install playwright && python -m playwright install chromium
NASA requests are intercepted: one run gets a fake LIVE answer, others simulate being offline,
so the test never uses the real API quota.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

SHOTS = sys.argv[1] if len(sys.argv) > 1 else "test-shots"
PORT = sys.argv[2] if len(sys.argv) > 2 else "8000"
BASE = f"http://127.0.0.1:{PORT}/play.html"
os.makedirs(SHOTS, exist_ok=True)
errors, log = [], []
FAKE_DONKI = [{"messageType": "FLR", "messageURL": "https://example.invalid", "messageBody":
               "Flare peak time: 2026-11-12T08:15Z.\n\nFlare intensity: X1.9 class.\n\nSource region: S10W20 (Active Region 14321)\n\nActivity ID: 2026-11-12T07:55:00-FLR-001.\n"}]


def check(label, cond, info=""):
    log.append(("PASS" if cond else "FAIL", label, info))


def run():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        mode = {"live": True}
        pg.route("**/api.nasa.gov/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(FAKE_DONKI))
                 if mode["live"] else r.fulfill(status=503, body="offline (simulated by playtest)"))

        shot = lambda name: pg.screenshot(path=os.path.join(SHOTS, name + ".png"))
        js = pg.evaluate

        def wait_scene(key, timeout=20000):
            pg.wait_for_function(f"window.__outpost && window.__outpost.game && window.__outpost.game.scene.isActive('{key}')", timeout=timeout)
            pg.wait_for_timeout(600)

        def click(x, y, wait=350):
            pg.mouse.click(x, y)
            pg.wait_for_timeout(wait)

        # ------------------------------------------------ fresh start, LIVE space weather (mocked)
        pg.goto(BASE + "?fast&seed=7")
        js("localStorage.clear()")
        pg.goto(BASE + "?fast&seed=7")
        wait_scene("Title")
        pg.wait_for_function("window.__outpost.NS.live.status === 'live'", timeout=10000)
        pg.wait_for_timeout(900)
        shot("01_title")
        check("title: LIVE space weather card", js("window.__outpost.NS.live.summary().label") == "LIVE")
        click(640, 280, 900)
        wait_scene("Campaign")
        shot("02_campaign")
        check("campaign: only mission 1 unlocked", js("window.__outpost.NS.save.data.unlocked") == 1)
        click(1150, 280, 900)
        wait_scene("Briefing")
        pg.wait_for_timeout(400)
        shot("03_briefing")
        pg.keyboard.press("Enter"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
        check("briefing: dialogue advances", js("window.__outpost.briefing.i") >= 1)
        click(1180, 50, 900)
        wait_scene("Explore")
        shot("04_explore")
        click(480, 420, 1600)  # Crater Rim (unsafe)
        check("explore: unsafe site -> result", js("window.__outpost.explore.mode") == "result")
        click(1166, 646, 400)  # Back
        click(300, 500, 1600)  # Landing Flats
        click(960, 646, 900)  # Land here
        check("explore: site chosen", js("window.__outpost.NS.run.siteId") == "flats")
        shot("05_explore_landed")
        click(1080, 646, 900)
        wait_scene("Build")

        # ------------------------------------------------ build (mission 1 cards: crew, solar, battery, oxygen)
        def card(i): click(24 + 100, 124 + i * 68 + 31, 400)
        pads = [(380, 410), (610, 410), (840, 410), (1070, 410), (270, 540), (495, 540), (720, 540), (945, 540), (1160, 540)]
        def pad(i): click(pads[i][0], pads[i][1] - 6, 700)
        card(0); pad(3)
        check("build: habitat rejected on shaded pad", len(js("window.__outpost.build.layout")) == 0)
        pad(1); card(1); pad(2); card(3); pad(5); card(2); pad(7)
        check("build: 4 buildings placed", len(js("window.__outpost.build.layout")) == 4)
        shot("06_build_done")
        click(1120, 660, 900)
        wait_scene("Mission")
        shot("07_mission_day1")
        check("mission: only 3 core meters", sorted(js("Object.keys(window.__outpost.mission.meters)")) == ["air", "food", "power"])

        # Ask Mission Control on the Moon: instant (after the light-time animation)
        click(1096, 596, 1200)
        pg.wait_for_function("!!window.__outpost.mission.overlayParts", timeout=8000)
        shot("08_mission_control")
        check("moon: advice arrives the same day", js("window.__outpost.mission.state.advice.used") == 1)
        pg.keyboard.press("Enter"); pg.wait_for_timeout(400)

        for d in range(10):
            if not js("window.__outpost.game.scene.isActive('Mission')"):
                break
            click(1096, 664, 900)
            if d == 0:
                pg.wait_for_timeout(400); shot("09_mission_report")
            pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
        wait_scene("Results")
        pg.wait_for_timeout(1500)
        shot("10_results_win")
        stars = js("window.__outpost.lastStars")
        check("mission 1 won with stars", stars >= 1, f"stars={stars}")
        check("progress saved (mission 2 unlocked)", js("JSON.parse(localStorage.getItem('lso.save.v2')).unlocked") == 2)
        check("journal entries unlocked", len(js("window.__outpost.NS.save.data.logbook")) >= 3)

        # ------------------------------------------------ storm mission with LIVE flares -> labelled LIVE
        pg.goto(BASE + "?fast&scene=mission&mission=3&seed=4")
        wait_scene("Mission")
        src = js("window.__outpost.mission.state.events.filter(e => e.type === 'storm').map(e => e.source)")
        check("live: storms come from today's (mocked) DONKI flares", bool(src) and all(s == "LIVE" for s in src), str(src))
        shot("11_mission_live_storm")

        # ------------------------------------------------ offline: archive/practice fallback, never blocks
        mode["live"] = False
        js("localStorage.removeItem('lso.live.v1')")
        pg.goto(BASE + "?fast&scene=mission&mission=3&seed=4")
        wait_scene("Mission")
        pg.wait_for_timeout(1500)
        src = js("window.__outpost.mission.state.events.filter(e => e.type === 'storm').map(e => e.source)")
        check("offline: storms fall back to ARCHIVE/PRACTICE", bool(src) and all(s in ("ARCHIVE", "PRACTICE") for s in src), str(src))

        # ------------------------------------------------ Mars: advice is delayed one day
        pg.goto(BASE + "?fast&scene=mission&mission=6&seed=2")
        wait_scene("Mission")
        click(1096, 596, 700)
        check("mars: advice is pending (radio delay)", bool(js("window.__outpost.mission.state.advice.pending")))
        click(1096, 664, 900); pg.keyboard.press("Enter"); pg.wait_for_timeout(700)
        check("mars: reply arrives next day", bool(js("window.__outpost.mission.state.advice.ready")))
        shot("12_mars")

        # ------------------------------------------------ lose, then rewind
        pg.goto(BASE + "?fast&scene=mission&mission=1&seed=1")
        wait_scene("Mission")
        js("window.__outpost.mission.plan.on.oxygen = false; window.__outpost.mission.refresh()")
        for d in range(10):
            if not js("window.__outpost.game.scene.isActive('Mission')"):
                break
            pg.keyboard.press("e"); pg.wait_for_timeout(700)
            pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
        wait_scene("Results")
        shot("13_results_lost")
        check("neglect: mission lost", js("window.__outpost.NS.run.history.slice(-1)[0].status") == "lost")
        js("window.__outpost.results.rewind()")
        wait_scene("Mission")
        check("rewind: back in the mission", js("window.__outpost.mission.state.status") == "playing")

        # ------------------------------------------------ journal + every mission base
        pg.goto(BASE + "?fast&scene=journal")
        wait_scene("Journal")
        shot("14_journal")
        js("window.__outpost.journal.tab = 'health'; window.__outpost.journal.draw()")
        check("journal: OSDR studies listed", len(js("window.__outpost.journal.entries()")) >= 3)
        for m in range(1, 7):
            pg.goto(BASE + f"?fast&scene=mission&mission={m}&seed={m}")
            wait_scene("Mission")
            shot(f"20_mission{m}")
            check(f"mission {m}: playable", js("window.__outpost.mission.state.status") == "playing")
        b.close()


try:
    run()
except Exception as e:
    check("playtest crashed", False, repr(e))

for status, label, info in log:
    print(f"{status}  {label}  {info}")
# the simulated-offline NASA response is expected; anything else is a real error
real = [e for e in errors if "503" not in e]
print("\nerrors:", len(real))
for e in real[:30]:
    print("  ", e)
fails = sum(1 for s, _, _ in log if s == "FAIL")
print(f"\n{len(log) - fails}/{len(log)} checks passed")
sys.exit(1 if fails or real else 0)
