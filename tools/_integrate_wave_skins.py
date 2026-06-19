#!/usr/bin/env python3
"""Integrate Wave 3 transparent skins from Originales HD into assets/skins + catalog."""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKINS_DIR = ROOT / "assets" / "skins"
CATALOG_PATH = SKINS_DIR / "catalog.js"
WAVE3_TRANSP = Path(r"D:\SmallCreek Originales HD\Wave3_transparente")
WAVE1 = Path(r"D:\SmallCreek Originales HD\Wave1")
WAVE2 = Path(r"D:\SmallCreek Originales HD\Wave2")
TARGET = (768, 512)
HELPERS = ("pio", "ivan", "coco", "bunny", "bongo")
THEMES = ("aliens", "fastfood", "mixed", "superheroes")

# Display names for Wave 3 themes (helper prefix + theme slug -> en/es names)
THEME_NAMES = {
    "aliens": {
        "common_greenie": ("Green Alien", "Alienígena Verde"),
        "uncommon_antenna": ("Antenna", "Antena"),
        "uncommon_graylien": ("Gray Alien", "Alienígena Gris"),
        "rare_bugzoid": ("Bugzoid", "Insectoide"),
        "rare_graylien": ("Gray Alien", "Alienígena Gris"),
        "rare_tentaclien": ("Tentaclien", "Tentáculo"),
        "epic_bugzoid": ("Bugzoid", "Insectoide"),
        "epic_cosmonaut": ("Cosmonaut", "Cosmonauta"),
        "epic_triclops": ("Triclops", "Tríclope"),
        "legendary_warlord": ("Alien Warlord", "Señor Alienígena"),
        "superleg_saucer": ("UFO Pilot", "Piloto OVNI"),
        "superleg_voyager": ("Voyager", "Viajero Espacial"),
    },
    "fastfood": {
        "common_sushi": ("Sushi", "Sushi"),
        "common_burger": ("Burger", "Hamburguesa"),
        "common_fries": ("Fries", "Papas Fritas"),
        "uncommon_ramen": ("Ramen", "Ramen"),
        "uncommon_taco": ("Taco", "Taco"),
        "uncommon_fries": ("Fries", "Papas Fritas"),
        "uncommon_pizza": ("Pizza", "Pizza"),
        "uncommon_burger": ("Burger", "Hamburguesa"),
        "uncommon_hotdog": ("Hot Dog", "Perrito Caliente"),
        "uncommon_pretzel": ("Pretzel", "Pretzel"),
        "rare_hotdog": ("Hot Dog", "Perrito Caliente"),
        "rare_sodacannon": ("Soda Cannon", "Cañón de Soda"),
        "rare_corndog": ("Corn Dog", "Salchicha Empanizada"),
        "rare_donut": ("Donut", "Dona"),
        "rare_taco": ("Taco", "Taco"),
        "rare_mustardgun": ("Mustard Gun", "Pistola de Mostaza"),
        "rare_ketchupgun": ("Ketchup Gun", "Pistola de Ketchup"),
        "rare_sodablaster": ("Soda Blaster", "Lanzador de Soda"),
        "epic_takoyaki": ("Takoyaki", "Takoyaki"),
        "epic_pizza": ("Pizza", "Pizza"),
        "epic_donut": ("Donut", "Dona"),
        "epic_chicken": ("Chicken", "Pollo"),
        "epic_icecream": ("Ice Cream", "Helado"),
        "legendary_donut": ("Donut", "Dona"),
        "legendary_sushi": ("Sushi Roll", "Rollo de Sushi"),
        "legendary_chicken": ("Fried Chicken", "Pollo Frito"),
        "legendary_burrito": ("Burrito", "Burrito"),
        "superleg_milkshake": ("Milkshake", "Batido"),
        "superleg_soda": ("Soda", "Refresco"),
        "superleg_icecream": ("Ice Cream", "Helado"),
    },
    "mixed": {
        "uncommon_soccer": ("Soccer", "Fútbol"),
        "uncommon_violin": ("Violinist", "Violinista"),
        "uncommon_tennis": ("Tennis", "Tenis"),
        "uncommon_boxer": ("Boxer", "Boxeador"),
        "common_tennis": ("Tennis", "Tenis"),
        "common_firefighter": ("Firefighter", "Bombero"),
        "common_zombie": ("Zombie", "Zombi"),
        "common_pumpkin": ("Pumpkin", "Calabaza"),
        "common_baseball": ("Baseball", "Béisbol"),
        "rare_ninja": ("Ninja", "Ninja"),
        "rare_pilot": ("Pilot", "Piloto"),
        "rare_doctor": ("Doctor", "Doctor"),
        "rare_kunoichi": ("Kunoichi", "Kunoichi"),
        "rare_firefighter": ("Firefighter", "Bombero"),
        "rare_shinobi": ("Shinobi", "Shinobi"),
        "rare_guitar": ("Guitarist", "Guitarrista"),
        "rare_pirate": ("Pirate", "Pirata"),
        "rare_corsair": ("Corsair", "Corsario"),
        "rare_punkrock": ("Punk Rocker", "Punk"),
        "epic_knight": ("Knight", "Caballero"),
        "epic_zombie": ("Zombie", "Zombi"),
        "epic_guitarist": ("Guitarist", "Guitarrista"),
        "epic_witch": ("Witch", "Bruja"),
        "epic_samurai": ("Samurai", "Samurái"),
        "epic_vampire": ("Vampire", "Vampiro"),
        "epic_trumpeter": ("Trumpeter", "Trompetista"),
        "epic_pumpkin": ("Pumpkin", "Calabaza"),
        "legendary_corsair": ("Corsair", "Corsario"),
        "legendary_pirate": ("Pirate Captain", "Capitán Pirata"),
        "legendary_paladin": ("Paladin", "Paladín"),
        "legendary_firefighter": ("Firefighter", "Bombero"),
        "superleg_robot": ("Robot", "Robot"),
        "superleg_mecha": ("Mecha", "Mecha"),
        "superleg_chrome": ("Chrome", "Cromo"),
    },
    "superheroes": {
        "common_caped": ("Caped Hero", "Héroe con Capa"),
        "common_speedster": ("Speedster", "Velocista"),
        "uncommon_aqua": ("Aqua Hero", "Héroe Acuático"),
        "uncommon_stealth": ("Stealth", "Sigilo"),
        "uncommon_masked": ("Masked Hero", "Héroe Enmascarado"),
        "uncommon_speedster": ("Speedster", "Velocista"),
        "uncommon_nature": ("Nature Hero", "Héroe Natural"),
        "uncommon_archer": ("Archer", "Arquero"),
        "rare_masked": ("Masked Hero", "Héroe Enmascarado"),
        "rare_ranger": ("Ranger", "Guardabosques"),
        "rare_aqua": ("Aqua Hero", "Héroe Acuático"),
        "rare_stealth": ("Stealth", "Sigilo"),
        "rare_archer": ("Archer", "Arquero"),
        "rare_brawler": ("Brawler", "Luchador"),
        "epic_mech": ("Mech Hero", "Mecha"),
        "epic_aqua": ("Aqua Hero", "Héroe Acuático"),
        "legendary_winged": ("Winged Hero", "Héroe Alado"),
        "legendary_mech": ("Mech Hero", "Mecha"),
        "superleg_strong": ("Super Strong", "Súper Fuerte"),
        "superleg_winged": ("Winged Hero", "Héroe Alado"),
        "superleg_aqua": ("Aqua Hero", "Héroe Acuático"),
    },
}

