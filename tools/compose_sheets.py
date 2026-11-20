#!/usr/bin/env python3
"""Finish the Blender renders into game assets (run after tools/blender/render_assets.py).

  python tools/compose_sheets.py

- astronaut frames  -> assets/astronauts/<color>.png  (2048x512, row 1 idle, row 2 walk)
- earth render      -> assets/environment/earth.png
- site / map renders (transparent sky) -> vibrant sky (nebula on the Moon, butterscotch on Mars)
  + stars + Earth -> assets/environment/*.png
- tiny planet       -> assets/environment/title_planet.png ; nebula sky -> assets/environment/sky_nebula.png
Art direction: docs/ART-DIRECTION.md. Requires Pillow + NumPy.
"""
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "tools", "blender", "_out")
ENV = os.path.join(ROOT, "assets", "environment")
COLORS = ["blueberry", "bluey", "coral", "lavender", "sage"]


def sheets():
    for c in COLORS:
        sheet = Image.new("RGBA", (2048, 512), (0, 0, 0, 0))
        for r, row in enumerate(("idle", "walk")):
            for i in range(8):
                fr = Image.open(os.path.join(OUT, "astro", f"{c}_{row}_{i}.png")).convert("RGBA")
                sheet.alpha_composite(fr, (i * 256, r * 256))
        sheet.save(os.path.join(ROOT, "assets", "astronauts", f"{c}.png"), optimize=True)
        print("sheet", c)


def earth_img(size):
    e = Image.open(os.path.join(OUT, "earth.png")).convert("RGBA")
    e = e.crop(e.getbbox())
    return e.resize((size, size), Image.LANCZOS)


def gradient(w, h, top, bottom):
    t = np.linspace(0, 1, h)[:, None, None]
    arr = np.array(top, float)[None, None, :] * (1 - t) + np.array(bottom, float)[None, None, :] * t
    arr = np.repeat(arr, w, axis=1)
    return Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")


def blobs(w, h, rnd, colours, n, rmin, rmax, alpha, blur):
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        c = rnd.choice(colours)
        x, y = rnd.uniform(-0.1, 1.1) * w, rnd.uniform(-0.1, 0.65) * h
        rx, ry = rnd.uniform(rmin, rmax), rnd.uniform(rmin, rmax) * 0.6
        d.ellipse([x - rx, y - ry, x + rx, y + ry], fill=c + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def stars(img, rnd, n, max_y, glow=True):
    d = ImageDraw.Draw(img)
    w, h = img.size
    for _ in range(n):
        x, y = rnd.randrange(w), rnd.randrange(int(h * max_y))
        r = rnd.choice([1, 1, 1, 1.4, 1.8, 2.4])
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 250, 240, rnd.randint(140, 255)))
    if glow:
        for _ in range(16):
            x, y = rnd.randrange(w), rnd.randrange(int(h * max_y * 0.85))
            col = rnd.choice([(255, 240, 210), (200, 235, 255), (255, 210, 240)])
            for k, a in ((10, 40), (6, 90)):
                d.line([x - k, y, x + k, y], fill=col + (a,), width=2)
                d.line([x, y - k, x, y + k], fill=col + (a,), width=2)
            d.ellipse([x - 2.5, y - 2.5, x + 2.5, y + 2.5], fill=col + (255,))


def nebula_sky(w, h, seed):
    rnd = random.Random(seed)
    img = gradient(w, h, (20, 13, 61), (74, 40, 140))
    img.alpha_composite(blobs(w, h, rnd, [(255, 95, 174), (180, 80, 220)], 10, w * 0.12, w * 0.3, 70, w * 0.06))
    img.alpha_composite(blobs(w, h, rnd, [(63, 211, 224), (90, 130, 255)], 8, w * 0.1, w * 0.25, 60, w * 0.05))
    img.alpha_composite(blobs(w, h, rnd, [(255, 200, 120)], 3, w * 0.05, w * 0.12, 40, w * 0.04))
    stars(img, rnd, int(w * h / 3500), 0.75)
    return img


def mars_sky(w, h, seed):
    rnd = random.Random(seed)
    img = gradient(w, h, (196, 120, 110), (247, 210, 168))
    img.alpha_composite(blobs(w, h, rnd, [(255, 230, 190), (240, 170, 130)], 8, w * 0.15, w * 0.35, 60, w * 0.07))
    d = ImageDraw.Draw(img)
    # Phobos and Deimos, small and grey; Earth as a tiny blue "evening star"
    for (x, y, r) in ((0.62, 0.12, 14), (0.78, 0.2, 7)):
        d.ellipse([x * w - r, y * h - r, x * w + r, y * h + r], fill=(150, 125, 120, 255), outline=(90, 60, 70, 255), width=3)
    ex, ey = 0.36 * w, 0.1 * h
    for k, a in ((14, 50), (8, 120)):
        d.ellipse([ex - k, ey - k, ex + k, ey + k], fill=(120, 190, 255, a))
    d.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=(225, 245, 255, 255))
    return img


def horizon(img, x):
    a = img.getchannel("A")
    for y in range(img.height):
        if a.getpixel((x, y)) > 128:
            return y
    return img.height


def place_earth(bg, fg, at, size):
    e = earth_img(size)
    w, h = fg.size
    if at == "horizon":  # south pole: Earth hangs low over the horizon
        x = int(w * 0.80)
        pos = (x - size // 2, horizon(fg, x) - int(size * 0.72))
    else:
        pos = (int(at[0] - size / 2), int(at[1] - size / 2))
    glow = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([size * 0.4, size * 0.4, size * 1.6, size * 1.6], fill=(120, 190, 255, 90))
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.14)), (pos[0] - size // 2, pos[1] - size // 2))
    bg.alpha_composite(e, pos)


def scene(name, kind, earth_at, earth_size, seed):
    fg = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
    w, h = fg.size
    bg = mars_sky(w, h, seed) if kind == "mars" else nebula_sky(w, h, seed)
    if kind != "mars":
        place_earth(bg, fg, earth_at, earth_size)
    # soft atmospheric glow at the horizon line
    haze = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hy = horizon(fg, w // 2)
    col = (255, 214, 170) if kind == "mars" else (190, 160, 255)
    ImageDraw.Draw(haze).rectangle([0, hy - 40, w, hy + 30], fill=col + (70,))
    bg.alpha_composite(haze.filter(ImageFilter.GaussianBlur(30)))
    bg.alpha_composite(fg)
    bg.convert("RGB").save(os.path.join(ENV, name + ".png"), optimize=True)
    print("scene", name)


def title():
    sky = nebula_sky(1920, 1080, 9)
    sky.convert("RGB").save(os.path.join(ENV, "sky_nebula.png"), optimize=True)
    planet = Image.open(os.path.join(OUT, "tiny_planet.png")).convert("RGBA")
    planet = planet.crop(planet.getbbox())
    planet.save(os.path.join(ENV, "title_planet.png"), optimize=True)
    print("title", planet.size)


def main():
    sheets()
    earth_img(240).save(os.path.join(ENV, "earth.png"))
    scene("site_equator", "equator", (1235, 215), 140, 1)
    scene("site_pole", "pole", "horizon", 190, 2)
    scene("site_mars", "mars", None, 0, 5)
    scene("map_equator", "equator", (1240, 200), 130, 3)
    scene("map_pole", "pole", "horizon", 170, 4)
    scene("map_mars", "mars", None, 0, 6)
    title()


if __name__ == "__main__":
    main()
