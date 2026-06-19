#!/usr/bin/env python3
"""Process newly generated Bongo PNGs: rembg, center in 768x512, save to assets/skins/."""
from __future__ import annotations

import os
import sys

from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("pip install rembg onnxruntime pillow", file=sys.stderr)
    sys.exit(1)

SRC = r"C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets"
DST = r"D:\SmallCreek Game\assets\skins"
TARGET = (768, 512)

NAMES = [
    "bongo_uncommon_chef.png",
    "bongo_rare_dj.png",
    "bongo_legendary_elder.png",
    "bongo_uncommon_utensils.png",
    "bongo_rare_detective.png",
    "bongo_rare_ninja.png",
    "bongo_rare_pilot.png",
    "bongo_epic_guitarist.png",
    "bongo_legendary_corsair.png",
    "bongo_superleg_robot.png",
]

os.makedirs(DST, exist_ok=True)
ok = fail = 0
for name in NAMES:
    src = os.path.join(SRC, name)
    dst = os.path.join(DST, name)
    if not os.path.isfile(src):
        print(f"SKIP missing source: {name}")
        fail += 1
        continue
    try:
        img = Image.open(src).convert("RGBA")
        out = remove(img)
        out.thumbnail(TARGET, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        x = (TARGET[0] - out.width) // 2
        y = (TARGET[1] - out.height) // 2
        canvas.paste(out, (x, y), out)
        canvas.save(dst, "PNG", optimize=True)
        ok += 1
        print(f"OK   {name} -> {dst}")
    except Exception as e:
        fail += 1
        print(f"FAIL {name}: {e}")

print(f"\nDone: {ok} ok, {fail} fail")
