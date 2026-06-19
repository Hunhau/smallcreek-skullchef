#!/usr/bin/env python3
"""
Generate WebP full + thumb assets from PNG skins for SmallCreek Skullchef.

Usage (from repo root):
  python tools/generate_skin_webp.py
  python tools/generate_skin_webp.py --report
  python tools/generate_skin_webp.py path/to/new_skin.png

Outputs:
  assets/skins/{id}.webp          — full, max 768×512, quality ~90, alpha preserved
  assets/skins/thumbs/{id}.webp   — 128×128 thumb, quality ~85

PNG sources are kept as fallbacks; catalog img stays .png (loader prefers .webp).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
SKINS_DIR = ROOT / "assets" / "skins"
THUMBS_DIR = SKINS_DIR / "thumbs"
CATALOG = SKINS_DIR / "catalog.js"
FULL_MAX = (768, 512)
THUMB_SIZE = (128, 128)
FULL_QUALITY = 90
THUMB_QUALITY = 85


def resize_contain(img: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    out = img.copy()
    out.thumbnail(max_size, Image.Resampling.LANCZOS)
    return out


def process_png(png_path: Path) -> tuple[int, int, int]:
    img = Image.open(png_path).convert("RGBA")
    stem = png_path.stem

    full = resize_contain(img, FULL_MAX)
    webp_full = SKINS_DIR / f"{stem}.webp"
    full.save(webp_full, "WEBP", quality=FULL_QUALITY, method=6, lossless=False)

    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
    thumb = resize_contain(img, THUMB_SIZE)
    webp_thumb = THUMBS_DIR / f"{stem}.webp"
    thumb.save(webp_thumb, "WEBP", quality=THUMB_QUALITY, method=6, lossless=False)

    return png_path.stat().st_size, webp_full.stat().st_size, webp_thumb.stat().st_size


def fmt_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KiB"
    return f"{n / (1024 * 1024):.2f} MiB"


def update_catalog_thumbs() -> int:
    """Add optional thumb field to catalog entries missing it."""
    if not CATALOG.exists():
        return 0
    text = CATALOG.read_text(encoding="utf-8")
    updated = 0

    def add_thumb(match: re.Match) -> str:
        nonlocal updated
        block = match.group(0)
        if "thumb:" in block:
            return block
        id_m = re.search(r"id:\s*'([^']+)'", block)
        if not id_m:
            return block
        sid = id_m.group(1)
        thumb = f"assets/skins/thumbs/{sid}.webp"
        # Insert thumb after img field
        new_block = re.sub(
            r"(img:\s*'[^']+',)",
            rf"\1 thumb: '{thumb}',",
            block,
            count=1,
        )
        if new_block != block:
            updated += 1
        return new_block

    new_text = re.sub(
        r"\{[^{}]*family:\s*'(?:helper|spoon|chefhat)'[^{}]*\}",
        add_thumb,
        text,
    )
    if updated:
        CATALOG.write_text(new_text, encoding="utf-8")
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate WebP skin assets")
    parser.add_argument("pngs", nargs="*", help="Specific PNG files (default: all in assets/skins/)")
    parser.add_argument("--report", action="store_true", help="Print size summary only")
    parser.add_argument("--update-catalog", action="store_true", help="Add thumb paths to catalog.js")
    args = parser.parse_args()

    if args.pngs:
        png_files = [Path(p) for p in args.pngs]
    else:
        png_files = sorted(SKINS_DIR.glob("*.png"))

    if not png_files:
        print("No PNG skins found.", file=sys.stderr)
        return 1

    total_png = total_full = total_thumb = 0
    count = 0

    for png in png_files:
        if not png.exists():
            print(f"Skip missing: {png}", file=sys.stderr)
            continue
        if png.parent.name == "originals":
            continue
        png_b, full_b, thumb_b = process_png(png)
        total_png += png_b
        total_full += full_b
        total_thumb += thumb_b
        count += 1
        if not args.report:
            print(f"  {png.name} -> {png.stem}.webp + thumbs/{png.stem}.webp")

    if args.update_catalog:
        n = update_catalog_thumbs()
        print(f"Catalog: added thumb field to {n} entries.")

    print()
    print(f"Processed: {count} skins")
    print(f"  PNG total:   {fmt_bytes(total_png)}")
    print(f"  WebP full:   {fmt_bytes(total_full)}  ({100 * total_full / max(total_png, 1):.1f}% of PNG)")
    print(f"  WebP thumbs: {fmt_bytes(total_thumb)}")
    print(f"  Combined WebP: {fmt_bytes(total_full + total_thumb)}  ({100 * (total_full + total_thumb) / max(total_png, 1):.1f}% of PNG)")
    if total_png:
        saved = total_png - (total_full + total_thumb)
        print(f"  Est. savings vs PNG-only grid+full: {fmt_bytes(saved)} ({100 * saved / total_png:.1f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
