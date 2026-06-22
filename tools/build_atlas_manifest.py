#!/usr/bin/env python3
"""Build assets/atlas_manifest.js from catalog + wave manifests."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets" / "skins" / "catalog.js"
OUT = ROOT / "assets" / "atlas_manifest.js"
W5 = ROOT / "tools" / "wave5_chaos_kawaii.json"
W7 = ROOT / "tools" / "wave7_realm_ruckus.json"

REGIONS = [
    {
        "id": "cauldron_core",
        "title_en": "Cauldron Core",
        "title_es": "Núcleo del Caldero",
        "emoji": "🍲",
        "chronicle_en": "Every legend starts with one simmering pot and five hungry helpers.",
        "chronicle_es": "Toda leyenda empieza con una olla hirviendo y cinco ayudantes hambrientos.",
    },
    {
        "id": "cosmic_kitchen",
        "title_en": "Cosmic Kitchen",
        "title_es": "Cocina Cósmica",
        "emoji": "🛸",
        "chronicle_en": "The broth bubbled so hard it tore a hole into snack-space.",
        "chronicle_es": "El caldo burbujeó tan fuerte que abrió un agujero al espacio-snack.",
    },
    {
        "id": "chaos_realm",
        "title_en": "Chaos Realm",
        "title_es": "Reino del Caos",
        "emoji": "🎭",
        "chronicle_en": "Esqueletia learned that kawaii chaos is a renewable ingredient.",
        "chronicle_es": "Esqueletia descubrió que el caos kawaii es un ingrediente renovable.",
    },
    {
        "id": "realm_ruckus",
        "title_en": "Realm Ruckus",
        "title_es": "Alboroto de Reinos",
        "emoji": "🗺️",
        "chronicle_en": "New lands appear whenever the atlas gains another stamp.",
        "chronicle_es": "Surgen tierras nuevas cada vez que el atlas gana otro sello.",
    },
]

COMMENT_PACKS = [
    (r"Wave 3.*Aliens", "wave3_aliens", "Wave 3 · Aliens", "Wave 3 · Aliens", "cosmic_kitchen"),
    (r"Wave 3.*Fastfood|Comida \(Wave 3\)", "wave3_fastfood", "Wave 3 · Fast Food", "Wave 3 · Comida Rápida", "cosmic_kitchen"),
    (r"Wave 3.*Mixed", "wave3_mixed", "Wave 3 · Mixed", "Wave 3 · Caos Mixto", "cosmic_kitchen"),
    (r"Wave 3.*Superheroes", "wave3_superheroes", "Wave 3 · Superheroes", "Wave 3 · Superhéroes", "cosmic_kitchen"),
    (r"Wave 3 \(integrated\)", "wave3_helpers", "Wave 3 · Helpers", "Wave 3 · Ayudantes", "cosmic_kitchen"),
    (r"Wave staging", "wave_staging", "Staging Skins", "Skins en Staging", "chaos_realm"),
    (r"--- Anomal|Anomalías \(ultra", "anomalies", "Anomalies", "Anomalías", "cauldron_core"),
    (r"Wave 5|Chaos Kawaii", None, None, None, None),
    (r"· Wave 2|Wave 2 -----", "wave2_expansion", "Wave 2 · Expansion", "Wave 2 · Expansión", "cauldron_core"),
    (r"Wave 1 \(extra\)|· Wave 1 -----", "wave1_core", "Wave 1 · Core", "Wave 1 · Núcleo", "cauldron_core"),
]


def load_json_pack_map(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    items = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for it in items:
        sid = it.get("id")
        pack = it.get("pack")
        if sid and pack:
            out[sid] = {
                "pack": pack,
                "title_en": it.get("pack_title_en") or pack.replace("_", " ").title(),
                "title_es": it.get("pack_title_es") or pack.replace("_", " ").title(),
            }
    return out


def region_for_pack(pack: str) -> str:
    if pack in {"anomalies", "utensils_spoon", "utensils_hat", "wave1_core", "wave2_expansion"}:
        return "cauldron_core"
    if pack.startswith("wave3_"):
        return "cosmic_kitchen"
    if pack in {
        "winter_wonderland",
        "desert_dunes",
        "pirate_plunder",
        "ninja_noodle",
        "vampire_vogue",
        "fairy_glade",
        "steampunk_soup",
        "detective_clue",
        "wild_west_wacky",
        "prehistoric_silly",
        "tv_studio_chaos",
    }:
        return "realm_ruckus"
    return "chaos_realm"


def parse_catalog(json_map: dict[str, dict]) -> dict[str, tuple[str, str, str, str]]:
    text = CATALOG.read_text(encoding="utf-8")
    current = ("wave1_core", "Wave 1 · Core", "Wave 1 · Núcleo", "cauldron_core")
    out: dict[str, tuple[str, str, str, str]] = {}

    for line in text.splitlines():
        if "//" in line:
            comment = line.split("//", 1)[1]
            for pat, pid, en, es, region in COMMENT_PACKS:
                if pid and re.search(pat, comment, re.I):
                    current = (pid, en, es, region)
                    break

        m = re.match(r"\s*\{ id: '([^']+)'", line)
        if not m:
            continue
        sid = m.group(1)

        if sid in json_map:
            j = json_map[sid]
            pack = j["pack"]
            out[sid] = (pack, j["title_en"], j["title_es"], region_for_pack(pack))
            continue

        if sid.startswith("spoon_"):
            out[sid] = ("utensils_spoon", "Spoon Collection", "Colección de Cucharas", "cauldron_core")
            continue
        if sid.startswith("chefhat_"):
            out[sid] = ("utensils_hat", "Chef Hat Collection", "Colección de Gorros", "cauldron_core")
            continue

        if sid.split("_")[0] in {"pio", "ivan", "coco", "bunny", "bongo"}:
            out[sid] = current
        else:
            out[sid] = ("misc", "Misc", "Varios", "cauldron_core")

    return out


def main() -> int:
    json_map = load_json_pack_map(W5)
    json_map.update(load_json_pack_map(W7))
    skin_assign = parse_catalog(json_map)

    packs: dict[str, dict] = {}
    for sid, (pack, te, ts, region) in skin_assign.items():
        if pack not in packs:
            packs[pack] = {
                "id": pack,
                "region": region,
                "title_en": te,
                "title_es": ts,
                "skinIds": [],
            }
        packs[pack]["skinIds"].append(sid)

    for p in packs.values():
        p["skinIds"].sort()
        p["total"] = len(p["skinIds"])

    regions_out = []
    for r in REGIONS:
        rid = r["id"]
        region_packs = sorted([p["id"] for p in packs.values() if p["region"] == rid])
        regions_out.append({**r, "packs": region_packs})

    manifest = {
        "goalTotal": 1000,
        "setBonusPct": 1,
        "regions": regions_out,
        "packs": packs,
        "skinPack": {sid: skin_assign[sid][0] for sid in skin_assign},
    }

    js = (
        "// Auto-generated by tools/build_atlas_manifest.py — do not edit by hand.\n"
        "window.ESQUELOTIA_ATLAS = "
        + json.dumps(manifest, ensure_ascii=False, indent=2)
        + ";\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"Wrote {OUT} — {len(skin_assign)} skins, {len(packs)} packs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
