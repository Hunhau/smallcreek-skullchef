#!/usr/bin/env python3
"""Process generated Bongo skin PNGs: rembg, resize 768x512, save to assets/skins/."""
from __future__ import annotations

import glob
import os
import sys

from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("rembg required: pip install rembg onnxruntime pillow", file=sys.stderr)
    sys.exit(1)

SRC = r"C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets"
DST = r"D:\SmallCreek Game\assets\skins"
TARGET = (768, 512)
SKIP = {"bongo_sitting_master.png", "bongo_common_floatie.png"}

os.makedirs(DST, exist_ok=True)

files = sorted(
    f for f in glob.glob(os.path.join(SRC, "bongo_*.png"))
    if os.path.basename(f) not in SKIP
)
print(f"Processing {len(files)} Bongo skins...")

ok = fail = 0
for path in files:
    name = os.path.basename(path)
    if name == "bongo_common_basic.png":
        continue
    target = os.path.join(DST, name)
    try:
        img = Image.open(path).convert("RGBA")
        out = remove(img)
        out.thumbnail(TARGET, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", TARGET, (0, 0, 0, 0))
        x = (TARGET[0] - out.width) // 2
        y = (TARGET[1] - out.height) // 2
        canvas.paste(out, (x, y), out)
        canvas.save(target, "PNG", optimize=True)
        ok += 1
        print(f"OK   {name} -> {out.width}x{out.height} centered in 768x512")
    except Exception as e:
        fail += 1
        print(f"FAIL {name}: {e}")

print(f"\nDone: {ok} ok, {fail} fail -> {DST}")
