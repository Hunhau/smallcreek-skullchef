#!/usr/bin/env python3
"""Audit wave folders vs assets/skins vs catalog.js."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKINS = ROOT / "assets" / "skins"
CATALOG = SKINS / "catalog.js"

WAVE_ROOTS = [
    Path(r"D:\SmallCreek Originales HD\Wave1"),
    Path(r"D:\SmallCreek Originales HD\Wave2"),
    Path(r"D:\SmallCreek Originales HD\Wave3"),
    Path(r"D:\SmallCreek Originales HD\Wave3_transparente"),
    Path(r"C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets"),
]

SKIN_PREFIXES = (
    "pio_", "ivan_", "coco_", "bunny_", "bongo_",
    "spoon_", "chefhat_",
)
RARITIES = ("common", "uncommon", "rare", "epic", "legendary", "superleg")


def is_skin_stem(stem: str) -> bool:
    if not any(stem.startswith(p) for p in SKIN_PREFIXES):
        return False
    parts = stem.split("_", 2)
    return len(parts) >= 3 and parts[1] in RARITIES


def collect_stems(root: Path) -> set[str]:
    out: set[str] = set()
    if not root.exists():
        return out
    for f in root.rglob("*.png"):
        if f.name.endswith("_hi.png"):
            continue
        if is_skin_stem(f.stem):
            out.add(f.stem)
    return out


def catalog_ids() -> set[str]:
    text = CATALOG.read_text(encoding="utf-8")
    ids: set[str] = set()
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("//"):
            continue
        m = re.search(r"id:\s*'([^']+)'", line)
        if m:
            ids.add(m.group(1))
    return ids


def main() -> None:
    pngs = {f.stem for f in SKINS.glob("*.png")}
    cat = catalog_ids()
    wave_all: set[str] = set()
    print("=== WAVE FOLDER COUNTS ===")
    for w in WAVE_ROOTS:
        stems = collect_stems(w)
        wave_all |= stems
        print(f"  {w}: {len(stems)} skin PNGs")
    print()
    print(f"assets/skins PNGs: {len(pngs)}")
    print(f"catalog active:    {len(cat)}")
    print(f"wave unique stems: {len(wave_all)}")
    print()
    w_not_assets = sorted(wave_all - pngs)
    png_not_cat = sorted(pngs - cat)
    cat_not_png = sorted(cat - pngs)
    assets_not_wave = sorted(pngs - wave_all)
    print(f"in waves, NOT in assets/skins: {len(w_not_assets)}")
    print(f"in assets/skins, NOT in catalog: {len(png_not_cat)}")
    print(f"in catalog, NOT in assets/skins: {len(cat_not_png)}")
    print(f"in assets/skins, NOT in any wave: {len(assets_not_wave)}")
    if w_not_assets:
        print("\n--- waves missing from assets (first 50) ---")
        for s in w_not_assets[:50]:
            print(f"  {s}")
    if png_not_cat:
        print("\n--- PNGs missing from catalog (first 50) ---")
        for s in png_not_cat[:50]:
            print(f"  {s}")
    if cat_not_png:
        print("\n--- catalog missing PNG (first 30) ---")
        for s in cat_not_png[:30]:
            print(f"  {s}")


if __name__ == "__main__":
    main()
