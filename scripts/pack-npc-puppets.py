"""Assemble the map cast from the player's articulated parts and NPC costume sheets."""

import json
import subprocess
from pathlib import Path
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MODULAR = ROOT / "assets" / "modular"
OUTPUT = MODULAR / "representatives"
ARM_COLUMNS = {
    "brazo_izquierdo": 1, "brazo_derecho": 2,
    "antebrazo_izquierdo": 3, "antebrazo_derecho": 4
}
BEARDS = {"daichi": (0, 94, 151, 75, 68), "iori": (1, 57, 136, 112, 96)}
PORTRAIT_SCALE = .61
# Source and destination rows of each sash in its individual costume.
# The higher obi and the narrower belts fit between chest and hips differently.
WAISTS = {
    "ren": ((.51, .63), (.57, .68)), "daichi": ((.43, .57), (.55, .67)),
    "mei": ((.47, .62), (.56, .69)), "sayo": ((.42, .57), (.53, .66)),
    "hana": ((.38, .52), (.51, .63)), "yuna": ((.31, .45), (.48, .61)),
    "kureha": ((.39, .55), (.51, .64)), "goro": ((.51, .67), (.57, .70)),
    "riku": ((.46, .57), (.55, .66)), "nao": ((.48, .64), (.55, .69)),
    "iori": ((.55, .64), (.59, .68)), "nami": ((.46, .59), (.55, .67))
}
SLEEVE_COLORS = {"yuna": ("#26362e", "#92986e"), "kureha": ("#221d29", "#665366")}

# Hair boxes are relative to the top-left of the head in the corresponding rig.
# They allow tied strands to extend down the back without shrinking the crown.
CAST = {
    "cuartel-dojo-biblioteca": [
        ("ren", "male", "claro", "poker", "#252c3e", "#2c3447", (-12, -23, 198, 127), True),
        ("daichi", "male", "dorado", "angry", "#322724", "#511e1d", (-15, -24, 199, 131), False),
        ("mei", "female", "claro", "poker", "#202c39", "#224443", (-36, -22, 232, 170), True),
        ("sayo", "female", "muy-claro", "poker", "#312841", "#332a49", (-66, -35, 260, 224), False)
    ],
    "tienda-gremio-torre-arena": [
        ("hana", "female", "claro", "happy", "#45322b", "#513027", (-14, -18, 212, 165), True),
        ("yuna", "female", "claro", "happy", "#374230", "#493a23", (-59, -16, 253, 237), False),
        ("kureha", "female", "muy-claro", "angry", "#302430", "#492b42", (-77, -39, 275, 228), False),
        ("goro", "male", "dorado", "angry", "#302621", "#592a22", (-4, -14, 179, 111), True)
    ],
    "tablon-plaza-kagemori": [
        ("riku", "male", "claro", "poker", "#353c2c", "#384530", (-13, -21, 197, 134), False),
        ("nao", "female", "claro", "happy", "#34232d", "#6b262d", (-77, -36, 275, 215), False),
        ("iori", "male", "dorado", "poker", "#303140", "#514439", (-48, -14, 224, 178), False),
        ("nami", "female", "dorado", "poker", "#39352e", "#60422d", (-9, -21, 204, 135), False)
    ]
}


def rig_data():
    source = """
import { CHARACTER_RIGS } from './src/character-rigs.js';
import { skinPalette } from './src/skin-tones.js';
console.log(JSON.stringify({ rigs: CHARACTER_RIGS, palettes: Object.fromEntries(
  ['muy-claro', 'claro', 'dorado'].map(tone => [tone, skinPalette(tone)])) }));
"""
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", source], cwd=ROOT))


def extract(sheet, column, row, id):
    x, y = sheet.width // 6, sheet.height // 4
    left = column * x - (56 if column == 5 else 0)
    # Yuna's loose braid drops past the row, and the next ponytail begins below it.
    top = row * y + (19 if id == "kureha" and column == 5 else 0)
    end = (row + 1) * y + (19 if id == "yuna" and column == 5 else 0)
    cell = sheet.crop((left, top, (column + 1) * x, min(end, sheet.height)))
    alpha = cell.getchannel("A").point(lambda value: max(0, min(255, round((value - 32) * 255 / 208))))
    if column != 5:
        # Adjacent ribbons and braids may reach into an arm cell. Only the
        # connected garment is registered to the player's limb.
        pixels = np.asarray(alpha)
        _, labels, stats, _ = cv2.connectedComponentsWithStats((pixels > 32).astype(np.uint8))
        component = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        region = Image.fromarray((labels == component).astype(np.uint8) * 255)
        alpha = Image.fromarray(np.where(np.asarray(region.filter(ImageFilter.MaxFilter(3))), pixels, 0))
    box = alpha.getbbox()
    if box is None:
        raise ValueError(f"Empty sprite cell {column}, {row}")
    cell.putalpha(alpha)
    return cell.crop(box)


