#!/usr/bin/env python3
"""Headless playthrough of Explore + Build. Usage: python3 tools/playtest.py <shots_dir> [port]"""
import sys, os, json
from playwright.sync_api import sync_playwright

SHOTS = sys.argv[1]
PORT = sys.argv[2] if len(sys.argv) > 2 else "8765"
os.makedirs(SHOTS, exist_ok=True)
errors = []


def run():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.on("requestfailed", lambda r: errors.append(f"requestfailed: {r.url}"))
        pg.goto(f"http://localhost:{PORT}/play.html?fast")

        def shot(name):
            pg.screenshot(path=os.path.join(SHOTS, name + ".png"))

        def wait_scene(key, timeout=15000):
            pg.wait_for_function(f"window.__outpost && window.__outpost.game && window.__outpost.game.scene.isActive('{key}')", timeout=timeout)

        def click(x, y, wait=250):
            pg.mouse.click(x, y)
            pg.wait_for_timeout(wait)

        def st(scene):
            return             pg.evaluate(f"(() => {{ const s = window.__outpost.{scene}; return {{mode: s.mode, sel: s.sel || null, built: window.__outpost.NS.state.built, res: window.__outpost.NS.state.res, mission: s.mission || null}}; }})()")

        log = []
        def check(label, cond, info=""):
            log.append(("PASS" if cond else "FAIL", label, info))

        # ---------------- EXPLORE
        wait_scene("Explore")
        pg.wait_for_timeout(1500)
        shot("01_explore_start")
        click(480, 420, 100)                      # D: crater rim (blocked)
        pg.wait_for_timeout(500); shot("02_explore_scanning")
        pg.wait_for_timeout(1200); shot("03_explore_blocked")
        check("blocked site -> result mode", st("explore")["mode"] == "result")
        click(1150, 660)                          # Cancel
        check("cancel -> pick mode", st("explore")["mode"] == "pick")
        click(300, 500, 1600); shot("04_explore_ok")   # A: ok
        check("open site -> result mode", st("explore")["mode"] == "result")
        click(905, 660, 700); shot("05_explore_confirmed")
        check("confirm -> done mode", st("explore")["mode"] == "done")
        pg.wait_for_timeout(1800)
        click(1060, 660, 300)                     # Start building
        wait_scene("Build"); pg.wait_for_timeout(1200)
        shot("06_build_start")

        # ---------------- BUILD
        def build_one(card_i, pad, shot_prefix=None, expect_invalid_pad=None):
            click(95, 175 + card_i * 97)
            if shot_prefix: shot(shot_prefix + "_a_selected")
            click(860, 660)                       # Select location
            check(f"card {card_i}: select mode", st("build")["mode"] == "select")
            if shot_prefix: pg.mouse.move(pad[0], pad[1]); pg.wait_for_timeout(300); shot(shot_prefix + "_b_selecting")
            if expect_invalid_pad:
                click(*expect_invalid_pad, 400)
                check(f"card {card_i}: invalid pad rejected", st("build")["mode"] == "select")
                if shot_prefix: shot(shot_prefix + "_b2_invalid")
            click(*pad)
            check(f"card {card_i}: located", st("build")["mode"] == "located", json.dumps(st("build")))
            if shot_prefix: shot(shot_prefix + "_c_located")

        # 1 Crew habitat on flat pad (610,410); try sunny-only pad (840,410) first -> invalid
        build_one(0, (610, 410), "07_crew", expect_invalid_pad=(840, 410))
        click(860, 660, 300); shot("07_crew_d_building")
        pg.wait_for_function("window.__outpost.NS.state.built.crew === true", timeout=8000)
        pg.wait_for_timeout(500); shot("07_crew_e_ready")
        check("crew built, supplies on", st("build")["res"]["supplies"] is True)

        # Greenhouse early: located but locked
        build_one(4, (945, 540), "08_gh_locked")
        click(860, 660, 300)
        check("greenhouse locked without power", st("build")["mode"] == "located", json.dumps(st("build")))
        click(1150, 660, 300)                     # cancel -> back to select
        check("cancel located -> select", st("build")["mode"] == "select")
        click(1150, 660, 200)                     # cancel select -> selected
        click(1150, 660, 200)                     # cancel selected -> idle
        check("back to idle", st("build")["mode"] == "idle")

        # 2 Oxygen
        build_one(1, (495, 540), "09_oxygen")
        click(860, 660)
        pg.wait_for_function("window.__outpost.NS.state.built.oxygen === true", timeout=8000)
        # 3 Solar (sunny pad)
        build_one(2, (840, 410), "10_solar", expect_invalid_pad=(495 + 0, 540 + 0))  # 495,540 now occupied/not sunny
        click(860, 660)
        pg.wait_for_function("window.__outpost.NS.state.built.solar === true", timeout=8000)
        # 4 Shelter (shaded pad)
        build_one(3, (1070, 410), "11_shelter")
        click(860, 660)
        pg.wait_for_function("window.__outpost.NS.state.built.shelter === true", timeout=8000)
        pg.wait_for_timeout(3200); shot("12_four_built")
        # 5 Greenhouse now unlocked
        build_one(4, (945, 540), "13_gh_unlocked")
        click(860, 660, 300); shot("13_gh_building")
        pg.wait_for_function("window.__outpost.NS.state.built.greenhouse === true", timeout=8000)
        pg.wait_for_timeout(600); shot("14_gh_ready")
        pg.wait_for_timeout(3500); shot("15_victory")
        check("victory shown", st("build")["mode"] == "won", json.dumps(st("build")))
        buttons = pg.evaluate("window.__outpost.build.children.list.filter(o => o.type === 'Container').slice(-3).map(o => ({x: o.x, width: o.width}))")
        no_overlap = len(buttons) == 3 and all(
            buttons[i]["x"] + buttons[i]["width"] / 2 <= buttons[i + 1]["x"] - buttons[i + 1]["width"] / 2
            for i in range(len(buttons) - 1)
        )
        check("completion buttons do not overlap", no_overlap, json.dumps(buttons))
        shot("16_final")

        # ---------------- MISSION
        click(640, 510, 500)                     # Start mission
        wait_scene("Mission")
        check("mission starts with five days", st("mission")["mission"]["day"] == 1)
        shot("17_mission_start")
        for _ in range(5):
            mission = pg.evaluate("window.__outpost.mission.mission")
            if mission["day"] == mission["stormDay"] - 1 and mission["power"] >= 2:
                x = 1035                               # Charge the shelter for the alert
            elif mission["power"] >= 2 and mission["day"] < 4:
                x = 245                                # Grow food
            else:
                x = 640                                # Save power
            click(x, 570, 250)
            after = st("mission")["mission"]
            check(f"mission day {mission['day']} resolves", after["day"] > mission["day"] or after["mode"] != "playing")
        check("five-day mission completes", st("mission")["mission"]["mode"] == "complete", json.dumps(st("mission")["mission"]))
        shot("18_mission_complete")
        b.close()

        for r in log: print(*r)
        print("--- browser messages:", len(errors))
        for e in errors[:25]: print("  ", e)


run()
