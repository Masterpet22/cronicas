"""Assemble the map cast from the player's articulated parts and NPC costume sheets."""

import json
import subprocess
from pathlib import Path
from io import BytesIO

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MODULAR = ROOT / "assets" / "modular"
OUTPUT = MODULAR / "representatives"
ARM_COLUMNS = {
    "brazo_izquierdo": 1, "brazo_derecho": 2,
    "antebrazo_izquierdo": 3, "antebrazo_derecho": 4
}
BEARDS = {"daichi": (0, 94, 151, 75, 68), "iori": (1, 57, 136, 112, 96)}

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


def mix_forearm_skin(image, palette, id):
    pixels = image.load()
    for y in range(round(image.height * .58)):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a and max(r, g, b) - min(r, g, b) < 22 and min(r, g, b) > 72:
                tint = palette[round(r * .2126 + g * .7152 + b * .0722)]
                if id == "kureha":
                    tint = tuple(round(value * .23) for value in tint)
                elif id == "yuna":
                    tint = tuple(round(value * weight) for value, weight in zip(tint, (.4, .59, .44)))
                pixels[x, y] = (*tint, a)
    return image


def draw(image, piece, center, size):
    w, h = (round(value) for value in size)
    image.alpha_composite(piece.resize((w, h), Image.Resampling.LANCZOS), (
        round(center[0] - w / 2), round(center[1] - h / 2)
    ))


def assemble(sheet, row, profile, rigs, palettes, beards):
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
        if name == "torso":
            art = extract(sheet, 0, row, id)
        elif name in ARM_COLUMNS and not (bare and name.startswith("brazo")):
            art = extract(sheet, ARM_COLUMNS[name], row, id)
            if id in ("hana", "yuna", "kureha", "goro") and name.startswith("antebrazo"):
                art = mix_forearm_skin(art, palette, id)
            if id in ("yuna", "kureha") and name.startswith("brazo"):
                colors = ("#253629", "#707750") if id == "yuna" else ("#241c2d", "#59475d")
                art = clothing_tone(art, *colors)
        elif name in outfit:
            art = clothing_tone(Image.open(outfit_path / f"{name}.png").convert("RGBA"), shoes if name.startswith(("pie_", "pierna_")) else pants)
        else:
            art = skin(Image.open(body_path / f"{name}.png").convert("RGBA"), palette)
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

    # Keep the same head-to-ground proportions. Leave safe transparent margins.
    bounds = image.getbbox()
    figure = image.crop(bounds)
    figure.thumbnail((444, 765), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (480, 800))
    canvas.alpha_composite(figure, ((480 - figure.width) // 2, 783 - figure.height))
    encoded = BytesIO()
    canvas.save(encoded, format="WEBP", quality=91, method=6)
    temporary = OUTPUT / f"{id}.webp.tmp"
    temporary.write_bytes(encoded.getvalue())
    temporary.replace(OUTPUT / f"{id}.webp")


def main():
    data = rig_data()
    with Image.open(OUTPUT / "source" / "barbas.png") as source:
        beards = source.convert("RGBA")
    for name, profiles in CAST.items():
        with Image.open(OUTPUT / "source" / f"{name}.png") as source:
            sheet = source.convert("RGBA")
        for row, profile in enumerate(profiles):
            assemble(sheet, row, profile, data["rigs"], data["palettes"], beards)


if __name__ == "__main__":
    main()
