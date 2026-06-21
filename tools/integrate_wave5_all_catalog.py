#!/usr/bin/env python3
"""Activate all Wave 5 catalog rows whose PNG exists in assets/skins."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "tools" / "wave5_chaos_kawaii.json"
ANOMALY_PATH = ROOT / "tools" / "anomaly_catalog.json"
CATALOG = ROOT / "assets" / "skins" / "catalog.js"
SKINS = ROOT / "assets" / "skins"

PILOT_START = "    // --- Wave 5 pilot (auto) ---"
ACTIVE_START = "    // --- Wave 5 — Chaos Kawaii (active) ---"
ACTIVE_HD = "    // --- Wave 5 — Chaos Kawaii (active, HD art only) ---"
WAVE5_MARKER = "    // === WAVE 5 — Chaos Kawaii"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def catalog_line(it: dict) -> str:
    return (
        f"    {{ id: '{esc(it['id'])}', rarity: '{it['rarity']}', family: '{it['family']}', "
        f"img: '{esc(it['img'])}', thumb: '{esc(it['thumb'])}', "
        f"name_en: '{esc(it['name_en'])}', name_es: '{esc(it['name_es'])}' }},"
    )


def strip_old_wave5_block(text: str) -> str:
    starts = [PILOT_START, ACTIVE_HD, ACTIVE_START]
    while True:
        hit = None
        for start in starts:
            if start in text and WAVE5_MARKER in text:
                a = text.index(start)
                if hit is None or a < hit[0]:
                    hit = (a, start)
        if not hit:
            break
        a, start = hit
        b = text.index(WAVE5_MARKER, a)
        text = text[:a] + text[b:]
    return text


def anomaly_entries() -> list[dict]:
    if not ANOMALY_PATH.exists():
        return []
    data = json.loads(ANOMALY_PATH.read_text(encoding="utf-8"))
    out = []
    for h in data.get("helpers") or []:
        hid = h.get("id")
        if not hid or not (SKINS / f"{hid}.png").exists():
            continue
        out.append(
            {
                "id": hid,
                "rarity": "anomaly",
                "family": h.get("family") or "helper",
                "img": f"assets/skins/{hid}.png",
                "thumb": f"assets/skins/thumbs/{hid}.webp",
                "name_en": h.get("name_en") or hid,
                "name_es": h.get("name_es") or hid,
            }
        )
    return out


def main() -> int:
    if not JSON_PATH.exists():
        print("Run: python tools/generate-wave5-scaffold.py")
        return 1

    items = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    ready = [it for it in items if (SKINS / f"{it['id']}.png").exists()]
    missing = len(items) - len(ready)

    text = CATALOG.read_text(encoding="utf-8")
    if WAVE5_MARKER not in text:
        print("ERROR: WAVE 5 marker missing in catalog.js")
        return 1

    text = strip_old_wave5_block(text)
    wave5_ids = {it["id"] for it in items}
    anomaly_ids = {a["id"] for a in anomaly_entries()}

    # Drop stale wave5 / anomaly ids still listed elsewhere (shouldn't happen)
    lines_out = []
    for line in text.splitlines():
        m = re.search(r"id:\s*'([^']+)'", line)
        if m and m.group(1) in wave5_ids | anomaly_ids:
            continue
        lines_out.append(line)
    text = "\n".join(lines_out)

    anomalies = anomaly_entries()
    anomaly_block = ""
    if anomalies:
        anomaly_block = (
            "    // --- Anomalías (ultra-raro) ---\n"
            + "\n".join(catalog_line(it) for it in anomalies)
            + "\n"
        )

    block = ACTIVE_START + "\n" + "\n".join(catalog_line(it) for it in ready) + "\n" + anomaly_block
    text = text.replace(WAVE5_MARKER, block + WAVE5_MARKER, 1)
    CATALOG.write_text(text, encoding="utf-8")

    print(f"==> Catalog: {len(ready)} Wave 5 + {len(anomalies)} Anomalías active ({missing} Wave5 PNGs still missing)")
    return 0 if not missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
