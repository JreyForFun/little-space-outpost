#!/usr/bin/env python3
"""Slice the supplied artwork sheets into individual transparent PNGs.

Run from anywhere:  python3 tools/slice_assets.py [source_dir]
Default source_dir is /mnt/user-data/uploads. Output goes to ../assets/.

Every building gets four variants that share ONE canvas size and ONE ground
anchor, so the game can swap them in place without any per-asset offsets:
    <id>_idle.png   the original finished/idle building (registered to the others)
    <id>_ghost.png  step 01 - select location
    <id>_build.png  step 02 - build in progress
    <id>_ready.png  step 03 - ready / active
"""
import os
import sys
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

BUILDINGS = ["crew", "oxygen", "solar", "shelter", "greenhouse"]
CARD_BG = (255, 255, 255)
PAGE_BG = (248, 247, 240)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")


def key_background(img, bg, tol=4, soften=2, enclosed_min_area=None):
    """Make the flat background around an object transparent.

    Background connected to the crop border is always removed. With
    enclosed_min_area set, background-coloured pockets enclosed by the artwork
    (e.g. between pipes, behind scaffolding) are removed too when they are at
    least that many pixels, so small white highlights survive. A thin ring of
    anti-aliased pixels along the cut is un-blended from the background colour
    to avoid a pale halo.
    """
    a = np.array(img).astype(np.int16)
    rgb = a[..., :3]
    near = np.all(np.abs(rgb - np.array(bg)) <= tol, axis=-1)
    labels, n = ndimage.label(near)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    border.discard(0)
    remove = set(border)
    if enclosed_min_area and n:
        areas = ndimage.sum(near, labels, range(1, n + 1))
        remove |= {i + 1 for i, ar in enumerate(areas) if ar >= enclosed_min_area}
    bgmask = np.isin(labels, list(remove))

    out = a.copy()
    out[..., 3] = np.where(bgmask, 0, out[..., 3])

    ring = ndimage.binary_dilation(bgmask, iterations=soften) & ~bgmask
    bgv = np.array(bg, dtype=np.float32)
    for y, x in zip(*np.nonzero(ring)):
        if a[y, x, 3] < 255:  # already translucent (converted shadow)
            continue
        c = rgb[y, x].astype(np.float32)
        # how far from the background colour -> estimated coverage
        alpha = float(np.clip((bgv - c).max() / 70.0, 0.0, 1.0))
        if alpha <= 0.02:
            out[y, x, 3] = 0
            continue
        un = (c - bgv * (1 - alpha)) / alpha
        out[y, x, :3] = np.clip(un, 0, 255)
        out[y, x, 3] = int(alpha * 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def shadow_to_translucent(img):
    """The cards show the ground shadow as opaque light grey (the translucent
    navy shadow of the originals composited on white). Convert it back so the
    state sprites blend onto the Moon exactly like the original sprites do."""
    a = np.array(img).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    al = (255 - r) / 222.0
    ok = (al > 0.004) & (al <= 0.14)
    ok &= np.abs(g - (255 - al * (255 - 41))) < 3
    ok &= np.abs(b - (255 - al * (255 - 74))) < 3
    out = a.copy()
    out[ok, 0], out[ok, 1], out[ok, 2] = 33, 41, 74
    out[ok, 3] = np.clip(al[ok] * 255, 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def trim(img, pad=0):
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    return img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))


