#!/usr/bin/env python3
"""Integrate all wave-folder skin PNGs into assets/skins + catalog.js."""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKINS_DIR = ROOT / "assets" / "skins"
CATALOG_PATH = SKINS_DIR / "catalog.js"
TARGET = (768, 512)

# Search order: transparent Wave3 first, then other waves, then cursor staging.
SOURCE_ROOTS = [
    Path(r"D:\SmallCreek Originales HD\Wave3_transparente"),
    Path(r"D:\SmallCreek Originales HD\Wave3"),
    Path(r"D:\SmallCreek Originales HD\Wave2"),
    Path(r"D:\SmallCreek Originales HD\Wave1"),
    Path(r"C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets"),
]

HELPERS = ("pio", "ivan", "coco", "bunny", "bongo")
FAMILIES = {
    "pio": "helper", "ivan": "helper", "coco": "helper", "bunny": "helper", "bongo": "helper",
    "spoon": "spoon", "chefhat": "chefhat",
}
HELPER_LABEL = {
    "pio": "Pío", "ivan": "Ivan", "coco": "Coco", "bunny": "Bunny", "bongo": "Bongo",
}
RARITIES = ("common", "uncommon", "rare", "epic", "legendary", "superleg")
SKIN_PREFIXES = tuple(FAMILIES.keys())

# Reuse theme display names from wave3 integrator.
sys.path.insert(0, str(ROOT / "tools"))
try:
    from _integrate_wave_skins import THEME_NAMES  # type: ignore
except Exception:
    THEME_NAMES = {}


def is_skin_stem(stem: str) -> bool:
    if not any(stem.startswith(p + "_") for p in SKIN_PREFIXES):
        return False
    parts = stem.split("_", 2)
    return len(parts) >= 3 and parts[1] in RARITIES


def parse_catalog() -> tuple[set[str], dict[str, dict]]:
    text = CATALOG_PATH.read_text(encoding="utf-8")
    ids: set[str] = set()
    meta: dict[str, dict] = {}
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("//"):
            continue
        m_id = re.search(r"id:\s*'([^']+)'", line)
        if not m_id:
            continue
        sid = m_id.group(1)
        ids.add(sid)
        meta[sid] = {
            "rarity": (re.search(r"rarity:\s*'([^']+)'", line) or [None, "common"])[1],
            "family": (re.search(r"family:\s*'([^']+)'", line) or [None, "helper"])[1],
            "name_en": (re.search(r"name_en:\s*'([^']+)'", line) or [None, ""])[1],
            "name_es": (re.search(r"name_es:\s*'([^']+)'", line) or [None, ""])[1],
        }
    return ids, meta


def slug_from_id(skin_id: str) -> str:
    parts = skin_id.split("_", 2)
    return parts[2] if len(parts) >= 3 else skin_id


def helper_from_id(skin_id: str) -> str:
    return skin_id.split("_", 1)[0]


def find_source(stem: str) -> Path | None:
    """Return the best PNG source for *stem* (Wave3_transparente first)."""
    for root in SOURCE_ROOTS:
        if not root.exists():
            continue
        for f in root.rglob(f"{stem}.png"):
            if f.name.endswith("_hi.png"):
                continue
            return f
    return None


def has_opaque_white_bg(img: Image.Image) -> bool:
    """True when the image border is mostly opaque white (bad integration source)."""
    w, h = img.size
    px = img.load()
    border: list[tuple[int, int, int, int]] = []
    for x in range(w):
        border.append(px[x, 0])
        border.append(px[x, h - 1])
    for y in range(1, h - 1):
        border.append(px[0, y])
        border.append(px[w - 1, y])
    if not border:
        return False
    white = sum(1 for p in border if p[3] > 200 and p[0] > 235 and p[1] > 235 and p[2] > 235)
    transparent = sum(1 for p in border if p[3] < 16)
    white_pct = white / len(border) * 100
    trans_pct = transparent / len(border) * 100
    return white_pct > 50 or (trans_pct < 20 and white_pct > 20)


def rembg_image(img: Image.Image) -> Image.Image:
    from rembg import remove

    return remove(img.convert("RGBA"))