HELPER_LABEL = {
    "pio": "Pío",
    "ivan": "Ivan",
    "coco": "Coco",
    "bunny": "Bunny",
    "bongo": "Bongo",
}


def parse_catalog_ids() -> set[str]:
    text = CATALOG_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"id:\s*'([^']+)'", text))


def parse_rarity(skin_id: str) -> str:
    parts = skin_id.split("_", 2)
    if len(parts) >= 2:
        return parts[1]
    return "common"


def theme_slug(skin_id: str, helper: str) -> str:
    return skin_id[len(helper) + 1 :]


def display_names(helper: str, skin_id: str, theme: str) -> tuple[str, str]:
    slug = theme_slug(skin_id, helper)
    theme_map = THEME_NAMES.get(theme, {})
    if slug in theme_map:
        en, es = theme_map[slug]
    else:
        # fallback: title-case slug
        label = slug.replace("_", " ").title()
        en, es = label, label
    prefix = HELPER_LABEL.get(helper, helper.title())
    return f"{prefix} · {en}", f"{prefix} · {es}"


def ensure_rgba_768x512(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    if img.size != TARGET:
        img.thumbnail(TARGET, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        x = (TARGET[0] - img.width) // 2
        y = (TARGET[1] - img.height) // 2
        canvas.paste(img, (x, y), img)
        img = canvas
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG", optimize=True)


def catalog_entry(helper: str, skin_id: str, theme: str) -> str:
    rarity = parse_rarity(skin_id)
    name_en, name_es = display_names(helper, skin_id, theme)
    return (
        f"    {{ id: '{skin_id}', rarity: '{rarity}', family: 'helper', "
        f"img: 'assets/skins/{skin_id}.png', thumb: 'assets/skins/thumbs/{skin_id}.webp', "
        f"name_en: '{name_en}', name_es: '{name_es}' }},"
    )


def audit() -> dict:
    catalog_ids = parse_catalog_ids()
    existing_pngs = {f.name for f in SKINS_DIR.glob("*.png")}
    report = {"missing_files": {}, "missing_catalog": {}, "to_integrate": {}}

    for theme in THEMES:
        theme_dir = WAVE3_TRANSP / theme
        if not theme_dir.is_dir():
            continue
        for helper in HELPERS:
            wave_files = sorted(
                f.name
                for f in theme_dir.glob(f"{helper}_*.png")
                if not f.name.endswith("_hi.png")
            )
            miss_files = [f for f in wave_files if f not in existing_pngs]
            miss_cat = [
                f.replace(".png", "")
                for f in wave_files
                if f.replace(".png", "") not in catalog_ids
            ]
            if miss_files:
                report["missing_files"].setdefault(helper, {}).setdefault(theme, miss_files)
            if miss_cat:
                report["missing_catalog"].setdefault(helper, {}).setdefault(theme, miss_cat)
            to_do = [
                f.replace(".png", "")
                for f in wave_files
                if f not in existing_pngs or f.replace(".png", "") not in catalog_ids
            ]
            if to_do:
                report["to_integrate"].setdefault(helper, {}).setdefault(theme, to_do)

    return report


def integrate(dry_run: bool = False) -> dict:
    catalog_ids = parse_catalog_ids()
    stats = {h: {t: 0 for t in THEMES} for h in HELPERS}
    new_entries: list[tuple[str, str, str]] = []  # theme, helper, entry line

    for theme in THEMES:
        theme_dir = WAVE3_TRANSP / theme
        if not theme_dir.is_dir():
            continue
        for helper in HELPERS:
            for src in sorted(theme_dir.glob(f"{helper}_*.png")):
                if src.name.endswith("_hi.png"):
                    continue
                skin_id = src.stem
                dst = SKINS_DIR / src.name

                copied = False
                if not dst.exists() or dry_run:
                    if not dry_run:
                        ensure_rgba_768x512(src, dst)
                    copied = True

                if skin_id not in catalog_ids:
                    new_entries.append((theme, helper, catalog_entry(helper, skin_id, theme)))
                    catalog_ids.add(skin_id)

                if copied or skin_id not in parse_catalog_ids():
                    stats[helper][theme] += 1

    if not dry_run and new_entries:
        update_catalog(new_entries)

    return stats, new_entries


def update_catalog(new_entries: list[tuple[str, str, str]]) -> None:
    text = CATALOG_PATH.read_text(encoding="utf-8")
    # Group by theme + helper for section comments
    by_section: dict[tuple[str, str], list[str]] = {}
    for theme, helper, line in new_entries:
        by_section.setdefault((theme, helper), []).append(line)

    insert_blocks = []
    theme_labels = {
        "aliens": "Aliens",
        "fastfood": "Fastfood",
        "mixed": "Mixed",
        "superheroes": "Superheroes",
    }
    helper_labels = {
        "pio": "Pío",
        "ivan": "Ivan",
        "coco": "Coco",
        "bunny": "Baby Bunny",
        "bongo": "Bongo",
    }

    for (theme, helper), lines in sorted(by_section.items()):
        comment = f"    // ----- {helper_labels[helper]} · Wave 3 · {theme_labels[theme]} -----"
        block = comment + "\n" + "\n".join(lines)
        insert_blocks.append(block)

    marker = "    // ===== CUCHARAS · Wave 1 ====="
    if marker not in text:
        marker = "  ];"
    combined = "\n".join(insert_blocks) + "\n\n" + marker
    text = text.replace(marker, combined, 1)
    CATALOG_PATH.write_text(text, encoding="utf-8")


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "integrate"
    if mode == "audit":
        r = audit()
        print(json.dumps(r, indent=2))
        return 0
    stats, entries = integrate(dry_run=(mode == "dry-run"))
    print("Integrated stats:", json.dumps(stats, indent=2))
    print(f"New catalog entries: {len(entries)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
