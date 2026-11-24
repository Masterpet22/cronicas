"""Assemble the map cast from the player's articulated parts and NPC costume sheets."""

import json
import subprocess
from pathlib import Path
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MODULAR = ROOT / "assets" / "modular"
OUTPUT = MODULAR / "representatives"
ARM_COLUMNS = {
    "brazo_izquierdo": 1, "brazo_derecho": 2,
    "antebrazo_izquierdo": 3, "antebrazo_derecho": 4
}
BEARDS = {"iori": (1, 57, 136, 112, 96)}
CUSTOM_HAIR = {"goro": "goro-hair-v8.png", "ren": "ren-hair-v7.png", "mei": "mei-hair-v2.png"}
DAICHI_FACIAL_HAIR_AT = (231, 152)
DAICHI_CHIN_BEARD_AT = (246, 181)
PORTRAIT_SCALE = .61
HAIR_SCALE = 1.10
HAIR_SHIFT_LEFT = .10
EXTRA_HAIR_SCALE = 1.20
EXTRA_HAIR_Y_SCALE = 1.10
EXTRA_HAIR_Y_PX = {"yuna": 40, "goro": 18, "ren": 20, "daichi": 10}
EXTRA_HAIR_X_PX = {"goro": 10, "ren": 13}
HAIR_WIDTH_ADJUST = {"goro": .80}
HAIR_HEIGHT_ADJUST = {"goro": .80, "ren": 1.20, "mei": 1.10}
EXTRA_HAIR_HEIGHT_PX = {"goro": 10}
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
BOOTS = {
    "ren": "traveler", "daichi": "shadow", "mei": "channeler", "sayo": "channeler",
    "hana": "traveler", "yuna": "traveler", "kureha": "shadow", "goro": "shadow",
    "riku": "traveler", "nao": "channeler", "iori": "traveler", "nami": "traveler"
}
BOOT_HIGHLIGHTS = {"mei": "#658b83", "sayo": "#7b6a95", "nao": "#925d5d"}
# Inner opening of each boot: horizontal center, center height, and radii
# in source pixels. Each pair lists pie_derecho followed by pie_izquierdo.
BOOT_OPENINGS = {
    ("traveler", "male"): ((90, 14, 31, 8), (50, 14, 32, 8)),
    ("traveler", "female"): ((88, 14, 30, 8), (47, 14, 31, 8)),
    ("shadow", "male"): ((88, 16, 28, 9), (51, 16, 29, 10)),
    ("shadow", "female"): ((84, 16, 27, 9), (49, 16, 29, 9)),
    ("channeler", "male"): ((85, 14, 29, 7), (55, 13, 35, 7)),
    ("channeler", "female"): ((83, 13, 28, 7), (53, 13, 33, 7))
}
SHOE_LEGS = {"pie_derecho": "pierna_derecha", "pie_izquierdo": "pierna_izquierda"}

# Hairline depth at the temple, part, and far side of the native skull.
# The shallow right side protects the brow and keeps the face in three quarters.
HAIRLINES = {
    "ren": (.43, .30, .28, "#3c291f"), "daichi": (.43, .28, .25, "#675348"),
    "mei": (.43, .31, .25, "#233e48"), "sayo": (.42, .30, .26, "#362744"),
    "hana": (.41, .30, .25, "#572b22"), "yuna": (.43, .29, .26, "#463023"),
    "kureha": (.43, .31, .27, "#482333"), "goro": (.46, .245, .24, "#4a3526"),
    "riku": (.43, .31, .27, "#665034"), "nao": (.42, .29, .25, "#422a2a"),
    "iori": (.43, .275, .25, "#63584e"), "nami": (.43, .32, .27, "#533427")
}

