"""Encode approved transparent cutouts and the village map for the web game.

Only trims empty alpha, fits without stretching and encodes WebP. Background
extraction is performed separately; this script never regenerates the artwork.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]


def prepare_cutout(source: Path, destination: Path, size: tuple[int, int], padding: int) -> dict:
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGBA")
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] != 0 or not alpha.getbbox():
            raise ValueError(f"{source} must contain real transparency and visible artwork")
        # Ignore negligible alpha noise when determining the useful bounds.
        bounds = alpha.point(lambda value: 255 if value > 4 else 0).getbbox()
        image = image.crop(bounds)
        fitted = ImageOps.contain(image, (size[0] - padding * 2, size[1] - padding * 2), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", size)
        canvas.alpha_composite(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, "WEBP", quality=90, method=6, alpha_quality=100, exact=True, exif=b"", xmp=b"")
        with Image.open(destination) as encoded:
            assert encoded.getchannel("A").tobytes() == canvas.getchannel("A").tobytes(), "WebP must preserve the alpha mask"
        return {"source": str(source), "output": str(destination.relative_to(ROOT)), "dimensions": size,
                "bytes": destination.stat().st_size, "alpha": True}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("strike", "guard", "dog", "puppet", "village"):
        parser.add_argument(f"--{name}", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    assets = [
        prepare_cutout(args.strike, ROOT / "assets/actions/basic-strike.webp", (512, 512), 10),
        prepare_cutout(args.guard, ROOT / "assets/actions/guard.webp", (512, 512), 10),
        prepare_cutout(args.dog, ROOT / "assets/vfx/teleport-dog.webp", (460, 520), 6),
        prepare_cutout(args.puppet, ROOT / "assets/vfx/teleport-puppet.webp", (800, 220), 8),
    ]
    destination = ROOT / "assets/village/aldea.webp"
    with Image.open(args.village) as source:
        # Keep the coordinate system used by the nine interactive buildings.
        image = ImageOps.exif_transpose(source).convert("RGB").resize((1678, 937), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=88, method=6, exif=b"", xmp=b"")
    assets.append({"source": str(args.village), "output": str(destination.relative_to(ROOT)),
                   "dimensions": [1678, 937], "bytes": destination.stat().st_size, "alpha": False})
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"assets": assets, "total_bytes": sum(asset["bytes"] for asset in assets)}, indent=2) + "\n", encoding="utf-8")
    print(args.report.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