def fit_rgba_canvas(img: Image.Image) -> Image.Image:
    if img.size == TARGET:
        return img
    img = img.copy()
    img.thumbnail(TARGET, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
    x = (TARGET[0] - img.width) // 2
    y = (TARGET[1] - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas


def prepare_skin_png(src: Path, dst: Path, *, force_rembg: bool = False) -> bool:
    """Copy *src* to *dst* at 768×512, preferring real alpha (rembg when needed)."""
    img = Image.open(src).convert("RGBA")
    used_rembg = False
    if force_rembg or has_opaque_white_bg(img):
        img = rembg_image(img)
        used_rembg = True
    img = fit_rgba_canvas(img)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG", optimize=True)
    return used_rembg


def ensure_rgba_768x512(src: Path, dst: Path) -> None:
    prepare_skin_png(src, dst)


def title_slug(slug: str) -> str:
    return slug.replace("_", " ").title()


def names_for(skin_id: str, existing: dict[str, dict]) -> tuple[str, str, str]:
    pref = helper_from_id(skin_id)
    slug = slug_from_id(skin_id)
    rarity = skin_id.split("_", 2)[1]

    # Mirror helper entry with same slug (chefhat/spoon wave3 variants).
    for helper in HELPERS:
        ref_id = f"{helper}_{rarity}_{slug}"
        if ref_id in existing and existing[ref_id]["name_en"]:
            ref_en = existing[ref_id]["name_en"]
            ref_es = existing[ref_id]["name_es"]
            suffix_en = ref_en.split(" · ", 1)[-1] if " · " in ref_en else ref_en
            suffix_es = ref_es.split(" · ", 1)[-1] if " · " in ref_es else ref_es
            if pref == "spoon":
                return rarity, suffix_en, suffix_es
            if pref == "chefhat":
                return rarity, f"{suffix_en} Chef Hat", f"Gorro {suffix_es}"
            label = HELPER_LABEL.get(pref, pref.title())
            return rarity, f"{label} · {suffix_en}", f"{label} · {suffix_es}"

    # Theme map fallback (wave3 helpers).
    for theme_map in THEME_NAMES.values():
        if slug in theme_map:
            en, es = theme_map[slug]
            if pref == "spoon":
                return rarity, en, es
            if pref == "chefhat":
                return rarity, f"{en} Chef Hat", f"Gorro {es}"
            label = HELPER_LABEL.get(pref, pref.title())
            return rarity, f"{label} · {en}", f"{label} · {es}"

    label = title_slug(slug)
    if pref == "spoon":
        return rarity, label, label
    if pref == "chefhat":
        return rarity, f"{label} Chef Hat", f"Gorro {label}"
    hlabel = HELPER_LABEL.get(pref, pref.title())
    return rarity, f"{hlabel} · {label}", f"{hlabel} · {label}"


def family_for(skin_id: str) -> str:
    return FAMILIES.get(helper_from_id(skin_id), "helper")


def catalog_line(skin_id: str, rarity: str, family: str, name_en: str, name_es: str) -> str:
    return (
        f"    {{ id: '{skin_id}', rarity: '{rarity}', family: '{family}', "
        f"img: 'assets/skins/{skin_id}.png', thumb: 'assets/skins/thumbs/{skin_id}.webp', "
        f"name_en: '{name_en}', name_es: '{name_es}' }},"
    )


def wave_tag(stem: str, src: Path) -> str:
    parts = [p.lower() for p in src.parts]
    if "wave3_transparente" in parts:
        for theme in ("aliens", "fastfood", "mixed", "superheroes"):
            if theme in parts:
                return f"Wave 3 · {theme.title()}"
        return "Wave 3"
    if "wave3" in parts:
        return "Wave 3"
    if "wave2" in parts:
        return "Wave 2"
    if "wave1" in parts:
        return "Wave 1"
    return "Wave staging"


def fill_catalog_gaps(meta: dict[str, dict], catalog_ids: set[str]) -> list[tuple[str, str]]:
    """Add catalog entries for skin PNGs on disk but missing from catalog.js."""
    new_entries: list[tuple[str, str]] = []
    for stem in sorted(f.stem for f in SKINS_DIR.glob("*.png") if is_skin_stem(f.stem)):
        if stem in catalog_ids:
            continue
        rarity, name_en, name_es = names_for(stem, meta)
        family = family_for(stem)
        line = catalog_line(stem, rarity, family, name_en, name_es)
        new_entries.append(("On disk · catalog gap", line))
        catalog_ids.add(stem)
        meta[stem] = {"rarity": rarity, "family": family, "name_en": name_en, "name_es": name_es}
    return new_entries


def integrate(dry_run: bool = False, repair: bool = True) -> dict:
    catalog_ids, meta = parse_catalog()
    existing_pngs = {f.stem for f in SKINS_DIR.glob("*.png") if is_skin_stem(f.stem)}

    # All stems present in any source root.
    all_stems: set[str] = set()
    for root in SOURCE_ROOTS:
        if not root.exists():
            continue
        for f in root.rglob("*.png"):
            if f.name.endswith("_hi.png"):
                continue
            if is_skin_stem(f.stem):
                all_stems.add(f.stem)

    missing = sorted(all_stems - existing_pngs)
    copied: list[tuple[str, Path]] = []
    repaired: list[tuple[str, Path]] = []
    new_entries: list[tuple[str, str]] = []  # (wave_tag, line)

    for stem in missing:
        src = find_source(stem)
        if not src:
            continue
        dst = SKINS_DIR / f"{stem}.png"
        if not dry_run:
            prepare_skin_png(src, dst)
        copied.append((stem, src))

        if stem not in catalog_ids:
            rarity, name_en, name_es = names_for(stem, meta)
            family = family_for(stem)
            line = catalog_line(stem, rarity, family, name_en, name_es)
            tag = wave_tag(stem, src)
            new_entries.append((tag, line))
            catalog_ids.add(stem)
            meta[stem] = {"rarity": rarity, "family": family, "name_en": name_en, "name_es": name_es}

    if repair:
        for stem in sorted(existing_pngs):
            dst = SKINS_DIR / f"{stem}.png"
            if not dst.exists():
                continue
            try:
                current = Image.open(dst).convert("RGBA")
            except OSError:
                continue
            if not has_opaque_white_bg(current):
                continue
            src = find_source(stem)
            if not src:
                continue
            if not dry_run:
                prepare_skin_png(src, dst)
            repaired.append((stem, src))

    if not dry_run:
        new_entries.extend(fill_catalog_gaps(meta, catalog_ids))

    catalog_gaps = sorted(
        f.stem for f in SKINS_DIR.glob("*.png") if is_skin_stem(f.stem) and f.stem not in catalog_ids
    )

    if not dry_run and new_entries:
        text = CATALOG_PATH.read_text(encoding="utf-8")
        # Group by wave tag
        by_tag: dict[str, list[str]] = {}
        for tag, line in new_entries:
            by_tag.setdefault(tag, []).append(line)
        blocks = []
        for tag in sorted(by_tag.keys()):
            blocks.append(f"    // ----- {tag} (integrated) -----")
            blocks.extend(by_tag[tag])
        marker = "    // ===== CUCHARAS · Wave 1 ====="
        if marker not in text:
            marker = "  ];"
        combined = "\n".join(blocks) + "\n\n" + marker
        text = text.replace(marker, combined, 1)
        CATALOG_PATH.write_text(text, encoding="utf-8")

    opaque_remaining = []
    for stem in sorted(existing_pngs | set(all_stems)):
        dst = SKINS_DIR / f"{stem}.png"
        if not dst.exists():
            continue
        try:
            if has_opaque_white_bg(Image.open(dst).convert("RGBA")):
                opaque_remaining.append(stem)
        except OSError:
            pass

    return {
        "wave_stems_total": len(all_stems),
        "already_in_assets": len(all_stems & existing_pngs),
        "copied": len(copied),
        "repaired": len(repaired),
        "catalog_added": len(new_entries),
        "catalog_gaps_on_disk": len(catalog_gaps),
        "opaque_remaining": len(opaque_remaining),
        "missing_no_source": [s for s in missing if not find_source(s)],
        "repaired_stems": [s for s, _ in repaired],
        "opaque_stems": opaque_remaining,
    }


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "integrate"
    if mode == "audit":
        _, _ = parse_catalog()
        existing = {f.stem for f in SKINS_DIR.glob("*.png") if is_skin_stem(f.stem)}
        opaque = [
            s for s in sorted(existing)
            if has_opaque_white_bg(Image.open(SKINS_DIR / f"{s}.png").convert("RGBA"))
        ]
        import json
        print(json.dumps({"total": len(existing), "opaque_white_bg": len(opaque), "stems": opaque}, indent=2))
        return 0
    if mode == "dry-run":
        r = integrate(dry_run=True)
    elif mode == "repair":
        r = integrate(dry_run=False, repair=True)
    else:
        r = integrate(dry_run=False, repair=True)
    import json
    print(json.dumps(r, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