# Hair boxes are relative to the top-left of the head in the corresponding rig.
# They allow tied strands to extend down the back without shrinking the crown.
CAST = {
    "cuartel-dojo-biblioteca": [
        ("ren", "male", "claro", "poker", "#252c3e", "#2c3447", (-7, -25, 187, 123), True),
        ("daichi", "male", "dorado", "angry", "#322724", "#511e1d", (-12, -18, 194, 133), False),
        ("mei", "female", "claro", "poker", "#202c39", "#224443", (-29, -25, 225, 150), True),
        ("sayo", "female", "muy-claro", "poker", "#312841", "#332a49", (-65, -48, 265, 212), False)
    ],
    "tienda-gremio-torre-arena": [
        ("hana", "female", "claro", "happy", "#45322b", "#513027", (-11, -26, 207, 153), True),
        ("yuna", "female", "claro", "happy", "#374230", "#493a23", (-54, -21, 252, 231), False),
        ("kureha", "female", "muy-claro", "angry", "#302430", "#492b42", (-71, -44, 265, 216), False),
        ("goro", "male", "dorado", "angry", "#302621", "#592a22", (-3, -11, 179, 118), True)
    ],
    "tablon-plaza-kagemori": [
        ("riku", "male", "claro", "poker", "#353c2c", "#384530", (-13, -24, 195, 133), False),
        ("nao", "female", "claro", "happy", "#34232d", "#6b262d", (-75, -40, 270, 204), False),
        ("iori", "male", "dorado", "poker", "#303140", "#514439", (-47, -18, 224, 175), False),
        ("nami", "female", "dorado", "poker", "#39352e", "#60422d", (-9, -25, 205, 132), False)
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
    top = row * y
    end = (row + 1) * y + (19 if id == "yuna" and column == 5 else 0)
    cell = sheet.crop((left, top, (column + 1) * x, min(end, sheet.height)))
    alpha = cell.getchannel("A").point(lambda value: max(0, min(255, round((value - 32) * 255 / 208))))
    if column != 5 or id == "kureha":
        # Keep the largest connected sprite: neighboring ribbons can enter
        # arm cells, and Yuna's braid crosses into Kureha's hair cell.
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


def registered_hair(donor, head, hair_box, id):
    x, y, width, height = hair_box
    art = donor.resize((width, height), Image.Resampling.LANCZOS)
    columns = (np.arange(width)[None, :] + x) / head["width"]
    rows = (np.arange(height)[:, None] + y) / head["height"]
    # Long strands toward the back pass behind the ear, head and shoulder.
    if id == "goro":
        # His short nape has no separate tail; the head used to hide it.
        back_mix = np.zeros((height, width), dtype=np.float32)
    elif id == "yuna":
        # Keep the crown and strands beside the ear in front. The polygon
        # follows only the tied braid and its loose end in this hair sprite.
        tail = Image.new("L", (width, height))
        reference_outline = [
            (120, 113), (151, 110), (174, 142), (170, 161),
            (143, 187), (140, 217), (187, 305), (0, 305),
            (0, 219), (50, 207), (65, 180), (100, 147), (101, 121)
        ]
        outline = [(round(px * width / 332), round(py * height / 305))
                   for px, py in reference_outline]
        ImageDraw.Draw(tail).polygon(outline, fill=255)
        back_mix = np.asarray(tail.filter(ImageFilter.GaussianBlur(3)), dtype=np.float32) / 255
    else:
        # Ren's short temple strands stay in front until they meet the ear.
        back_start = .60 if id == "ren" else .37
        back_mix = np.clip((.27 - columns) * 18, 0, 1) * np.clip((rows - back_start) * 16, 0, 1)
        if id == "daichi":
            # His long side lock crosses the temple and the top of the ear.
            # Keep these existing strands in front of the head to hide the
            # exposed scalp without covering the whole ear.
            temple = Image.new("L", (width, height))
            ImageDraw.Draw(temple).polygon([
                (50, 105), (115, 105), (115, 138),
                (95, 152), (60, 158), (45, 135)
            ], fill=255)
            front_temple = np.asarray(temple.filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255
            back_mix *= 1 - front_temple
    alpha = np.asarray(art.getchannel("A"), dtype=np.float32) / 255
    front_alpha = alpha * (1 - back_mix)
    # Split a single alpha layer without darkening semi-transparent edges.
    back_alpha = (alpha - front_alpha) / np.maximum(1 / 255, 1 - front_alpha)
    back, front = art.copy(), art
    back.putalpha(Image.fromarray(np.rint(back_alpha * 255).astype(np.uint8)))
    front.putalpha(Image.fromarray(np.rint(front_alpha * 255).astype(np.uint8)))
    return back, front


def scaled_hair_box(hair_box, id):
    x, y, width, height = hair_box
    scaled_width = round(width * HAIR_SCALE)
    scaled_height = round(height * HAIR_SCALE)
    x -= (scaled_width - width) // 2 + round(scaled_width * HAIR_SHIFT_LEFT)
    y -= (scaled_height - height) // 2
    extra_width = round(round(scaled_width * EXTRA_HAIR_SCALE) * HAIR_WIDTH_ADJUST.get(id, 1))
    extra_height = round(round(round(scaled_height * EXTRA_HAIR_SCALE) * EXTRA_HAIR_Y_SCALE)
                         * HAIR_HEIGHT_ADJUST.get(id, 1))
    extra_height += round(EXTRA_HAIR_HEIGHT_PX.get(id, 0) / PORTRAIT_SCALE)
    return (
        x - (extra_width - scaled_width) // 2 + round(EXTRA_HAIR_X_PX.get(id, 0) / PORTRAIT_SCALE),
        y - (extra_height - scaled_height) // 2 + round(EXTRA_HAIR_Y_PX.get(id, 0) / PORTRAIT_SCALE),
        extra_width,
        extra_height,
    )


def fitted_scalp(head_art, id):
    temple, part, far_side, color = HAIRLINES[id]
    width, height = head_art.size
    x = np.linspace(0, 1, width)
    profile = np.interp(x, [0, .14, .21, .34, .55, .76, .93, 1],
                        [temple - .035, temple, temple, part + .04, part, far_side - .02, far_side, far_side + .05])
    edge = smooth_profile(profile, 8) * height
    y = np.arange(height)[:, None]
    feather = 16 if id == "goro" else 7
    coverage = np.clip((edge - y) / feather, 0, 1)
    alpha = np.asarray(head_art.getchannel("A")) * coverage
    gray = ImageOps.grayscale(head_art)
    channels = [gray.point(lambda light: round(value * (.62 + light / 510))) for value in ImageColor.getrgb(color)]
    return Image.merge("RGBA", (*channels, Image.fromarray(np.rint(alpha).astype(np.uint8))))


def dress_ankle(leg, leg_part, boot, foot_part, opening, offset):
    """Register the boot on the visible shin and tuck the shin inside its rim."""
    cuff_x, cuff_y, radius_x, radius_y = opening
    leg_x = round(offset[0] + leg_part["x"] - leg.width / 2)
    leg_y = round(offset[1] + leg_part["y"] - leg.height / 2)
    # Sample the straight ankle above its rounded lower edge.
    ankle = leg.height - 20
    left, right = row_edges(leg.getchannel("A"))
    boot_x = round(leg_x + (left[ankle] + right[ankle]) / 2 - cuff_x)
    boot_y = round(offset[1] + foot_part["y"] - boot.height / 2)

    # Extend only the end of the shin if it narrows before reaching the rim.
    lower = ankle - 28
    extension = max(0, boot_y + cuff_y + radius_y + 2 - (leg_y + ankle))
    if extension:
        art = Image.new("RGBA", (leg.width, leg.height + extension))
        art.paste(leg.crop((0, 0, leg.width, lower)))
        end = leg.crop((0, lower, leg.width, leg.height))
        art.paste(end.resize((leg.width, end.height + extension), Image.Resampling.LANCZOS), (0, lower))
        leg = art

    # The back of the opening stays behind the shin. Its curved front edge
    # covers the shin, including the sides where it meets the collar.
    columns = leg_x + np.arange(leg.width) - boot_x - cuff_x
    rim = boot_y + cuff_y + radius_y * np.sqrt(np.clip(1 - (columns / radius_x) ** 2, 0, 1))
    rows = leg_y + np.arange(leg.height)[:, None]
    coverage = np.clip(rim - rows + .5, 0, 1)
    alpha = np.asarray(leg.getchannel("A"))
    leg.putalpha(Image.fromarray(np.rint(alpha * coverage).astype(np.uint8)))
    return (boot_x, boot_y), (leg, (leg_x, leg_y))


def assemble(sheet, row, profile, rigs, palettes, beards, sleeve_fabric):
    id, body, tone, expression, pants, shoes, hair_box, bare = profile
    rig = rigs[body]
    palette = palettes[tone]
    body_path = MODULAR / ("man_sprites" if body == "male" else "woman_sprites") / "runtime"
    outfit_path = MODULAR / "outfits" / "training" / body
    outfit = {part.stem for part in outfit_path.glob("*.png")}
    image = Image.new("RGBA", (1000, 1475))
    offset_x, offset_y = 500, 600
    head = rig["byId"]["cabeza"]
    head_center = (head["x"] + offset_x, head["y"] + offset_y)
    head_size = (head["width"], head["height"])
    top = (head_center[0] - head["width"] / 2, head_center[1] - head["height"] / 2)
    hair_box = scaled_hair_box(hair_box, id)
    x, y, w, h = hair_box
    hair_at = (round(top[0] + x), round(top[1] + y))
    hair_source = CUSTOM_HAIR.get(id)
    hair_donor = (Image.open(OUTPUT / "source" / hair_source).convert("RGBA")
                  if hair_source else extract(sheet, 5, row, id))
    back_hair, front_hair = registered_hair(hair_donor, head, hair_box, id)
    image.alpha_composite(back_hair, hair_at)
    dressed_legs = {}
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
        elif name in SHOE_LEGS:
            style = BOOTS[id]
            foot_path = MODULAR / "outfits" / style / body / f"{name}.png"
            upper = BOOT_HIGHLIGHTS.get(id, "#c4b6a0")
            boot = clothing_tone(Image.open(foot_path).convert("RGBA"), shoes, upper)
            leg_name = SHOE_LEGS[name]
            leg = clothing_tone(Image.open(outfit_path / f"{leg_name}.png").convert("RGBA"), shoes)
            opening = BOOT_OPENINGS[style, body][name == "pie_izquierdo"]
            position, dressed_legs[leg_name] = dress_ankle(
                leg, rig["byId"][leg_name], boot, part, opening, (offset_x, offset_y)
            )
            image.alpha_composite(boot, position)
            continue
        elif name in dressed_legs:
            art, position = dressed_legs[name]
            image.alpha_composite(art, position)
            continue
        elif name in outfit:
            art = clothing_tone(Image.open(outfit_path / f"{name}.png").convert("RGBA"), pants)
        else:
            art = skin(native, palette)
        draw(image, art, center, size)

    head_art = Image.open(body_path / "cabeza.png").convert("RGBA")
    draw(image, fitted_scalp(head_art, id), head_center, head_size)
    face = Image.open(MODULAR / "faces" / f"male_{expression}_{tone}.png").convert("RGBA")
    draw(image, face, head_center, head_size)
    if id in BEARDS:
        column, x, y, w, h = BEARDS[id]
        half = beards.width // 2
        art = beards.crop((column * half, 0, (column + 1) * half, beards.height))
        art = art.crop(art.getchannel("A").point(lambda value: 255 if value > 24 else 0).getbbox())
        beard_shift = round(w * HAIR_SHIFT_LEFT)
        draw(image, art, (top[0] + x + w / 2 - beard_shift, top[1] + y + h / 2), (w, h))
    if id == "goro":
        # Continue the side hair down to the ear rim without moving the
        # nose-directed front lock or removing pixels from the source.
        side_hair = front_hair.copy()
        side_mask = Image.new("L", side_hair.size)
        ImageDraw.Draw(side_mask).polygon([
            (0, 44), (70, 44), (70, 103), (52, 127), (0, 127)
        ], fill=255)
        side_mask = side_mask.filter(ImageFilter.GaussianBlur(3))
        side_hair.putalpha(ImageChops.multiply(side_hair.getchannel("A"), side_mask))
        image.alpha_composite(side_hair, (hair_at[0], hair_at[1] + 8))
    image.alpha_composite(front_hair, hair_at)
    if id in ("goro", "ren"):
        # Follow the ear silhouette so its complete black outline stays
        # above the side hair without restoring a broad scalp-colored strip.
        ear = skin(head_art, palette)
        ear_mask = Image.new("L", ear.size)
        ImageDraw.Draw(ear_mask).polygon([
            (0, 110), (7, 105), (13, 103), (20, 105),
            (27, 109), (34, 118), (40, 137), (40, 159), (31, 165),
            (15, 165), (3, 154)
        ], fill=255)
        ear.putalpha(ImageChops.multiply(ear.getchannel("A"), ear_mask))
        draw(image, ear, head_center, head_size)

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
    if id == "daichi":
        # The three-quarter mustache and chin tuft are registered to his
        # nose and jaw after the fixed portrait scale is applied.
        with Image.open(OUTPUT / "source" / "daichi-facial-hair-v2.png") as facial_hair:
            art = facial_hair.convert("RGBA")
            # Fit the mustache between the nose and upper lip, with its
            # thicker center beneath the nose in this three-quarter view.
            fitted = Image.new("RGBA", art.size)
            fitted.alpha_composite(art.crop((0, 0, art.width, 16)).resize(
                (39, 10), Image.Resampling.LANCZOS), (9, 6))
            canvas.alpha_composite(fitted, DAICHI_FACIAL_HAIR_AT)
        # Extend the roots toward the lower lip while the tips stay on the
        # chin, keeping the mouth and jaw outline visible.
        with Image.open(OUTPUT / "source" / "daichi-chin-beard-v2.png") as chin_beard:
            art = chin_beard.convert("RGBA")
            canvas.alpha_composite(art.resize((art.width, 19), Image.Resampling.LANCZOS),
                                   DAICHI_CHIN_BEARD_AT)
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