def skin(image, palette):
    gray = ImageOps.grayscale(image)
    channels = [gray.point([color[index] for color in palette]) for index in range(3)]
    return Image.merge("RGBA", (*channels, image.getchannel("A")))


def clothing_tone(image, middle, highlight="#d4c8ae"):
    colored = ImageOps.colorize(ImageOps.grayscale(image), "#08080c", highlight, mid=middle, midpoint=70)
    colored.putalpha(image.getchannel("A"))
    return colored


def row_edges(alpha):
    visible = np.asarray(alpha) > 32
    rows = np.flatnonzero(visible.any(axis=1))
    left = np.argmax(visible, axis=1)
    right = visible.shape[1] - 1 - np.argmax(visible[:, ::-1], axis=1)
    positions = np.arange(visible.shape[0])
    return np.interp(positions, rows, left[rows]), np.interp(positions, rows, right[rows])


def smooth_profile(edge, radius):
    samples = np.pad(edge, radius, mode="edge")
    return np.convolve(samples, np.hanning(2 * radius + 1) / radius, mode="valid")


def fitted_material(donor, mannequin, target_rows=(0, 1), source_rows=(0, 1)):
    """Project the cloth between landmarks, keeping the exact mannequin alpha."""
    width, height = mannequin.size
    template_alpha = mannequin.getchannel("A")
    source_alpha = donor.getchannel("A")
    left, right = row_edges(template_alpha)
    source_left, source_right = row_edges(source_alpha)
    rows = np.interp(np.linspace(0, 1, height), target_rows, source_rows) * (donor.height - 1)
    if len(target_rows) > 2:
        # Do not drag lapels or belts sideways with each individual tassel.
        rows = smooth_profile(rows, round(height * .035))
        left, right = (smooth_profile(edge, round(height * .075)) for edge in (left, right))
        source_left, source_right = (
            smooth_profile(edge, round(donor.height * .09)) for edge in (source_left, source_right)
        )
    starts = np.interp(rows, np.arange(donor.height), source_left)
    ends = np.interp(rows, np.arange(donor.height), source_right)
    fraction = np.clip((np.arange(width) - left[:, None]) / np.maximum(1, right - left)[:, None], 0, 1)
    cols = starts[:, None] + fraction * (ends - starts)[:, None]
    material = Image.fromarray(cv2.remap(
        np.asarray(donor.convert("RGBa")), cols.astype(np.float32),
        np.repeat(rows[:, None], width, axis=1).astype(np.float32),
        cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE
    ), mode="RGBa").convert("RGBA")
    # Keep the reference linework at the outside of each joint and garment.
    interior = template_alpha.filter(ImageFilter.MinFilter(5))
    interior = Image.fromarray(np.minimum(np.asarray(interior), np.asarray(material.getchannel("A"))))
    art = Image.composite(material, mannequin, interior)
    art.putalpha(template_alpha)
    return art


def native_cuff(art, base, donor, template, id):
    """Use the stock anatomy wherever the illustrated arm has a gray guide."""
    if id in SLEEVE_COLORS:
        base = clothing_tone(template, *SLEEVE_COLORS[id])
    donor_rgb = np.asarray(donor.convert("RGB"), dtype=np.int16)
    guide = (np.ptp(donor_rgb, axis=2) < 24) & (donor_rgb.min(axis=2) > 76)
    guide[round(donor.height * .56):] = False
    mask = Image.fromarray((guide * 255).astype(np.uint8)).convert("RGBA")
    mask.putalpha(donor.getchannel("A"))
    gray = Image.new("RGBA", base.size, "black")
    gray.putalpha(base.getchannel("A"))
    mask = fitted_material(mask, gray).convert("L").filter(ImageFilter.MaxFilter(5))
    result = Image.composite(base, art, mask)
    result.putalpha(base.getchannel("A"))
    return result


def draw(image, piece, center, size):
    w, h = (round(value) for value in size)
    image.alpha_composite(piece.resize((w, h), Image.Resampling.LANCZOS), (
        round(center[0] - w / 2), round(center[1] - h / 2)
    ))