def save(img, *parts):
    path = os.path.join(OUT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return path


def shadow_bbox_idle(img):
    """Idle sheet shadow = translucent navy (33,41,74) at alpha ~31."""
    a = np.array(img)
    m = (a[..., 3] >= 26) & (a[..., 3] <= 36) & (np.abs(a[..., 0].astype(int) - 33) < 6)
    return largest_bbox(m)


def shadow_bbox_card(img):
    """On the white cards the same shadow composites to about (228,229,233)."""
    a = np.array(img).astype(int)
    m = (a[..., 3] > 200) & (np.abs(a[..., 0] - 228) <= 3) & (np.abs(a[..., 1] - 229) <= 3) & (np.abs(a[..., 2] - 233) <= 3)
    return largest_bbox(m)


def largest_bbox(mask):
    labels, n = ndimage.label(ndimage.binary_closing(mask, iterations=3))
    if n == 0:
        raise RuntimeError("no shadow found")
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > 0.25 * sizes.max()]
    ys, xs = np.nonzero(np.isin(labels, keep))
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def slice_buildings():
    idle_sheet = load("Little_Space_Outpost___5_Cartoon_Game_Assets.png")
    states = load("Outpost_action_states___15_assets.png")

    idle_regions = [(0, 0, 600, 520), (600, 0, 1200, 520), (1200, 0, 1800, 520), (0, 600, 900, 1050), (900, 600, 1800, 1050)]
    card_x0, card_dx = 64, 438
    card_y0, card_dy = 287, 390
    W, H = 384, 272

    for i, bid in enumerate(BUILDINGS):
        # --- three state images from fixed windows of the cards
        variants = {}
        for j, name in enumerate(["ghost", "build", "ready"]):
            cx = card_x0 + card_dx * i
            cy = card_y0 + card_dy * j
            crop = states.crop((cx + 8, cy + 8, cx + 8 + W, cy + 8 + H))
            if name != "ghost":
                crop = shadow_to_translucent(crop)
            variants[name] = key_background(crop, CARD_BG, tol=2, enclosed_min_area=150)
            save(variants[name], "buildings", f"{bid}_{name}.png")

        # --- the original finished building, registered to the ready image
        region = idle_sheet.crop(idle_regions[i])
        bbox = region.getchannel("A").getbbox()
        idle = region.crop(bbox)
        sx0, sy0, sx1, sy1 = shadow_bbox_idle(idle)
        rx0, ry0, rx1, ry1 = shadow_bbox_idle(variants["ready"])  # shadow already converted to translucent
        scale = (rx1 - rx0) / float(sx1 - sx0)
        idle = idle.resize((round(idle.width * scale), round(idle.height * scale)), Image.LANCZOS)
        dx = round((rx0 + rx1) / 2 - ((sx0 + sx1) / 2) * scale)
        dy = round(ry1 - sy1 * scale)
        canvas = Image.new("RGBA", (W + 400, H + 400), (0, 0, 0, 0))
        canvas.alpha_composite(idle, (dx + 200, dy + 200))
        canvas = canvas.crop((200, 200, 200 + W, 200 + H))
        save(canvas, "buildings", f"{bid}_idle.png")
        print(f"{bid}: scale {scale:.3f}, offset ({dx},{dy})")


def slice_ui():
    kit = load("Outpost_game_controls___Action_kit.png")

    def grab(name, box, tol=4):
        img = trim(key_background(kit.crop(box), PAGE_BG, tol=tol))
        save(img, "ui", name + ".png")

    # building selector cards
    xs = [(64, 374), (398, 708), (732, 1042), (1066, 1376), (1400, 1710)]
    for bid, (x0, x1) in zip(BUILDINGS, xs):
        grab(f"card_{bid}", (x0 - 4, 224, x1 + 4, 420))

    # action buttons (3 columns x 3 rows)
    cols = [(60, 588), (620, 1148), (1180, 1708)]
    rows = [(488, 576), (586, 674), (684, 772)]
    names = [
        ["btn_select_location", "btn_place_building", "btn_activate_equipment"],
        ["btn_activate_panels", "btn_place_shelter", "btn_activate_greenhouse"],
        ["btn_confirm", "btn_cancel", "btn_need_resources"],
    ]
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            grab(names[r][c], (x0, y0, x1, y1))

    # status chips (4 columns x 2 rows)
    ccols = [(60, 452), (480, 872), (900, 1292), (1320, 1712)]
    crows = [(1028, 1098), (1108, 1178)]
    cnames = [
        ["chip_oxygen_online", "chip_power_available", "chip_supplies_ready", "chip_food_research_active"],
        ["chip_protection_ready", "chip_solar_event", "chip_needs_power", "chip_needs_supplies"],
    ]
    for r, (y0, y1) in enumerate(crows):
        for c, (x0, x1) in enumerate(ccols):
            grab(cnames[r][c], (x0, y0, x1, y1))

    # placement markers + solar event card
    grab("marker_valid", (80, 1424, 320, 1528))
    grab("marker_invalid", (384, 1424, 624, 1528))
    grab("marker_rotate", (688, 1424, 928, 1528))
    grab("panel_solar_event", (1004, 1414, 1710, 1596))


def copy_astronauts():
    for fname, key in [
        ("Blueberry___Idle__Walk___256px_sprites.png", "blueberry"),
        ("Bluey___Idle__Walk___256px_sprites.png", "bluey"),
        ("Coral___Idle__Walk___256px_sprites.png", "coral"),
        ("Lavender___Idle__Walk___256px_sprites.png", "lavender"),
        ("Sage___Idle__Walk___256px_sprites.png", "sage"),
    ]:
        os.makedirs(os.path.join(OUT, "astronauts"), exist_ok=True)
        shutil.copyfile(os.path.join(SRC, fname), os.path.join(OUT, "astronauts", key + ".png"))
    print("astronaut sheets copied (2048x512 = 8 x 2 frames of 256px; row 1 idle, row 2 walk)")


if __name__ == "__main__":
    slice_buildings()
    slice_ui()
    copy_astronauts()
    print("done ->", os.path.abspath(OUT))
