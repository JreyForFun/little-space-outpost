"""
Little Space Outpost - reproducible art pipeline (Blender 4.2+ / 5.x, EEVEE).

Every model is built from code (no external files), cel-shaded with 3 flat tones and
outlined with a navy "inverted hull", so buildings, crew and scenery share one style.

Usage (from the repo root):
  blender -b --factory-startup --python tools/blender/render_assets.py -- [groups...]
groups: buildings astronauts earth sites maps   (default: all)

Outputs:
  assets/buildings/<id>_<idle|ready>.png          384x272, ground anchor at 86% height
  tools/blender/_out/astro/<color>_<row>_<i>.png  256x256 frames (sheets composed by tools/compose_sheets.py)
  tools/blender/_out/earth.png, site_*.png, map_*.png  (finished by tools/compose_sheets.py)
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "tools", "blender", "_out")
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)

# ----------------------------------------------------------------------------- palette
def hexc(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)

NAVY = "#241a4f"
PAL = {
    "cream": "#fff3e0", "white": "#fbf8ff", "teal": "#3fd3c7", "tealdk": "#1fa39a", "orange": "#ff8a5c",
    "yellow": "#ffd23f", "green": "#7ee36b", "greendk": "#3fb052", "lav": "#b9a7f0", "grey": "#cfc9f2",
    "greydk": "#8f84cf", "slate": "#55489a", "panel": "#3f56d6", "panelhi": "#8da0ff", "soil": "#9a5a3c",
    "ice": "#bff0ff", "icedk": "#6cc8f0", "steel": "#b9b6e6", "regolith": "#a99fd6", "off": "#5d5687",
    "pink": "#ff8fc8", "glass": "#bff6ff",
}

# ----------------------------------------------------------------------------- scene setup
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    try:
        sc.eevee.taa_render_samples = 64
    except Exception:
        pass
    sc.render.dither_intensity = 0.0
    for attr, val in (("use_shadow_jitter_viewport", False), ("shadow_ray_count", 1), ("shadow_step_count", 1)):
        try:
            setattr(sc.eevee, attr, val)
        except Exception:
            pass
    world = bpy.data.worlds.new("W")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = hexc("#7d86b8")
    bg.inputs[1].default_value = 0.35
    return sc


_mats = {}


def toon(name, base, shade=None, hi=None, emit=False, alpha=1.0):
    """3-band cel material. emit=True -> flat glowing colour (lights, screens)."""
    key = (name, base, emit, alpha)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    if emit:
        em = nt.nodes.new("ShaderNodeEmission")
        em.inputs[0].default_value = hexc(base)
        em.inputs[1].default_value = 1.0
        shader = em
    else:
        dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
        dif.inputs[0].default_value = (1, 1, 1, 1)
        s2r = nt.nodes.new("ShaderNodeShaderToRGB")
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "CONSTANT"
        b = hexc(base)
        sh = hexc(shade) if shade else (b[0] * 0.62, b[1] * 0.62, b[2] * 0.78, 1)
        hh = hexc(hi) if hi else (min(1, b[0] * 1.12 + 0.03), min(1, b[1] * 1.12 + 0.03), min(1, b[2] * 1.1 + 0.03), 1)
        els = ramp.color_ramp.elements
        els[0].position, els[0].color = 0.0, sh
        els[1].position, els[1].color = 0.22, b
        e3 = els.new(0.82)
        e3.color = hh
        em = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(dif.outputs[0], s2r.inputs[0])
        nt.links.new(s2r.outputs[0], ramp.inputs[0])
        nt.links.new(ramp.outputs[0], em.inputs[0])
        shader = em
    if alpha < 1.0:
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        mix = nt.nodes.new("ShaderNodeMixShader")
        mix.inputs[0].default_value = alpha
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(shader.outputs[0], mix.inputs[2])
        shader = mix
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            m.blend_method = "BLEND"
    nt.links.new(shader.outputs[0], out.inputs[0])
    _mats[key] = m
    return m


def outline_mat():
    if "OUTLINE" in bpy.data.materials:
        return bpy.data.materials["OUTLINE"]
    m = toon("OUTLINE", NAVY, emit=True)
    m.name = "OUTLINE"
    m.use_backface_culling = True
    return m


def finish(obj, mat, outline=0.035):
    """Assign material, smooth-ish shading and an inverted-hull outline."""
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    if outline:
        obj.data.materials.append(outline_mat())
        mod = obj.modifiers.new("outline", "SOLIDIFY")
        mod.thickness = outline
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.material_offset = 1
        mod.use_rim = False
    return obj


def prim(kind, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), mat=None, outline=0.035, smooth=True, dome=False, **kw):
    ops = {
        "cube": bpy.ops.mesh.primitive_cube_add,
        "cyl": bpy.ops.mesh.primitive_cylinder_add,
        "sphere": bpy.ops.mesh.primitive_uv_sphere_add,
        "cone": bpy.ops.mesh.primitive_cone_add,
        "torus": bpy.ops.mesh.primitive_torus_add,
        "ico": bpy.ops.mesh.primitive_ico_sphere_add,
        "plane": bpy.ops.mesh.primitive_plane_add,
    }
    if kind == "sphere":
        kw.setdefault("segments", 32)
        kw.setdefault("ring_count", 16)
    if kind in ("cyl", "cone"):
        kw.setdefault("vertices", 32)
    ops[kind](location=loc, rotation=[math.radians(a) for a in rot], **kw)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if dome:  # keep only the upper half (sits on the ground)
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
        bm.to_mesh(o.data)
        bm.free()
    if smooth and kind in ("sphere", "cyl", "cone", "torus", "ico"):
        bpy.ops.object.shade_smooth()
    if mat is not None:
        finish(o, mat, outline)
    return o


def sun(rot=(50, 0, 35), strength=3.2):
    d = bpy.data.lights.new("sun", "SUN")
    d.energy = strength
    d.angle = 0.0
    try:
        d.use_soft_shadow = False
    except Exception:
        pass
    o = bpy.data.objects.new("sun", d)
    bpy.context.collection.objects.link(o)
    o.rotation_euler = [math.radians(a) for a in rot]
    return o


def ortho_cam(scale, elev=28, yaw=0, res=(384, 272), dist=20):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    cd = bpy.data.cameras.new("cam")
    cd.type = "ORTHO"
    cd.ortho_scale = scale
    cam = bpy.data.objects.new("cam", cd)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    e, y = math.radians(elev), math.radians(yaw)
    cam.location = (dist * math.sin(y) * math.cos(e), -dist * math.cos(y) * math.cos(e), dist * math.sin(e))
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return cam


def anchor(cam, point=(0, 0, 0), target=(0.5, 0.14)):
    """Shift the camera so `point` lands at view coords `target` (x right, y up)."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    big = max(rx, ry)
    for _ in range(4):
        bpy.context.view_layer.update()
        v = world_to_camera_view(sc, cam, Vector(point))
        cam.data.shift_x += (v.x - target[0]) * rx / big
        cam.data.shift_y += (v.y - target[1]) * ry / big


