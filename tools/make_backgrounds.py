#!/usr/bin/env python3
"""Draw the two Moon backdrops (the supplied artwork has none).

  assets/environment/moon_explore.png   cratered surface for the Explore stage
  assets/environment/moon_site.png      calmer plain for the Build stage

Flat fills + navy outlines to sit next to the supplied buildings. Replace the
files (same 1920x1080 frame) with your own art whenever you like.
"""
import os
import random
import math
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "environment")
W, H, SS = 1920, 1080, 2  # final size, supersample factor
NAVY = (34, 42, 77)
SKY_TOP, SKY_BOT = (17, 22, 58), (44, 52, 112)
GROUND_A, GROUND_B = (150, 154, 190), (178, 181, 214)
FAR = (110, 114, 160)
CRATER_IN, CRATER_RIM = (123, 127, 166), (196, 199, 226)
ROCK, ROCK_HI = (134, 138, 176), (170, 174, 204)
HORIZON = 420


def s(v):
    return int(round(v * SS))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ellipse(d, cx, cy, rx, ry, fill, outline=NAVY, width=5):
    d.ellipse([s(cx - rx), s(cy - ry), s(cx + rx), s(cy + ry)], fill=fill, outline=outline, width=s(width) if outline else 0)


def crater(d, cx, cy, w):
    rx, ry = w / 2, w * 0.17
    ellipse(d, cx, cy + ry * 0.12, rx, ry, CRATER_RIM, NAVY, 5)           # raised rim
    ellipse(d, cx, cy + ry * 0.22, rx * 0.84, ry * 0.78, CRATER_IN, NAVY, 4)  # bowl
    ellipse(d, cx - rx * 0.1, cy + ry * 0.45, rx * 0.55, ry * 0.42, lerp(CRATER_IN, NAVY, 0.25), None)  # deep shade


def rock(d, cx, cy, r):
    pts = []
    for k in range(7):
        ang = k / 7 * math.tau
        rr = r * (0.8 + 0.25 * math.sin(k * 2.1 + cx))
        pts.append((s(cx + math.cos(ang) * rr), s(cy + math.sin(ang) * rr * 0.62)))
    d.polygon(pts, fill=ROCK, outline=NAVY, width=s(4))
    ellipse(d, cx - r * 0.25, cy - r * 0.18, r * 0.32, r * 0.14, ROCK_HI, None)


def build(name, craters, rocks, seed):
    rnd = random.Random(seed)
    img = Image.new("RGB", (s(W), s(H)), SKY_TOP)
    d = ImageDraw.Draw(img)

    # sky gradient
    for y in range(s(HORIZON + 40)):
        t = y / s(HORIZON + 40)
        d.line([(0, y), (s(W), y)], fill=lerp(SKY_TOP, SKY_BOT, t))
    # stars
    for _ in range(170):
        x, y = rnd.randint(0, W), rnd.randint(0, HORIZON - 40)
        r = rnd.choice([1.5, 1.5, 2, 2.5, 3])
        d.ellipse([s(x - r), s(y - r), s(x + r), s(y + r)], fill=(255, 241, 220))
    # Earth
    ex, ey, er = 1560, 175, 72
    ellipse(d, ex, ey, er, er, (92, 200, 224), NAVY, 6)
    ellipse(d, ex - 18, ey - 10, 26, 18, (126, 212, 138), None)
    ellipse(d, ex + 26, ey + 22, 22, 14, (126, 212, 138), None)
    ellipse(d, ex + 8, ey - 34, 30, 8, (255, 241, 220), None)
    ellipse(d, ex - 30, ey + 38, 24, 7, (255, 241, 220), None)
    ellipse(d, ex, ey, er, er, None, NAVY, 6)

    # far ridge
    pts = [(0, s(HORIZON + 60))]
    x = 0
    while x <= W + 80:
        pts.append((s(x), s(HORIZON - 30 - 38 * abs(math.sin(x / 210.0 + seed)) - rnd.randint(0, 14))))
        x += 70
    pts.append((s(W), s(HORIZON + 60)))
    d.polygon(pts, fill=FAR, outline=NAVY, width=s(5))

    # ground with a soft horizon curve
    top = [(s(x), s(HORIZON + 12 - 10 * math.sin(x / 400.0 + seed))) for x in range(0, W + 40, 40)]
    d.polygon(top + [(s(W), s(H)), (0, s(H))], fill=GROUND_A)
    d.line(top, fill=NAVY, width=s(6))
    for y in range(s(HORIZON + 20), s(H)):
        t = (y - s(HORIZON + 20)) / (s(H) - s(HORIZON + 20))
        d.line([(0, y), (s(W), y)], fill=lerp(GROUND_A, GROUND_B, t))
    d.line(top, fill=NAVY, width=s(6))

    # props, far to near so nearer ones overlap
    for cx, cy, w in sorted(craters, key=lambda c: c[1]):
        crater(d, cx, cy, w)
    for cx, cy, r in sorted(rocks, key=lambda c: c[1]):
        rock(d, cx, cy, r)

    img = img.resize((W, H), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, name))
    print("wrote", name)


# Coordinates are in the 1920x1080 frame (game view = 1280x720, so x1.5).
# Explore stage: three open plains (A,B,C) and three blocked spots (D crater, E boulders, F crater).
explore_craters = [
    (720, 630, 330),    # D  crater rim  (blocked)  -> game (480,420)
    (1650, 705, 270),   # F  crater      (blocked)  -> game (1100,470)
    (260, 560, 150), (1060, 520, 110), (1800, 540, 130), (120, 900, 200), (1180, 1000, 150), (420, 985, 110),
]
explore_rocks = [
    (1190, 640, 30), (1235, 668, 38), (1288, 640, 26), (1250, 610, 20), (1330, 676, 22), (1160, 676, 18),  # E boulder field
    (560, 800, 16), (860, 760, 14), (1380, 960, 20), (240, 700, 14), (1800, 780, 16),
]
# Build stage: a calm plain with a few far craters so the pads read clearly.
site_craters = [(230, 560, 190), (1700, 570, 210), (140, 930, 230), (1790, 930, 190)]
site_rocks = [(380, 520, 16), (1520, 540, 18), (300, 980, 22), (1620, 985, 24), (960, 505, 12)]

if __name__ == "__main__":
    build("moon_explore.png", explore_craters, explore_rocks, 3)
    build("moon_site.png", site_craters, site_rocks, 7)
