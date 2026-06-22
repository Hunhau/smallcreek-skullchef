#!/usr/bin/env python3
"""Copy approved Wave7 transparente pack into assets/skins + webp + catalog.

Requires creator OK before running (see tools/WAVE7_CARPETAS.md).

Usage:
  python tools/integrate_wave7_pack_assets.py desert_dunes
  python tools/integrate_wave7_pack_assets.py desert_dunes --drop-live
  python tools/build_atlas_manifest.py
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "tools" / "wave7_realm_ruckus.json"
TRANSPARENT = Path(r"D:\SmallCreek Originales HD\Wave7_transparente")
CATALOG = ROOT / "assets" / "skins" / "catalog.js"
WAVE7_MARKER = "    // === WAVE 7 — Realm Ruckus"
ARRAY_CLOSE = "\n  ];"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def catalog_line(it: dict, *, drop_live: bool) -> str:
    drop = "true" if drop_live else "false"
    return (
        f"    {{ id: '{esc(it['id'])}', rarity: '{it['rarity']}', family: '{it['family']}', "
        f"img: '{esc(it['img'])}', thumb: '{esc(it['thumb'])}', "
        f"name_en: '{esc(it['name_en'])}', name_es: '{esc(it['name_es'])}', dropLive: {drop} }},"
    )


def integrate_catalog(pack: str, *, drop_live: bool) -> int:
    if not CATALOG.exists():
        print(f"Missing {CATALOG}")
        return 1
    items = [it for it in json.loads(JSON_PATH.read_text(encoding="utf-8")) if it.get("pack") == pack]
    if not items:
        print(f"No manifest entries for pack {pack}")
        return 1
    text = CATALOG.read_text(encoding="utf-8")
    for it in items:
        if f"id: '{it['id']}'" in text:
            print(f"SKIP catalog already has {it['id']}")
            continue
    block = f"\n    // --- {pack.replace('_', ' ').title()} (Wave 7) ---\n"
    block += "\n".join(catalog_line(it, drop_live=drop_live) for it in items) + "\n"
    if WAVE7_MARKER in text:
        text = text.replace(WAVE7_MARKER, WAVE7_MARKER + block, 1)
    elif ARRAY_CLOSE in text:
        text = text.replace(ARRAY_CLOSE, f"\n{WAVE7_MARKER}{block}{ARRAY_CLOSE.lstrip()}", 1)
    else:
        print("ERROR: cannot find catalog array close or Wave 7 marker")
        return 1
    CATALOG.write_text(text, encoding="utf-8")
    print(f"Catalog: appended {len(items)} entries for {pack} (dropLive={drop_live})")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pack")
    ap.add_argument(
        "--drop-live",
        action="store_true",
        help="Enable drops for normal players (default: creator-only staging)",
    )
    ap.add_argument("--catalog-only", action="store_true")
    args = ap.parse_args()
    pack = args.pack
    src_dir = TRANSPARENT / pack
    if not src_dir.is_dir():
        print(f"Missing {src_dir}")
        return 1

    items = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    ids = {it["id"] for it in items if it.get("pack") == pack}
    pngs = sorted(src_dir.glob("*.png"))
    if len(pngs) != 40:
        print(f"WARN: expected 40 PNG, found {len(pngs)}")

    if args.catalog_only:
        return integrate_catalog(pack, drop_live=args.drop_live)

    ok = fail = 0
    for png in pngs:
        if png.stem not in ids:
            print(f"SKIP unknown stem {png.stem}")
            continue
        r = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools" / "process_wave7_skin.py"),
                "--from-transparente",
                f"{pack}/{png.name}",
            ],
            cwd=str(ROOT),
        )
        ok += int(r.returncode == 0)
        fail += int(r.returncode != 0)

    for png in pngs:
        if png.stem not in ids:
            continue
        dst = ROOT / "assets" / "skins" / png.name
        if dst.exists():
            subprocess.run(
                [sys.executable, str(ROOT / "tools" / "generate_skin_webp.py"), str(dst)],
                cwd=str(ROOT),
            )

    cat_rc = integrate_catalog(pack, drop_live=args.drop_live)
    print(f"\nAssets: {ok} ok, {fail} fail | catalog exit {cat_rc}")
    return 0 if fail == 0 and cat_rc == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
