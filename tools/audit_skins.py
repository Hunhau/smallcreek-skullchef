#!/usr/bin/env python3
"""Audit skin files vs catalog.js"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
skins_dir = ROOT / "assets" / "skins"
catalog_path = skins_dir / "catalog.js"

text = catalog_path.read_text(encoding="utf-8")
catalog_ids = set()
catalog_imgs = {}
for line in text.splitlines():
    if line.strip().startswith("//"):
        continue
    m = re.search(r"id: '([^']+)'", line)
    if m:
        catalog_ids.add(m.group(1))
        im = re.search(r"img: '([^']+)'", line)
        if im:
            catalog_imgs[m.group(1)] = im.group(1)

prefixes = ["pio", "ivan", "coco", "bunny", "bongo", "spoon", "chefhat"]
families = defaultdict(lambda: {"ids": set(), "png": 0, "webp": 0})

def is_skin_file(p: Path) -> bool:
    parts = p.parts
    if "thumbs" in parts or "originals" in parts:
        return False
    name = p.stem
    return any(name.startswith(pref + "_") for pref in prefixes)

disk_ids = {}
for p in skins_dir.rglob("*"):
    if not p.is_file() or not is_skin_file(p):
        continue
    sid = p.stem
    ext = p.suffix.lower()
    pref = sid.split("_")[0]
    families[pref]["ids"].add(sid)
    if ext in (".png", ".webp"):
        families[pref][ext.replace(".", "")] += 1
    if sid not in disk_ids or ext == ".png":
        disk_ids[sid] = str(p.relative_to(ROOT)).replace("\\", "/")

disk_id_set = set(disk_ids.keys())
missing_in_catalog = sorted(disk_id_set - catalog_ids)
missing_on_disk = sorted(catalog_ids - disk_id_set)
missing_files = []
for cid in sorted(catalog_ids):
    img = catalog_imgs.get(cid, f"assets/skins/{cid}.png")
    p = ROOT / img
    alt = ROOT / img.replace(".png", ".webp")
    if not p.exists() and not alt.exists() and cid not in disk_ids:
        missing_files.append(cid)

print("=== SUMMARY ===")
print(f"Catalog active entries: {len(catalog_ids)}")
print(f"Unique skin IDs on disk (root): {len(disk_id_set)}")
print(f"Missing in catalog: {len(missing_in_catalog)}")
print(f"In catalog but no file: {len(missing_on_disk)}")
print(f"Catalog entries with missing img file: {len(missing_files)}")
print()
print("=== BY FAMILY (disk unique IDs) ===")
for pref in sorted(families.keys()):
    ids = families[pref]["ids"]
    in_cat = sum(1 for i in ids if i in catalog_ids)
    print(f"  {pref}: disk={len(ids)}, in_catalog={in_cat}, gap={len(ids)-in_cat}")
print()
if missing_in_catalog:
    print("=== ALL MISSING IN CATALOG ===")
    for i in missing_in_catalog:
        print(f"  {i}")
print()
if missing_on_disk:
    print("=== IN CATALOG BUT NO FILE ===")
    for i in missing_on_disk:
        print(f"  {i}")
print()
if missing_files:
    print("=== CATALOG IMG PATH MISSING ===")
    for i in missing_files:
        print(f"  {i} -> {catalog_imgs.get(i)}")