def render(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print("rendered", os.path.relpath(path, ROOT))


def M(name, **kw):
    return toon(name, PAL[name], **kw)


def light_mat(on, color="yellow"):
    return toon("L_" + color + str(on), PAL[color] if on else PAL["off"], emit=True)


# ----------------------------------------------------------------------------- buildings
def foundation(rx=1.75, ry=0.95):
    o = prim("cyl", loc=(0, 0, 0.04), scale=(rx, ry, 0.08), mat=M("grey"), outline=0.035)
    return o


def b_crew(on):
    foundation(1.9, 1.05)
    body = prim("cyl", loc=(0, 0, 0.78), rot=(0, 90, 0), scale=(0.72, 0.72, 1.35), mat=M("cream"))
    for x in (-1.36, 1.36):
        prim("cyl", loc=(x, 0, 0.78), rot=(0, 90, 0), scale=(0.76, 0.76, 0.08), mat=M("orange"))
    for x in (-0.55, 0.25):
        prim("cyl", loc=(x, -0.7, 0.9), rot=(90, 0, 0), scale=(0.2, 0.2, 0.06), mat=light_mat(on, "teal"), outline=0.03)
    prim("cube", loc=(0.92, -0.62, 0.55), scale=(0.25, 0.12, 0.38), mat=M("orange"))
    prim("cube", loc=(0.92, -0.75, 0.6), scale=(0.15, 0.04, 0.22), mat=light_mat(on, "yellow"), outline=0.02)
    prim("cyl", loc=(-0.6, 0.25, 1.75), scale=(0.035, 0.035, 0.45), mat=M("steel"), outline=0.025)
    prim("sphere", loc=(-0.6, 0.25, 2.22), scale=(0.1, 0.1, 0.1), mat=light_mat(on, "orange"), outline=0.025)
    prim("cube", loc=(0, 0, 0.1), scale=(1.2, 0.5, 0.1), mat=M("steel"))


def b_oxygen(on):
    foundation(1.6, 0.95)
    prim("cube", loc=(0, 0, 0.3), scale=(1.15, 0.6, 0.22), mat=M("steel"))
    for x in (-0.55, 0.55):
        prim("cyl", loc=(x, 0.05, 1.05), scale=(0.38, 0.38, 0.62), mat=M("teal"))
        prim("sphere", loc=(x, 0.05, 1.67), scale=(0.38, 0.38, 0.3), mat=M("teal"))
        prim("cyl", loc=(x, -0.36, 1.0), rot=(90, 0, 0), scale=(0.12, 0.12, 0.04), mat=light_mat(on, "teal"), outline=0.025)
    prim("torus", loc=(0, 0.05, 1.45), rot=(90, 0, 0), scale=(0.3, 0.3, 0.3), mat=M("steel"), major_radius=1, minor_radius=0.18)
    prim("cube", loc=(0, -0.55, 0.42), scale=(0.3, 0.06, 0.12), mat=light_mat(on, "green"), outline=0.02)
    if on:
        for i, (x, z) in enumerate([(-0.2, 2.15), (0.15, 2.4), (-0.05, 2.65)]):
            prim("sphere", loc=(x, 0.05, z), scale=(0.1 + i * 0.02,) * 3, mat=M("white"), outline=0.025)


def b_solar(on):
    foundation(1.5, 0.85)
    prim("cyl", loc=(0, 0.1, 0.65), scale=(0.08, 0.08, 0.6), mat=M("steel"))
    prim("cube", loc=(0, 0.1, 0.18), scale=(0.35, 0.25, 0.12), mat=M("slate"))
    pmat = toon("panel" + str(on), PAL["panel"], hi=PAL["panelhi"] if on else None)
    for row in range(2):
        for col in range(4):
            x = -1.12 + col * 0.75
            prim("cube", loc=(x, 0.1 + (row - 0.5) * 0.62 * math.cos(math.radians(35)), 1.38 + (row - 0.5) * 0.62 * math.sin(math.radians(35))),
                 rot=(35, 0, 0), scale=(0.35, 0.29, 0.03), mat=pmat, outline=0.03)
    prim("cube", loc=(0, 0.1, 1.38), rot=(35, 0, 0), scale=(1.55, 0.03, 0.04), mat=M("steel"), outline=0.025)
    prim("cube", loc=(0.38, -0.17, 0.2), scale=(0.08, 0.02, 0.06), mat=light_mat(on, "yellow"), outline=0.02)
    if on:
        prim("cube", loc=(-0.75, -0.05, 1.5), rot=(35, 0, 45), scale=(0.07, 0.07, 0.01), mat=toon("glint", "#ffffff", emit=True), outline=0)


def b_shelter(on):
    foundation(1.75, 1.0)
    prim("sphere", loc=(0, 0.1, 0.12), scale=(1.35, 1.0, 1.0), mat=toon("regolith", PAL["regolith"]), dome=True)
    for i in range(9):
        a = math.radians(-70 + i * 17.5)
        prim("sphere", loc=(1.45 * math.sin(a), 0.1 - 1.07 * math.cos(a), 0.18), scale=(0.24, 0.17, 0.15), mat=M("greydk"), outline=0.025)
    prim("cube", loc=(0, -0.82, 0.48), scale=(0.34, 0.25, 0.44), mat=M("orange"))
    prim("cube", loc=(0, -1.06, 0.45), scale=(0.2, 0.02, 0.3), mat=M("slate"), outline=0.02)
    for x in (-0.22, 0.22):
        prim("sphere", loc=(x, -1.05, 0.98), scale=(0.07,) * 3, mat=light_mat(on, "orange"), outline=0.02)
    prim("cyl", loc=(0.55, 0.3, 1.15), scale=(0.03, 0.03, 0.3), mat=M("steel"), outline=0.02)
    prim("sphere", loc=(0.55, 0.3, 1.47), scale=(0.08,) * 3, mat=light_mat(on, "yellow"), outline=0.02)


def b_greenhouse(on):
    foundation(1.8, 1.05)
    prim("cyl", loc=(0, 0, 0.18), scale=(1.45, 0.95, 0.12), mat=M("cream"))
    prim("cube", loc=(0, 0, 0.36), scale=(1.0, 0.55, 0.08), mat=toon("soil", PAL["soil"]), outline=0.025)
    rows = [(-0.55, -0.25), (0, -0.25), (0.55, -0.25), (-0.55, 0.25), (0, 0.25), (0.55, 0.25)]
    for (x, y) in rows:
        s = 0.2 if on else 0.13
        prim("ico", loc=(x, y, 0.5 + s * 0.6), scale=(s, s, s * 1.2), mat=M("green"), outline=0.025, subdivisions=2)
        prim("cyl", loc=(x, y, 0.47), scale=(0.025, 0.025, 0.08), mat=M("greendk"), outline=0)
    prim("sphere", loc=(0, 0, 0.25), scale=(1.4, 0.9, 1.05), mat=toon("glass", PAL["glass"], alpha=0.38), outline=0.03, dome=True)
    for a in (-50, 0, 50):
        rib = prim("torus", loc=(0, 0, 0), rot=(90, 0, a), scale=(1.4, 1.05, 1.4) if a == 0 else (1.25, 1.05, 1.25), mat=None,
                   major_radius=1.0, minor_radius=0.02)
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(rib.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if (rib.matrix_world @ v.co).z < 0], context="VERTS")
        bm.to_mesh(rib.data)
        bm.free()
        rib.location.z = 0.25
        finish(rib, M("tealdk"), 0)
    prim("cube", loc=(-1.25, -0.35, 0.5), scale=(0.25, 0.25, 0.38), mat=M("orange"))
    prim("cube", loc=(-1.25, -0.6, 0.55), scale=(0.13, 0.02, 0.22), mat=light_mat(on, "teal"), outline=0.02)
    if on:
        for x in (-0.5, 0.5):
            prim("cube", loc=(x, 0, 1.05), scale=(0.28, 0.06, 0.03), mat=toon("growlamp", PAL["pink"], emit=True), outline=0.02)


