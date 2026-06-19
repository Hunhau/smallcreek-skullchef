#!/usr/bin/env python3
"""Add catalog.js entries for skin PNGs already on disk but missing from catalog."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from integrate_all_wave_skins import (  # noqa: E402
    CATALOG_PATH,
    SKINS_DIR,
    catalog_line,
    family_for,
    names_for,
    parse_catalog,
)

PREFIXES = ("pio", "ivan", "coco", "bunny", "bongo", "spoon", "chefhat")


def disk_skin_ids() -> set[str]:
    ids: set[str] = set()
    for p in SKINS_DIR.glob("*.png"):
        stem = p.stem
        if any(stem.startswith(pref + "_") for pref in PREFIXES):
            ids.add(stem)
    return ids


def wave_comment(skin_id: str) -> str:
    pref = skin_id.split("_", 1)[0]
    if pref == "chefhat":
        return f"    // ----- Gorro de Chef · Wave 3 · mirror {skin_id.split('_', 2)[-1]} -----"
    return f"    // ----- {pref.title()} · Wave 4 · extra -----"


def main() -> int:
    catalog_ids, meta = parse_catalog()
    missing = sorted(disk_skin_ids() - catalog_ids)
    if not missing:
        print("Nothing to add.")
        return 0

    lines: list[str] = [
        "",
        "    // ===== INTEGRATED — skins on disk missing from catalog =====",
    ]
    for sid in missing:
        rarity, name_en, name_es = names_for(sid, meta)
        family = family_for(sid)
        # Escape apostrophes in names
        name_en = name_en.replace("'", "\\'")
        name_es = name_es.replace("'", "\\'")
        lines.append(catalog_line(sid, rarity, family, name_en, name_es))
        meta[sid] = {"rarity": rarity, "family": family, "name_en": name_en, "name_es": name_es}

    text = CATALOG_PATH.read_text(encoding="utf-8")
    marker = "    // ===== CUCHARAS · Wave 1 ====="
    if marker not in text:
        marker = "  ];"
    block = "\n".join(lines) + "\n\n" + marker
    text = text.replace(marker, block, 1)
    CATALOG_PATH.write_text(text, encoding="utf-8")
    print(f"Added {len(missing)} catalog entries.")
    for sid in missing:
        print(f"  + {sid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
