"""Pack the existing combat body parts without changing their pixels or rig."""

import json
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "modular"
PADDING = 2


def combat_sources():
    source = """
import { CHARACTER_RIGS } from "./src/character-rigs.js";
import { isBaseOutfitPart, baseOutfitAsset } from "./src/base-outfit.js";
console.log(JSON.stringify(Object.entries(CHARACTER_RIGS).map(([body, rig]) => {
  const folder = body === "female" ? "woman" : "man";
  return [body, Object.fromEntries(rig.layers.map(({ id, assetId = id }) => [id,
    isBaseOutfitPart(id) ? baseOutfitAsset(body, id).split("?")[0] :
      `assets/modular/${folder}_sprites/runtime/${assetId}.png`
  ]))];
})));
"""
    output = subprocess.check_output(["node", "--input-type=module", "-e", source], cwd=ROOT)
    return json.loads(output)


def place_rows(parts, width):
    frames = {}
    x = y = row_height = 0
    for name, part in parts:
        w, h = part.size
        cell_width, cell_height = w + 2 * PADDING, h + 2 * PADDING
        if x + cell_width > width:
            y += row_height
            x = row_height = 0
        frames[name] = {"x": x + PADDING, "y": y + PADDING, "w": w, "h": h}
        x += cell_width
        row_height = max(row_height, cell_height)
    return (width, y + row_height), frames


def paste_with_padding(sheet, part, x, y):
    w, h = part.size
    # Extend the edge texels so linear sampling never reaches another part.
    columns = [(0, 1, -PADDING, PADDING), (0, w, 0, w), (w - 1, w, w, PADDING)]
    rows = [(0, 1, -PADDING, PADDING), (0, h, 0, h), (h - 1, h, h, PADDING)]
    for left, right, dx, width in columns:
        for top, bottom, dy, height in rows:
            region = part.crop((left, top, right, bottom))
            if region.size != (width, height):
                region = region.resize((width, height), Image.Resampling.NEAREST)
            sheet.paste(region, (x + dx, y + dy))


def main():
    directory = ASSETS / "atlases"
    directory.mkdir(exist_ok=True)
    for body, files in combat_sources():
        parts = []
        for name, filename in files.items():
            with Image.open(ROOT / filename) as image:
                parts.append((name, image.convert("RGBA")))
        parts.sort(key=lambda entry: (-entry[1].height, entry[0]))
        size, frames = min(
            (place_rows(parts, width) for width in (768, 896, 1024)),
            key=lambda layout: layout[0][0] * layout[0][1],
        )
        sheet = Image.new("RGBA", size)
        for name, part in parts:
            paste_with_padding(sheet, part, frames[name]["x"], frames[name]["y"])
        sheet.save(directory / f"{body}.png", optimize=True)
        metadata = {
            "frames": {name: {"frame": frame, "rotated": False, "trimmed": False}
                       for name, frame in frames.items()},
            "meta": {"size": dict(zip(("w", "h"), size)), "padding": PADDING},
        }
        (directory / f"{body}.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