def b_battery(on):
    foundation(1.5, 0.85)
    for i, x in enumerate((-0.72, 0, 0.72)):
        prim("cube", loc=(x, 0, 0.62), scale=(0.3, 0.42, 0.52), mat=M("slate"))
        prim("cube", loc=(x, -0.43, 0.75), scale=(0.24, 0.02, 0.07), mat=M("yellow"), outline=0.02)
        lit = on and i < 3
        for k in range(3):
            prim("cube", loc=(x, -0.43, 0.32 + k * 0.13), scale=(0.18, 0.02, 0.04), mat=light_mat(lit, "green"), outline=0.015)
    prim("cube", loc=(0, 0, 1.18), scale=(1.1, 0.48, 0.05), mat=M("steel"))
    # lightning bolt sign
    bpy.ops.mesh.primitive_plane_add(location=(0, -0.5, 1.45))
    o = bpy.context.active_object
    me = o.data
    import bmesh
    bm = bmesh.new()
    pts = [(0.06, 0.3), (-0.16, -0.02), (-0.01, -0.02), (-0.07, -0.3), (0.16, 0.05), (0.01, 0.05)]
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]
    bm.faces.new(vs)
    bm.to_mesh(me)
    bm.free()
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.06
    finish(o, toon("bolt" + str(on), PAL["yellow"] if on else PAL["off"], emit=on), 0.025)


def b_ice(on):
    foundation(1.6, 0.95)
    for i, (x, y) in enumerate([(-0.75, 0.2), (0.15, 0.55), (0.4, -0.25)]):
        top = Vector((-0.1, 0.15, 1.95))
        base = Vector((x, y, 0.1))
        mid = (top + base) / 2
        d = top - base
        o = prim("cyl", loc=mid, scale=(0.05, 0.05, d.length / 2), mat=M("steel"), outline=0.025)
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    prim("cyl", loc=(-0.1, 0.15, 1.1), scale=(0.07, 0.07, 0.95), mat=M("orange"), outline=0.025)
    prim("cone", loc=(-0.1, 0.15, 0.18), rot=(180, 0, 0), scale=(0.14, 0.14, 0.2), mat=M("steel"), outline=0.025)
    prim("cube", loc=(-0.1, 0.15, 1.98), scale=(0.25, 0.2, 0.14), mat=M("orange"))
    prim("sphere", loc=(-0.1, -0.06, 2.02), scale=(0.06,) * 3, mat=light_mat(on, "teal"), outline=0.02)
    prim("cube", loc=(0.95, -0.15, 0.42), scale=(0.42, 0.34, 0.3), mat=M("teal"))
    prim("cube", loc=(0.95, -0.15, 0.72), scale=(0.38, 0.3, 0.02), mat=M("tealdk"), outline=0.02)
    chunks = [(0.85, -0.2, 0.82), (1.1, -0.05, 0.8), (0.98, -0.32, 0.86), (-0.55, -0.45, 0.2), (-0.3, -0.62, 0.16)]
    for i, (x, y, z) in enumerate(chunks[: 5 if on else 2]):
        prim("ico", loc=(x, y, z), rot=(i * 20, i * 33, i * 15), scale=(0.15, 0.13, 0.12), mat=M("ice", shade=PAL["icedk"]), outline=0.022,
             smooth=False, subdivisions=1)


BUILDINGS = {"crew": b_crew, "oxygen": b_oxygen, "solar": b_solar, "shelter": b_shelter,
             "greenhouse": b_greenhouse, "battery": b_battery, "ice": b_ice}


def render_buildings():
    for bid, fn in BUILDINGS.items():
        for on in (False, True):
            reset()
            _mats.clear()
            sun((52, 0, 32))
            fn(on)
            cam = ortho_cam(5.6, elev=27, yaw=18)
            anchor(cam, (0, 0, 0), (0.5, 0.14))
            render(os.path.join(ASSETS, "buildings", f"{bid}_{'ready' if on else 'idle'}.png"))


