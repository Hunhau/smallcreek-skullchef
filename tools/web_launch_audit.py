#!/usr/bin/env python3
"""Pre-launch web audit for Skullchef GitHub Pages."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WWW = ROOT / "www"
SKINS = ROOT / "assets" / "skins"
THUMBS = SKINS / "thumbs"
CATALOG = SKINS / "catalog.js"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def catalog_ids(text: str) -> list[str]:
    out = []
    for line in text.splitlines():
        if line.strip().startswith("//"):
            continue
        for m in re.finditer(r"id:\s*'([^']+)'", line):
            out.append(m.group(1))
    return out


def main() -> int:
    issues: list[str] = []
    warns: list[str] = []
    ok: list[str] = []

    # --- Build parity ---
    idx = read(ROOT / "index.html")
    www_idx = read(WWW / "index.html") if (WWW / "index.html").exists() else ""
    ver = json.loads(read(ROOT / "version.json"))
    build_v = re.search(r'BUILD_V = "(build-\d+)"', idx)
    sw_v = re.search(r"CACHE_VERSION = '(build-\d+)'", read(ROOT / "sw.js"))

    if not build_v:
        issues.append("BUILD_V missing in index.html")
    elif build_v.group(1) != ver["v"]:
        issues.append(f"BUILD_V ({build_v.group(1)}) != version.json ({ver['v']})")
    else:
        ok.append(f"Build version aligned: {ver['v']}")

    if sw_v and sw_v.group(1) != ver["v"]:
        warns.append(f"sw.js CACHE ({sw_v.group(1)}) != version.json ({ver['v']}) — stale shell cache possible")

    if not (WWW / "index.html").exists():
        issues.append("www/index.html missing — run sync-www")
    elif idx != www_idx:
        warns.append("index.html differs from www/index.html — re-sync www/")

    cat_text = read(CATALOG)
    www_cat = read(WWW / "assets" / "skins" / "catalog.js") if (WWW / "assets" / "skins" / "catalog.js").exists() else ""
    if cat_text != www_cat:
        warns.append("catalog.js differs from www/ — re-sync www/")

    ids = catalog_ids(cat_text)
    ok.append(f"Catalog entries: {len(ids)}")

    missing_png = [i for i in ids if not (SKINS / f"{i}.png").exists()]
    missing_webp = [i for i in ids if not (THUMBS / f"{i}.webp").exists()]
    if missing_png:
        issues.append(f"{len(missing_png)} catalog skins missing PNG: {missing_png[:8]}...")
    else:
        ok.append("All catalog PNGs present")

    if missing_webp:
        issues.append(f"{len(missing_webp)} catalog skins missing webp thumb: {missing_webp[:8]}...")
    else:
        ok.append("All catalog webp thumbs present")

    # Duplicate ids
    seen: dict[str, int] = {}
    for i in ids:
        seen[i] = seen.get(i, 0) + 1
    dups = [k for k, v in seen.items() if v > 1]
    if dups:
        issues.append(f"Duplicate catalog ids: {dups}")

    # Rarity tiers
    rarities = re.findall(r"rarity:\s*'([^']+)'", cat_text)
    from collections import Counter
    rc = Counter(rarities)
    ok.append(f"Rarity breakdown: {dict(rc)}")

    anomaly = [i for i in ids if "_anomaly_" in i or "anomaly" in i]
    wave5_active = [i for i in ids if any(x in i for x in ("clownwig", "wigchaos", "anomaly"))]
    ok.append(f"Wave5+anomaly active sample: {len([i for i in ids if 'clownwig' in i or 'wigchaos' in i or '_anomaly_' in i])} entries")

    # Owner gate sanity
    if "scIsOwnerDevice" not in idx:
        issues.append("Owner device gate (scIsOwnerDevice) missing")
    else:
        ok.append("Owner-only catalog unlock gate present")

    if "scGrantOwnerCatalog" not in idx:
        issues.append("scGrantOwnerCatalog missing")
    if "grantAllCharms()" in idx and "function scGrantOwnerCatalog" in idx:
        ok.append("Owner auto-grant wired")

    # PRODUCTION_BUILD + creator gesture
    if "PRODUCTION_BUILD = true" in idx:
        ok.append("PRODUCTION_BUILD=true (store-safe)")
    if "throw new Error('prod')" in idx and "scIsOwnerDevice" in idx:
        warns.append("Old PRODUCTION_BUILD gesture block comment may be stale — verify gesture works")

    # Critical assets
    critical = [
        "assets/img/chef.png",
        "assets/img/pio.png",
        "assets/img/coco.png",
        "assets/img/bunny.png",
        "assets/img/ivan.png",
        "assets/img/bongo.png",
        "audio/stir1.mp3",
        "audio/bubble.mp3",
        "manifest.webmanifest",
        "privacy.html",
    ]
    for rel in critical:
        if not (ROOT / rel).exists():
            issues.append(f"Missing critical asset: {rel}")
        elif (WWW / rel).exists() is False and (WWW / rel.parent.name).exists():
            warns.append(f"Critical asset not in www/: {rel}")

    # Audio in www
    for mp3 in ["stir1.mp3", "stir2.mp3", "bubble.mp3", "buy.mp3", "prestige.mp3", "victory.mp3"]:
        if not (WWW / "audio" / mp3).exists() and (ROOT / "audio" / mp3).exists():
            warns.append(f"audio/{mp3} in root but not www/")

    # CREATOR links
    if "smallcreekskullchefasmr" not in idx:
        warns.append("YouTube creator link may be missing")
    if "smallcreek_skullchefog" not in idx:
        warns.append("TikTok creator link may be missing")

    # Drop weights
    if "anomaly', weight: 0.04" not in idx.replace(" ", ""):
        warns.append("Anomaly drop weight not found in RARITIES")

    # i18n keys for collection
    for key in ["coll_locked", "coll_section_anomaly", "r_anomaly"]:
        if f"'{key}'" not in idx and f'"{key}"' not in idx:
            warns.append(f"i18n key may be missing: {key}")

    # Report
    print("=" * 60)
    print("SKULLCHEF WEB LAUNCH AUDIT")
    print("=" * 60)
    print("\nOK:")
    for x in ok:
        print(f"  [OK] {x}")
    if warns:
        print("\nWARNINGS:")
        for x in warns:
            print(f"  [WARN] {x}")
    if issues:
        print("\nISSUES (fix before share):")
        for x in issues:
            print(f"  [FAIL] {x}")
    else:
        print("\nNo blocking issues found in static audit.")
    print(f"\nTotal: {len(ok)} ok, {len(warns)} warn, {len(issues)} fail")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
