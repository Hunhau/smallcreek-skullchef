"""Optimize charm skin PNGs for a lightweight web build of "Smallcreek Skullchef".

For each PNG directly inside assets/skins (the originals/ subfolder is skipped),
this opens the image as RGBA, downscales it so the longest side is 768px while
preserving aspect ratio (LANCZOS), and saves it back over itself as an optimized
PNG with the alpha channel preserved. Filenames are kept identical so catalog.js
needs no changes.

Pristine copies live in assets/skins/originals/ and *_hi.png elsewhere, so this
operation is fully reversible.
"""

import os
from PIL import Image

SKINS_DIR = r"D:\SmallCreek Game\assets\skins"
MAX_SIDE = 768


def human_kb(num_bytes):
    return num_bytes / 1024.0


def main():
    files = sorted(
        f for f in os.listdir(SKINS_DIR)
        if f.lower().endswith(".png")
        and os.path.isfile(os.path.join(SKINS_DIR, f))
    )

    total_old = 0
    total_new = 0
    count = 0

    print(f"Optimizing {len(files)} PNG(s) in {SKINS_DIR}")
    print(f"Target: longest side = {MAX_SIDE}px, RGBA preserved, optimize=True\n")

    for name in files:
        path = os.path.join(SKINS_DIR, name)
        old_bytes = os.path.getsize(path)

        with Image.open(path) as img:
            img = img.convert("RGBA")
            w, h = img.size
            longest = max(w, h)
            if longest > MAX_SIDE:
                scale = MAX_SIDE / float(longest)
                new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
                img = img.resize(new_size, Image.LANCZOS)
            else:
                new_size = (w, h)
            img.save(path, format="PNG", optimize=True)

        new_bytes = os.path.getsize(path)
        total_old += old_bytes
        total_new += new_bytes
        count += 1

        print(
            f"{name:<32} {human_kb(old_bytes):8.1f} KB -> {human_kb(new_bytes):8.1f} KB"
            f"  ({w}x{h} -> {new_size[0]}x{new_size[1]})"
        )

    print("\n" + "=" * 64)
    print(f"Files processed : {count}")
    print(f"Total before    : {total_old / (1024*1024):.2f} MB ({human_kb(total_old):.1f} KB)")
    print(f"Total after     : {total_new / (1024*1024):.2f} MB ({human_kb(total_new):.1f} KB)")
    if total_old:
        saved = total_old - total_new
        print(f"Saved           : {saved / (1024*1024):.2f} MB ({100.0 * saved / total_old:.1f}%)")
        print(f"Avg per file    : {human_kb(total_old)/count:.1f} KB -> {human_kb(total_new)/count:.1f} KB")


if __name__ == "__main__":
    main()