# ----------------------------------------------------------------------------- crew (chibi, faces visible)
CREW_STYLE = {
    # sprite key: suit accent, skin tone, hair colour, helmet extra
    "coral": {"accent": "#ff7f5c", "skin": "#a8694a", "hair": "#2a1d2e", "extra": "antenna"},     # Rio, engineer
    "sage": {"accent": "#4fcf74", "skin": "#f3c9a6", "hair": "#d9622b", "extra": "lamp"},         # Sage, botanist
    "lavender": {"accent": "#a77cf0", "skin": "#d39a6c", "hair": "#2b2250", "extra": "ears"},     # Lumi, geologist
    "bluey": {"accent": "#47b6f0", "skin": "#f0c09a", "hair": "#6b3e26", "extra": "dish"},
    "blueberry": {"accent": "#4f6be0", "skin": "#8a5a3c", "hair": "#1d1a2e", "extra": "antenna"},
}
INK = "#1c1533"


def cut_verts(o, keep):
    """Delete vertices (local coords) for which keep(co) is False."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()


def build_face(parts, part, head, expr, z0=1.25):
    """Eyes, cheeks, mouth and brows on the front of the face sphere (y ~ -0.45)."""
    ink = toon("ink", INK, emit=True)
    white = toon("eyehi", "#ffffff", emit=True)
    for side in (-1, 1):
        x = 0.15 * side
        if expr == "tired":
            part("eye" + str(side), "cube", (x, -0.445, z0 + 0.01), (0.07, 0.02, 0.014), ink, head, outline=0)
        else:
            big = 1.12 if expr == "worried" else 1.0
            part("eye" + str(side), "sphere", (x, -0.43, z0 + 0.02), (0.066 * big, 0.03, 0.094 * big), ink, head, outline=0)
            part("hi" + str(side), "sphere", (x + 0.025, -0.462, z0 + 0.06), (0.024, 0.01, 0.024), white, head, outline=0)
        part("cheek" + str(side), "sphere", (0.26 * side, -0.37, z0 - 0.1), (0.07, 0.02, 0.042),
             toon("cheek", "#ff8fa8", emit=True), head, outline=0)
        if expr == "worried":
            b = part("brow" + str(side), "cube", (x, -0.44, z0 + 0.15), (0.06, 0.012, 0.012), ink, head, outline=0)
            b.rotation_euler = (0, math.radians(22 * side), 0)
    if expr == "happy":
        m = part("mouth", "torus", (0, -0.445, z0 - 0.12), (1, 1, 1), None, head, rot=(90, 0, 0),
                 major_radius=0.075, minor_radius=0.02)
        cut_verts(m, lambda co: co.y < 0.005)  # object rotated 90deg on X: local y = world z; keep lower half -> smile
        finish(m, ink, 0)
    elif expr == "worried":
        part("mouth", "sphere", (0, -0.445, z0 - 0.13), (0.045, 0.02, 0.035), ink, head, outline=0)
    else:
        part("mouth", "cube", (0, -0.445, z0 - 0.13), (0.05, 0.015, 0.012), ink, head, outline=0)


def build_astronaut(color, expr="happy"):
    st = CREW_STYLE[color]
    acc = toon("acc_" + color, st["accent"])
    suit = toon("suit", "#fbf8ff", shade="#b7aee6", hi="#ffffff")
    parts = {}

    def part(name, kind, loc, scale, mat, parent=None, pivot=None, outline=0.03, **kw):
        o = prim(kind, loc=loc, scale=scale, mat=mat, outline=outline if mat is not None else 0, **kw)
        o.name = name
        if pivot is not None:
            bpy.context.scene.cursor.location = pivot
            bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        if parent:
            o.parent = parent
            o.matrix_parent_inverse = parent.matrix_world.inverted()
        parts[name] = o
        return o

    root = bpy.data.objects.new("root", None)
    bpy.context.collection.objects.link(root)
    parts["root"] = root
    body = part("body", "sphere", (0, 0, 0.55), (0.34, 0.3, 0.36), suit, root)
    part("belt", "torus", (0, 0, 0.42), (0.31, 0.27, 0.6), acc, body, major_radius=1.0, minor_radius=0.08)
    part("pack", "cube", (0, 0.31, 0.6), (0.26, 0.11, 0.26), acc, body)
    part("chest", "cube", (0.0, -0.29, 0.62), (0.1, 0.03, 0.07), toon("chest", "#ffd23f", emit=True), body)
    head = part("head", "sphere", (0, 0, 1.25), (0.56, 0.52, 0.52), None, body, pivot=(0, 0, 0.92))
    cut_verts(head, lambda co: co.y - 0.0 > -0.29)  # open the helmet front so the face is visible
    finish(head, suit, 0.03)
    part("rim", "torus", (0, -0.29, 1.25), (1, 1, 1), acc, head, rot=(90, 0, 0), major_radius=0.45, minor_radius=0.045)
    part("face", "sphere", (0, -0.02, 1.22), (0.44, 0.44, 0.42), toon("skin_" + color, st["skin"]), head)
    hair = part("hair", "sphere", (0, -0.01, 1.27), (0.455, 0.455, 0.40), None, head)
    cut_verts(hair, lambda co: co.z > 0.12)
    finish(hair, toon("hair_" + color, st["hair"]), 0.02)
    part("fringe", "sphere", (0.07, -0.33, 1.52), (0.24, 0.1, 0.08), toon("hair_" + color, st["hair"]), head, outline=0.015)
    part("glare", "sphere", (-0.3, -0.38, 1.5), (0.06, 0.02, 0.1), toon("glare", "#ffffff", emit=True), head, outline=0)
    build_face(parts, part, head, expr)
    if st["extra"] == "antenna":
        part("ant", "cyl", (0.24, 0.08, 1.85), (0.015, 0.015, 0.14), M("steel"), head)
        part("antb", "sphere", (0.24, 0.08, 2.0), (0.055,) * 3, acc, head)
    elif st["extra"] == "lamp":
        part("lamp", "cyl", (0, -0.18, 1.78), (0.09, 0.09, 0.05), toon("lamp", "#fff3b0", emit=True), head, rot=(-30, 0, 0))
    elif st["extra"] == "ears":
        for x in (-0.56, 0.56):
            part("ear" + str(x), "cyl", (x, 0, 1.25), (0.11, 0.11, 0.05), acc, head, rot=(0, 90, 0))
    elif st["extra"] == "dish":
        part("dish", "cone", (-0.25, 0.1, 1.82), (0.1, 0.1, 0.05), acc, head)
    for side, x in (("L", -0.35), ("R", 0.35)):
        arm = part("arm" + side, "sphere", (x, 0, 0.53), (0.1, 0.1, 0.19), suit, body, pivot=(x * 0.9, 0, 0.7))
        part("glove" + side, "sphere", (x, 0, 0.33), (0.095, 0.095, 0.08), acc, arm)
    for side, x in (("L", -0.14), ("R", 0.14)):
        leg = part("leg" + side, "sphere", (x, 0, 0.2), (0.12, 0.12, 0.16), suit, root, pivot=(x, 0, 0.32))
        part("boot" + side, "sphere", (x, -0.04, 0.06), (0.13, 0.16, 0.07), acc, leg)
    return parts


def blink(parts, closed):
    for k in ("eye-1", "eye1", "hi-1", "hi1"):
        if k in parts:
            parts[k].scale.z = 0.12 if closed else 1.0


def pose(parts, row, i):
    t = i / 8 * 2 * math.pi
    r = parts["root"]
    if row == "idle":
        r.location.z = 0.02 * math.sin(t)
        parts["body"].rotation_euler = (0, 0, 0)
        parts["head"].rotation_euler = (0, math.radians(5 * math.sin(t)), 0)
        for s, sign in (("L", 1), ("R", -1)):
            parts["arm" + s].rotation_euler = (math.radians(5 * math.sin(t)), math.radians(sign * 10), 0)
            parts["leg" + s].rotation_euler = (0, 0, 0)
        blink(parts, i == 6)
    else:
        swing = math.radians(30) * math.sin(t)
        r.location.z = 0.05 * abs(math.sin(t))
        parts["body"].rotation_euler = (math.radians(-5), 0, 0)
        parts["head"].rotation_euler = (math.radians(3), 0, math.radians(3 * math.sin(t)))
        parts["legL"].rotation_euler = (swing, 0, 0)
        parts["legR"].rotation_euler = (-swing, 0, 0)
        parts["armL"].rotation_euler = (-swing * 0.9, math.radians(10), 0)
        parts["armR"].rotation_euler = (swing * 0.9, math.radians(-10), 0)
        blink(parts, False)


def crew_scene(color, expr):
    reset()
    _mats.clear()
    sun((55, 0, -30), 3.2)
    return build_astronaut(color, expr)


def render_astronauts():
    for color in CREW_STYLE:
        parts = crew_scene(color, "happy")
        parts["root"].rotation_euler = (0, 0, math.radians(28))  # 3/4 view facing right, face visible
        cam = ortho_cam(2.5, elev=10, yaw=0, res=(256, 256))
        anchor(cam, (0, 0, 0), (0.5, 0.1))
        for row in ("idle", "walk"):
            for i in range(8):
                pose(parts, row, i)
                render(os.path.join(OUT, "astro", f"{color}_{row}_{i}.png"))


def render_portraits():
    for color in ("coral", "sage", "lavender"):
        for expr in ("happy", "worried", "tired"):
            parts = crew_scene(color, expr)
            parts["root"].rotation_euler = (0, 0, math.radians(14))
            cam = ortho_cam(1.55, elev=6, yaw=0, res=(384, 384))
            anchor(cam, (0, 0, 1.2), (0.5, 0.56))
            render(os.path.join(ASSETS, "characters", f"{color}_{expr}.png"))


# ----------------------------------------------------------------------------- ASTRO the robot coach
def build_robot(expr="happy", wave=False):
    white = toon("rbody", "#fbf8ff", shade="#a9a3e0", hi="#ffffff")
    teal = toon("rteal", "#3fd3c7")
    screen = toon("rscreen", "#1d1946", shade="#120f30", hi="#2c2870")
    glow = toon("rglow", "#7df9ff", emit=True)
    root = bpy.data.objects.new("root", None)
    bpy.context.collection.objects.link(root)

    def P(kind, loc, **k):
        o = prim(kind, loc=loc, **k)
        o.parent = root
        return o

    def arc(x, z, r, upper):
        e = P("torus", (x, -0.615, z), rot=(90, 0, 0), major_radius=r, minor_radius=0.026)
        cut_verts(e, (lambda co: co.y > -0.005) if upper else (lambda co: co.y < 0.005))
        finish(e, glow, 0)

    P("sphere", (0, 0, 1.1), scale=(0.66, 0.58, 0.62), mat=white, outline=0.035)
    P("torus", (0, 0, 0.9), scale=(0.6, 0.53, 0.5), mat=teal, outline=0.025, major_radius=1.0, minor_radius=0.07)
    P("sphere", (0, -0.36, 1.17), scale=(0.5, 0.26, 0.37), mat=screen, outline=0.03)
    y = -0.615
    if expr == "happy":
        arc(-0.16, 1.16, 0.085, True)
        arc(0.16, 1.16, 0.085, True)
        arc(0, 1.06, 0.07, False)
    elif expr == "wow":
        for x in (-0.16, 0.16):
            P("torus", (x, y, 1.2), rot=(90, 0, 0), mat=glow, outline=0, major_radius=0.08, minor_radius=0.028)
        P("torus", (0, y, 1.03), rot=(90, 0, 0), mat=glow, outline=0, major_radius=0.04, minor_radius=0.02)
    elif expr == "worried":
        for x in (-0.16, 0.16):
            P("sphere", (x, y, 1.18), scale=(0.06, 0.02, 0.08), mat=glow, outline=0)
            b = P("cube", (x, y, 1.31), scale=(0.07, 0.01, 0.014), mat=glow, outline=0)
            b.rotation_euler = (0, math.radians(-20 if x < 0 else 20), 0)
        P("cube", (0, y, 1.04), scale=(0.07, 0.01, 0.014), mat=glow, outline=0)
    else:  # talk
        for x in (-0.16, 0.16):
            P("sphere", (x, y, 1.2), scale=(0.065, 0.02, 0.085), mat=glow, outline=0)
        P("sphere", (0, y, 1.03), scale=(0.07, 0.02, 0.04), mat=glow, outline=0)
    P("sphere", (-0.32, -0.5, 1.35), scale=(0.05, 0.015, 0.08), mat=toon("rshine", "#ffffff", emit=True), outline=0)
    for x in (-0.66, 0.66):
        P("cyl", (x, 0, 1.15), rot=(0, 90, 0), scale=(0.15, 0.15, 0.07), mat=teal, outline=0.025)
    P("cyl", (0, 0, 1.82), scale=(0.02, 0.02, 0.13), mat=M("steel"), outline=0.02)
    P("sphere", (0, 0, 1.98), scale=(0.07,) * 3, mat=toon("rball", "#ffd23f", emit=True), outline=0.025)
    for side in (-1, 1):
        a = P("sphere", (0.7 * side, -0.05, 0.86), scale=(0.1, 0.1, 0.2), mat=white, outline=0.03)
        if wave and side == 1:
            a.location = (0.8, -0.05, 1.38)
            a.rotation_euler = (0, math.radians(-35), 0)
        else:
            a.rotation_euler = (0, math.radians(25 * side), 0)
    P("cone", (0, 0, 0.42), rot=(180, 0, 0), scale=(0.2, 0.2, 0.18), mat=teal, outline=0.025)
    P("cone", (0, 0, 0.18), rot=(180, 0, 0), scale=(0.13, 0.13, 0.16), mat=glow, outline=0)
    return root


def render_robot():
    for expr in ("happy", "talk", "wow", "worried"):
        reset()
        _mats.clear()
        sun((55, 0, -30), 3.2)
        root = build_robot(expr, wave=(expr == "happy"))
        root.rotation_euler = (0, 0, math.radians(12))
        cam = ortho_cam(2.35, elev=6, yaw=0, res=(384, 384))
        anchor(cam, (0, 0, 1.12), (0.5, 0.5))
        render(os.path.join(ASSETS, "characters", f"astro_{expr}.png"))


# ----------------------------------------------------------------------------- tiny planet (title scene)
def render_tiny_planet():
    reset()
    _mats.clear()
    sun((48, 0, 58), 3.4)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=3.0, location=(0, 0, 0))
    moon = bpy.context.active_object
    craters = [(Vector(c).normalized(), r, d) for c, r, d in [
        ((0.6, -0.7, 0.3), 0.32, 0.22), ((-0.7, -0.5, 0.2), 0.25, 0.18), ((0.1, -0.9, -0.35), 0.28, 0.2),
        ((-0.3, -0.8, -0.5), 0.18, 0.14), ((0.85, -0.3, -0.4), 0.2, 0.15), ((-0.9, -0.2, -0.3), 0.3, 0.2),
        ((0.4, -0.5, -0.75), 0.22, 0.16), ((-0.5, -0.3, 0.75), 0.16, 0.12)]]
    for v in moon.data.vertices:
        n = v.co.normalized()
        h = 0.0
        for c, r, d in craters:
            ang = n.angle(c) / r
            if ang < 1.0:
                h -= d * (1 - ang * ang)
            elif ang < 1.5:
                h += d * 0.5 * math.cos((ang - 1) / 0.5 * math.pi / 2) ** 2
        v.co = n * (3.0 + h)
    bpy.ops.object.shade_smooth()
    finish(moon, toon("tinymoon", "#b7b1e6", shade="#6f62b8", hi="#e8e3ff"), 0.05)

    def place(build_fn, tilt_x, tilt_y, s, spin=0.0):
        before = set(bpy.data.objects)
        build_fn()
        new = [o for o in bpy.data.objects if o not in before]
        pivot = bpy.data.objects.new("pivot", None)
        bpy.context.collection.objects.link(pivot)
        for o in new:
            if o.parent is None:
                o.parent = pivot
        n = Vector((math.sin(math.radians(tilt_y)), -math.sin(math.radians(tilt_x)),
                    math.cos(math.radians(tilt_x)) * math.cos(math.radians(tilt_y)))).normalized()
        pivot.location = n * 2.96
        q = Vector((0, 0, 1)).rotation_difference(n)
        pivot.rotation_mode = "QUATERNION"
        from mathutils import Quaternion
        pivot.rotation_quaternion = q @ Quaternion((0, 0, 1), math.radians(spin))
        pivot.scale = (s, s, s)
        return pivot

    # objects sit near the visible top edge (tilt ~ 10-28 deg toward the camera) so they read as standing
    place(lambda: b_crew(True), 12, 0, 0.5)
    place(lambda: b_greenhouse(True), 14, -34, 0.44)
    place(lambda: b_solar(True), 6, 32, 0.44)
    place(lambda: b_oxygen(True), 24, 16, 0.38)
    place(lambda: b_shelter(True), 20, -56, 0.36)
    place(lambda: b_battery(True), 12, 54, 0.34)
    for i, (color, tx, ty) in enumerate((("coral", 26, -12), ("sage", 30, 4), ("lavender", 24, 36))):
        place(lambda c=color: build_astronaut(c, "happy"), tx, ty, 0.55, spin=-25 + i * 25)

    def flag():
        prim("cyl", loc=(0, 0, 0.5), scale=(0.025, 0.025, 0.5), mat=M("steel"), outline=0.02)
        prim("cube", loc=(0.22, 0, 0.85), scale=(0.22, 0.015, 0.14), mat=M("orange"), outline=0.02)
    place(flag, 18, -16, 1.0)
    persp_cam((0, -16, 5.2), (0, 0, 1.6), lens=48, res=(1600, 1200))
    render(os.path.join(OUT, "tiny_planet.png"))


# ----------------------------------------------------------------------------- earth
def render_earth():
    reset()
    _mats.clear()
    lamp = sun((80, 0, 50), 4.0)  # light from the front-left -> gibbous Earth
    lamp.data.use_shadow = False  # the diffuse terminator is enough; shadow maps make blocky artefacts
    o = prim("sphere", loc=(0, 0, 0), scale=(1, 1, 1), mat=None, segments=64, ring_count=32)
    m = bpy.data.materials.new("earth")
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.3
    noise.inputs["Detail"].default_value = 2.5
    land = nt.nodes.new("ShaderNodeValToRGB")
    land.color_ramp.interpolation = "CONSTANT"
    land.color_ramp.elements[0].color = hexc("#3d7fe0")
    land.color_ramp.elements[1].position = 0.5
    land.color_ramp.elements[1].color = hexc("#6cc070")
    e = land.color_ramp.elements.new(0.62)
    e.color = hexc("#c9b27a")
    cloud_n = nt.nodes.new("ShaderNodeTexNoise")
    cloud_n.inputs["Scale"].default_value = 2.4
    cloud_n.inputs["Detail"].default_value = 1.5
    cloud = nt.nodes.new("ShaderNodeValToRGB")
    cloud.color_ramp.interpolation = "CONSTANT"
    cloud.color_ramp.elements[0].color = (0, 0, 0, 1)
    cloud.color_ramp.elements[1].position = 0.62
    cloud.color_ramp.elements[1].color = (1, 1, 1, 1)
    mixc = nt.nodes.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    shade = nt.nodes.new("ShaderNodeValToRGB")
    shade.color_ramp.interpolation = "CONSTANT"
    shade.color_ramp.elements[0].color = (0.05, 0.06, 0.16, 1)
    shade.color_ramp.elements[1].position = 0.08
    shade.color_ramp.elements[1].color = (0.55, 0.6, 0.85, 1)
    e2 = shade.color_ramp.elements.new(0.3)
    e2.color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1.0
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(noise.outputs[0], land.inputs[0])
    nt.links.new(cloud_n.outputs[0], cloud.inputs[0])
    nt.links.new(cloud.outputs[0], mixc.inputs[0])
    nt.links.new(land.outputs[0], mixc.inputs[6])
    mixc.inputs[7].default_value = (1, 1, 1, 1)
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs[0], shade.inputs[0])
    nt.links.new(mixc.outputs[2], mul.inputs[6])
    nt.links.new(shade.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])
    finish(o, m, 0.03)
    bpy.context.scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0
    cam = ortho_cam(2.25, elev=0, yaw=0, res=(512, 512))
    render(os.path.join(OUT, "earth.png"))


# ----------------------------------------------------------------------------- terrain scenes
def terrain(size, res, height_fn, mat, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=res, y_subdivisions=res, size=size, location=loc)
    o = bpy.context.active_object
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        v.co.z = height_fn(w.x, w.y)
    o.data.update()
    bpy.ops.object.shade_smooth()
    finish(o, mat, outline=0)
    return o


def noise2(x, y, seed=0.0):
    from mathutils import noise
    return noise.fractal(Vector((x * 0.06 + seed, y * 0.06 + seed * 1.7, seed)), 0.5, 2.0, 3)


def crater_field(craters):
    def h(x, y):
        z = 0.0
        for (cx, cy, r, d) in craters:
            dist = math.hypot(x - cx, y - cy) / r
            if dist < 1.0:
                z -= d * (1 - dist * dist)
            elif dist < 1.6:
                z += d * 0.45 * math.cos((dist - 1.0) / 0.6 * math.pi / 2) ** 2
        return z
    return h


def persp_cam(loc, look, lens=32, res=(1920, 1080)):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.clip_end = 2000
    cam = bpy.data.objects.new("cam", cd)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    cam.location = loc
    cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return cam


def screen_to_ground(cam, px, py, z=0.0):
    """Game coords (1280x720) -> world point on plane z."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    frame = cam.data.view_frame(scene=sc)  # tr, br, bl, tl in camera space
    tr, br, bl, tl = [cam.matrix_world @ f for f in frame]
    u, v = px / 1280.0, py / 720.0
    top = tl.lerp(tr, u)
    bot = bl.lerp(br, u)
    p = top.lerp(bot, v)
    o = cam.matrix_world.translation
    d = (p - o).normalized()
    t = (z - o.z) / d.z
    return o + d * t


