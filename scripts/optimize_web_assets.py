"""Optimize the web game's raster assets while preserving visual quality.

The presets intentionally keep source dimensions. This avoids softening artwork on
high-density displays; the size reduction comes from modern WebP encoding instead.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GROUPS = {
    "village": (ROOT / "assets/village", 88),
    "locations": (ROOT / "assets/locations", 86),
    "npcs": (ROOT / "assets/npcs", 88),
    "ui": (ROOT / "assets/ui", 90),
    "actions": (ROOT / "assets/actions", 90),
    "elements": (ROOT / "assets/elements", 90),
}


def composite_rgb(image: Image.Image, background: int) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = rgba[..., 3:4] / 255.0
    return rgba[..., :3] * alpha + background * (1.0 - alpha)


def psnr(reference: Image.Image, candidate: Image.Image) -> float:
    scores = []
    for background in (18, 128, 238):
        delta = composite_rgb(reference, background) - composite_rgb(candidate, background)
        mse = float(np.mean(delta * delta))
        scores.append(float("inf") if mse == 0 else 10 * math.log10(255 * 255 / mse))
    return min(scores)


def optimize(
    source: Path, destination: Path, quality: int, max_width: int | None = None
) -> tuple[int, int, float, int]:
    with Image.open(source) as original:
        original.load()
        encoded_source = original
        if max_width and original.width > max_width:
            height = round(original.height * max_width / original.width)
            encoded_source = original.resize((max_width, height), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        encoded_source.save(
            destination,
            "WEBP",
            quality=quality,
            method=4,
            alpha_quality=100,
            exact=True,
            exif=b"",
            xmp=b"",
            icc_profile=original.info.get("icc_profile", b""),
        )
        with Image.open(destination) as encoded:
            encoded.load()
            comparison = encoded.resize(original.size, Image.Resampling.LANCZOS)
            score = psnr(original, comparison)
            alpha_error = int(
                np.max(
                    np.abs(
                        np.asarray(original.convert("RGBA"), dtype=np.int16)[..., 3]
                        - np.asarray(comparison.convert("RGBA"), dtype=np.int16)[..., 3]
                    )
                )
            )
    return source.stat().st_size, destination.stat().st_size, score, alpha_error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--group", choices=GROUPS, action="append")
    parser.add_argument("--quality", type=int)
    parser.add_argument("--max-width", type=int)
    parser.add_argument("--file", type=Path, action="append")
    parser.add_argument(
        "--reencode-webp",
        action="store_true",
        help="Allow a one-time WebP-to-WebP optimization (not idempotent).",
    )
    args = parser.parse_args()
    selected = args.group or ["ui", "actions", "elements"]

    total_before = 0
    total_after = 0
    for group in selected:
        source_dir, quality = GROUPS[group]
        sources = [ROOT / item for item in args.file] if args.file else sorted(source_dir.rglob("*"))
        for source in sources:
            if args.file and not source.is_relative_to(source_dir):
                continue
            if source.suffix.lower() not in {".png", ".webp"}:
                continue
            if source.suffix.lower() == ".webp" and not args.reencode_webp:
                continue
            if group == "elements" and source.name.endswith("-sheet.png"):
                continue
            destination = args.output / source.relative_to(ROOT)
            destination = destination.with_suffix(".webp")
            before, after, score, alpha_error = optimize(
                source, destination, args.quality or quality, args.max_width
            )
            total_before += before
            total_after += after
            print(
                f"{source.relative_to(ROOT)}: {before / 1024:.1f} -> {after / 1024:.1f} KiB "
                f"({after / before:.1%}), PSNR {score:.2f} dB, alpha max delta {alpha_error}"
            , flush=True)
    print(f"TOTAL: {total_before / 1024:.1f} -> {total_after / 1024:.1f} KiB ({total_after / total_before:.1%})", flush=True)


if __name__ == "__main__":
    main()