def assemble(sheet, row, profile, rigs, palettes, beards, sleeve_fabric):
    id, body, tone, expression, pants, shoes, hair_box, bare = profile
    rig = rigs[body]
    palette = palettes[tone]
    body_path = MODULAR / ("man_sprites" if body == "male" else "woman_sprites") / "runtime"
    outfit_path = MODULAR / "outfits" / "training" / body
    outfit = {part.stem for part in outfit_path.glob("*.png")}
    image = Image.new("RGBA", (1000, 1475))
    offset_x, offset_y = 500, 490
    for part in rig["layers"]:
        name = part["id"]
        size = (part["width"] * part.get("scaleX", 1), part["height"] * part.get("scaleY", 1))
        center = (part["x"] + offset_x, part["y"] + offset_y)
        native = Image.open(body_path / f"{name}.png").convert("RGBA")
        if name == "torso":
            template = Image.open(outfit_path / "torso.png").convert("RGBA")
            source_waist, target_waist = WAISTS[id]
            underlay = clothing_tone(template, pants, "#8d8279")
            art = fitted_material(extract(sheet, 0, row, id), underlay,
                                  (0, .10, .23, *target_waist, 1), (0, .10, .23, *source_waist, 1))
        elif name in ARM_COLUMNS and not (bare and name.startswith("brazo")):
            base = skin(native, palette)
            donor = extract(sheet, ARM_COLUMNS[name], row, id)
            if id in sleeve_fabric and name.startswith("brazo"):
                fabric = clothing_tone(sleeve_fabric[id][name], *SLEEVE_COLORS[id])
                art = fitted_material(fabric, clothing_tone(native, *SLEEVE_COLORS[id]))
            else:
                art = fitted_material(donor, native)
                if name.startswith("antebrazo") and id in ("hana", "yuna", "kureha", "goro"):
                    art = native_cuff(art, base, donor, native, id)
        elif name in outfit:
            art = clothing_tone(Image.open(outfit_path / f"{name}.png").convert("RGBA"), shoes if name.startswith(("pie_", "pierna_")) else pants)
        else:
            art = skin(native, palette)
        draw(image, art, center, size)

    head = rig["byId"]["cabeza"]
    center = (head["x"] + offset_x, head["y"] + offset_y)
    top = (center[0] - head["width"] / 2, center[1] - head["height"] / 2)
    face = Image.open(MODULAR / "faces" / f"male_{expression}_{tone}.png").convert("RGBA")
    draw(image, face, center, (head["width"], head["height"]))
    if id in BEARDS:
        column, x, y, w, h = BEARDS[id]
        half = beards.width // 2
        art = beards.crop((column * half, 0, (column + 1) * half, beards.height))
        art = art.crop(art.getchannel("A").point(lambda value: 255 if value > 24 else 0).getbbox())
        draw(image, art, (top[0] + x + w / 2, top[1] + y + h / 2), (w, h))
    x, y, w, h = hair_box
    draw(image, extract(sheet, 5, row, id), (top[0] + x + w / 2, top[1] + y + h / 2), (w, h))

    # Use one scale and a fixed footprint per rig. Hair cannot resize or
    # recenter a body, even for a high bun or a long side braid.
    ground = max(part["y"] + part["height"] / 2 for part in rig["layers"] if part["id"].startswith("pie_"))
    crop_width = round(480 / PORTRAIT_SCALE)
    crop_height = round(800 / PORTRAIT_SCALE)
    left = offset_x - crop_width // 2 - 23
    bottom = round(offset_y + ground + 17 / PORTRAIT_SCALE)
    figure = image.crop((left, bottom - crop_height, left + crop_width, bottom))
    canvas = Image.new("RGBA", (480, 800))
    canvas.alpha_composite(figure.resize(canvas.size, Image.Resampling.LANCZOS))
    encoded = BytesIO()
    canvas.save(encoded, format="WEBP", quality=91, method=6)
    temporary = OUTPUT / f"{id}.webp.tmp"
    temporary.write_bytes(encoded.getvalue())
    temporary.replace(OUTPUT / f"{id}.webp")


def main():
    data = rig_data()
    def load_sheet(name):
        with Image.open(OUTPUT / "source" / f"{name}.png") as source:
            return source.convert("RGBA")

    beards = load_sheet("barbas")
    sheets = {name: load_sheet(name) for name in CAST}
    sleeves = {
        "yuna": {name: extract(sheets["cuartel-dojo-biblioteca"], column, 3, "sayo")
                 for name, column in ARM_COLUMNS.items() if name.startswith("brazo")},
        "kureha": {name: extract(sheets["cuartel-dojo-biblioteca"], column, 1, "daichi")
                   for name, column in ARM_COLUMNS.items() if name.startswith("brazo")}
    }
    for name, profiles in CAST.items():
        for row, profile in enumerate(profiles):
            assemble(sheets[name], row, profile, data["rigs"], data["palettes"], beards, sleeves)


if __name__ == "__main__":
    main()