def rock(loc, s, mat, seed=0):
    o = prim("ico", loc=loc, rot=(seed * 37 % 360, seed * 53 % 360, seed * 71 % 360), scale=(s, s * 0.85, s * 0.6),
             mat=mat, outline=0.03 * max(1, s), smooth=False, subdivisions=1)
    return o


TERRAIN = {
    "equator": {"ground": ("#b7b1e6", "#6f62b8", "#e8e3ff"), "mtn": ("#9d94dc", "#5b4fa6", "#d4ceff"),
                "rock": ("#968cd6", "#4f449c", "#cbc4f5"), "sun": (48, 30), "peaks": False},
    "pole": {"ground": ("#a9a1dc", "#584c9e", "#d9d3fa"), "mtn": ("#9289d0", "#40357f", "#cdc6f6"),
             "rock": ("#8d84cc", "#463b8f", "#c4bdf0"), "sun": (78, -35), "peaks": True},
    "mars": {"ground": ("#e58a5a", "#a8483a", "#ffc08a"), "mtn": ("#d9764e", "#93402f", "#f7ad7d"),
             "rock": ("#b9583f", "#6e2a24", "#e98a62"), "sun": (52, 28), "peaks": False},
}


def ground_mat(kind):
    g = TERRAIN[kind]["ground"]
    return toon("ground_" + kind, g[0], shade=g[1], hi=g[2])


