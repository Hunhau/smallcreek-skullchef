#!/usr/bin/env python3
"""Audit skin PNG duplicates by MD5 hash and cross-helper same-slot copies.

Usage:
    python tools/audit_skin_duplicates.py
    python tools/audit_skin_duplicates.py --json report.json
    python tools/audit_skin_duplicates.py --check-catalog
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKINS_DIR = ROOT / "assets" / "skins"
CATALOG = ROOT / "assets" / "skins" / "catalog.js"
HELPERS = ("bongo", "coco", "pio", "ivan", "bunny")


def md5_file(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def collect_pngs() -> list[Path]:
    return sorted(p for p in SKINS_DIR.glob("*.png") if p.is_file())


def duplicate_groups(pngs: list[Path]) -> dict[str, list[str]]:
    by_hash: dict[str, list[str]] = defaultdict(list)
    for p in pngs:
        by_hash[md5_file(p)].append(str(p.relative_to(ROOT)).replace("\\", "/"))
    return {h: files for h, files in by_hash.items() if len(files) > 1}


def slot_suffix(name: str) -> str | None:
    m = re.match(r"^(bongo|coco|pio|ivan|bunny)_(.+)\.png$", name)
    return m.group(2) if m else None


def cross_helper_matches(pngs: list[Path], a: str, b: str) -> list[dict]:
    maps = {}
    for helper in (a, b):
        maps[helper] = {}
        for p in pngs:
            if not p.name.startswith(f"{helper}_"):
                continue
            slot = slot_suffix(p.name)
            if slot:
                maps[helper][slot] = p

    common = set(maps[a]) & set(maps[b])
    out = []
    for slot in sorted(common):
        pa, pb = maps[a][slot], maps[b][slot]
        ha, hb = md5_file(pa), md5_file(pb)
        if ha == hb:
            out.append(
                {
                    "slot": slot,
                    "md5": ha,
                    "a": str(pa.relative_to(ROOT)).replace("\\", "/"),
                    "b": str(pb.relative_to(ROOT)).replace("\\", "/"),
                }
            )
    return out


def active_catalog_lines(text: str) -> list[str]:
    """Return non-comment catalog entry lines (skip // commented stubs)."""
    return [
        line
        for line in text.splitlines()
        if re.search(r"^\s*\{\s*id:", line) and not re.match(r"^\s*//", line)
    ]


def check_catalog_paths() -> list[str]:
    if not CATALOG.exists():
        return []
    text = CATALOG.read_text(encoding="utf-8")
    active = "\n".join(active_catalog_lines(text))
    paths = re.findall(r"(?:img|thumb): '([^']+)'", active)
    return sorted({p for p in paths if not (ROOT / p).exists()})


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit skin PNG duplicates")
    parser.add_argument("--json", metavar="FILE", help="Write JSON report")
    parser.add_argument("--check-catalog", action="store_true", help="List missing catalog asset paths")
    args = parser.parse_args()

    pngs = collect_pngs()
    dups = duplicate_groups(pngs)
    bongo_coco = cross_helper_matches(pngs, "bongo", "coco")
    missing = check_catalog_paths() if args.check_catalog or True else []

    report = {
        "total_pngs": len(pngs),
        "unique_hashes": len(pngs) - sum(len(v) - 1 for v in dups.values()),
        "duplicate_groups": [{"md5": h, "files": files} for h, files in sorted(dups.items(), key=lambda x: -len(x[1]))],
        "bongo_vs_coco_identical": bongo_coco,
        "missing_catalog_paths": missing,
    }

    print("=== SKIN DUPLICATE AUDIT ===")
    print(f"PNGs scanned: {len(pngs)}")
    print(f"Duplicate groups: {len(dups)}")
    for group in report["duplicate_groups"]:
        print(f"\nMD5 {group['md5']}:")
        for f in group["files"]:
            print(f"  {f}")

    print("\n=== BONGO vs COCO (same slot, identical MD5) ===")
    if bongo_coco:
        for row in bongo_coco:
            print(f"  {row['slot']}: {row['a']} == {row['b']}")
    else:
        print("  (none)")
    print(f"Total: {len(bongo_coco)}")

    if missing:
        print(f"\n=== MISSING CATALOG PATHS ({len(missing)}) ===")
        for p in missing:
            print(f"  {p}")
    else:
        print("\n=== CATALOG PATHS: all present ===")

    if args.json:
        out = Path(args.json)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nWrote {out}")

    return 1 if dups or bongo_coco or missing else 0


if __name__ == "__main__":
    sys.exit(main())