def mountains(kind, dist=70):
    c = TERRAIN[kind]["mtn"]
    m = toon("mtn_" + kind, c[0], shade=c[1], hi=c[2])
    pole = TERRAIN[kind]["peaks"]
    from mathutils import noise
    def h(x, y):
        base = 7 if pole else 4
        n = noise.fractal(Vector((x * 0.02, 3.1 + (5 if kind == "mars" else 0), 0)), 0.55, 2.0, 5)
        peak = 0
        if pole:
            peak = 16 * math.exp(-((x + 25) / 14) ** 2) + 9 * math.exp(-((x - 30) / 18) ** 2)
        if kind == "mars":  # Jezero crater rim: long flat-topped walls
            peak = 5 * math.exp(-((x - 10) / 60) ** 2)
        return max(0, base + n * (9 if pole else 5) + peak) * max(0, 1 - abs(y - dist) / 25)
    terrain(260, 160, h, m, loc=(0, dist, 0))


def rock_mat(kind):
    c = TERRAIN[kind]["rock"]
    return toon("rock_" + kind, c[0], shade=c[1], hi=c[2])


def site_scene(kind):
    pole = kind == "pole"
    reset()
    _mats.clear()
    sc = bpy.context.scene
    sc.render.film_transparent = True  # sky + stars composed later
    el, az = TERRAIN[kind]["sun"]
    sun((el, 0, az), 3.4 if pole else 3.0)
    cam = persp_cam((0, -24, 7.5), (0, 30, -2.2), lens=30)
    # keep the build-pad band smooth: pads live around game y 410..540
    pads = [(380, 410), (610, 410), (840, 410), (1070, 410), (270, 540), (495, 540), (720, 540), (945, 540), (1160, 540)]
    pad_world = [screen_to_ground(cam, x, y) for x, y in pads]
    craters = [(-22, 18, 4.5, 1.6), (17, 22, 5.5, 1.8), (-9, 30, 3.0, 1.0), (26, 8, 3.5, 1.2), (-27, 2, 3.0, 1.0),
               (6, 34, 6.0, 1.5), (-15, -8, 1.6, 0.5), (14, -9, 1.4, 0.4)]
    craters = [c for c in craters if all(math.hypot(c[0] - p.x, c[1] - p.y) > c[2] * 1.7 + 1.6 for p in pad_world)]
    ch = crater_field(craters)
    def h(x, y):
        flat = min(1.0, min(math.hypot(x - p.x, y - p.y) for p in pad_world) / 4.0)
        return ch(x, y) + noise2(x, y, 3.0 if pole else (7.0 if kind == "mars" else 1.0)) * (0.35 if kind == "mars" else 0.18) * flat + (0.015 * max(0, y - 30) ** 1.4 if pole else 0)
    terrain(160, 240, h, ground_mat(kind), loc=(0, 30, 0))
    mountains(kind, 95)
    rm = rock_mat(kind)
    import random
    rnd = random.Random({"equator": 3, "pole": 7, "mars": 5}[kind])
    for i in range(40):
        x, y = rnd.uniform(-30, 30), rnd.uniform(-12, 40)
        if all(math.hypot(x - p.x, y - p.y) > 3.2 for p in pad_world):
            rock((x, y, h(x, y) + 0.05), rnd.uniform(0.15, 0.6) * (1 + max(0, y) / 30), rm, i)
    render(os.path.join(OUT, f"site_{kind}.png"))


def map_scene(kind):
    pole = kind == "pole"
    reset()
    _mats.clear()
    el, az = TERRAIN[kind]["sun"]
    sun((min(el, 70), 0, az), 3.2)
    cam = persp_cam((0, -30, 14), (0, 50, 0), lens=30)
    if kind == "mars":
        sites = {"jezero": (330, 480), "arcadia": (690, 530), "valles": (1010, 470)}
    elif pole:
        sites = {"malapert": (330, 470), "mouton": (650, 520), "haworth": (960, 480), "shackleton": (1120, 560)}
    else:
        sites = {"flats": (300, 500), "plain": (620, 545), "basin": (930, 500), "rim": (480, 420), "boulders": (820, 430)}
    W = {k: screen_to_ground(cam, *v) for k, v in sites.items()}
    feats = []
    if kind == "mars":
        jz = W["jezero"]
        va = W["valles"]
        craters = [(jz.x, jz.y + 2, 6.5, 1.8), (-35, 30, 6, 1.5), (30, 34, 5, 1.2), (-10, 40, 4, 1.0)]
        base = crater_field(craters)
        def h(x, y):
            canyon = -4.5 * math.exp(-((y - va.y - 1) / 2.2) ** 2) * (1 / (1 + math.exp(-(x - va.x + 9) * 0.6)))
            delta = 0.6 * math.exp(-(((x - jz.x + 2) / 2.5) ** 2 + ((y - jz.y) / 1.8) ** 2))
            return base(x, y) + canyon + delta + noise2(x, y, 8) * 0.35
    elif pole:
        mx, my = W["malapert"].x, W["malapert"].y
        mo = W["mouton"]
        ha = W["haworth"]
        sh = W["shackleton"]
        craters = [(ha.x + 6, ha.y + 4, 6, 3.0), (sh.x, sh.y, 4.5, 2.6), (-30, 25, 7, 2.5), (5, 30, 5, 2.0), (-8, -6, 2.0, 0.6)]
        base = crater_field(craters)
        def h(x, y):
            ridge = 5.5 * math.exp(-(((x - mx) / 5.0) ** 2 + ((y - my - 3) / 4.0) ** 2))
            plateau = 2.2 / (1 + math.exp((math.hypot(x - mo.x, (y - mo.y) * 1.3) - 5.0) * 1.5))
            return base(x, y) + ridge + plateau + noise2(x, y, 5) * 0.25
    else:
        rim = W["rim"]
        bo = W["boulders"]
        craters = [(rim.x - 1, rim.y + 5, 4.5, 2.2), (-30, 30, 6, 2.0), (28, 32, 5, 1.6), (40, 5, 3.5, 1.2), (-6, 38, 6, 1.5)]
        base = crater_field(craters)
        def h(x, y):
            return base(x, y) + noise2(x, y, 2) * 0.22
        import random
        rnd = random.Random(11)
        rm0 = rock_mat(kind)
        for i in range(14):
            x, y = bo.x + rnd.uniform(-3, 3), bo.y + rnd.uniform(-2, 2)
            feats.append(((x, y), rnd.uniform(0.4, 0.9), rm0, i))
    terrain(220, 330, h, ground_mat(kind), loc=(0, 40, 0))
    mountains(kind, 120)
    for (x, y), s, m, i in feats:
        rock((x, y, h(x, y) + 0.1), s, m, i)
    render(os.path.join(OUT, f"map_{kind}.png"))


# ----------------------------------------------------------------------------- main
def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    groups = args or ["buildings", "astronauts", "portraits", "robot", "earth", "planet", "sites", "maps"]
    if "buildings" in groups:
        render_buildings()
    if "astronauts" in groups:
        render_astronauts()
    if "portraits" in groups:
        render_portraits()
    if "robot" in groups:
        render_robot()
    if "earth" in groups:
        render_earth()
    if "planet" in groups:
        render_tiny_planet()
    for kind in ("equator", "pole", "mars"):
        if "sites" in groups:
            site_scene(kind)
        if "maps" in groups:
            map_scene(kind)


main()
