"""
Lossy palette compression for SmallCreek skin PNGs.

Uses libimagequant (via the `imagequant` Python package) which is the same
engine as pngquant: alpha-aware palette quantization that preserves soft
transparent edges. Falls back to Pillow's alpha-aware quantize if libimagequant
is unavailable.

- Does NOT change filenames, extensions, or pixel dimensions.
- Does NOT flatten or fill transparent areas.
- Operates in-place on assets/skins/*.png (backup must already exist).
"""

import os
import sys

from PIL import Image

SKINS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "skins")
SKINS_DIR = os.path.abspath(SKINS_DIR)
BACKUP_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "assets", "skins_backup_pre_compress")
)

# Quality window (pngquant-style). If the quantizer cannot reach min_quality,
# imagequant raises and we keep the original RGBA for that file.
MIN_QUALITY = 65
MAX_QUALITY = 88
MAX_COLORS = 256
DITHER = 1.0

try:
    import imagequant

    HAVE_IQ = True
except Exception:
    HAVE_IQ = False


def human(n):
    return f"{n / 1024:.1f} KB"


def compress_one(path):
    """Compress a single PNG in place. Returns (method, kept_quality_high)."""
    src = Image.open(path)
    src.load()
    orig_size = src.size
    rgba = src.convert("RGBA")

    out = None
    method = None
    kept_high = False

    if HAVE_IQ:
        try:
            out = imagequant.quantize_pil_image(
                rgba,
                dithering_level=DITHER,
                max_colors=MAX_COLORS,
                min_quality=MIN_QUALITY,
                max_quality=MAX_QUALITY,
            )
            method = "libimagequant"
        except Exception:
            # Quantizer couldn't keep acceptable quality (often delicate alpha).
            # Keep this image at full quality, just re-optimize losslessly.
            out = rgba
            method = "lossless-fallback"
            kept_high = True
    else:
        # Pillow fallback: alpha-aware quantize.
        out = rgba.quantize(colors=MAX_COLORS, method=Image.Quantize.FASTOCTREE)
        method = "pillow-fastoctree"

    assert out.size == orig_size, f"dimension change on {path}"
    out.save(path, format="PNG", optimize=True)
    return method, kept_high


def main():
    files = sorted(f for f in os.listdir(SKINS_DIR) if f.lower().endswith(".png"))
    if not files:
        print("No PNGs found in", SKINS_DIR)
        sys.exit(1)

    print(f"Engine: {'libimagequant (imagequant pkg)' if HAVE_IQ else 'Pillow fallback'}")
    print(f"Skins dir: {SKINS_DIR}\n")

    before_total = after_total = 0
    rows = []
    methods = {}
    kept_high_files = []

    for name in files:
        path = os.path.join(SKINS_DIR, name)
        before = os.path.getsize(path)
        method, kept_high = compress_one(path)
        after = os.path.getsize(path)
        before_total += before
        after_total += after
        methods[method] = methods.get(method, 0) + 1
        if kept_high:
            kept_high_files.append(name)
        rows.append((name, before, after))

    print(f"{'file':40} {'before':>12} {'after':>12} {'reduction':>10}")
    for name, b, a in rows:
        red = (1 - a / b) * 100 if b else 0
        print(f"{name:40} {human(b):>12} {human(a):>12} {red:>9.1f}%")

    print("\n=== TOTALS ===")
    print(f"BEFORE: {before_total/1024/1024:.2f} MB ({before_total} bytes)")
    print(f"AFTER : {after_total/1024/1024:.2f} MB ({after_total} bytes)")
    print(f"REDUCTION: {(1 - after_total/before_total)*100:.1f}%")
    print(f"Methods: {methods}")
    if kept_high_files:
        print(f"Kept at higher quality (alpha-sensitive): {kept_high_files}")


if __name__ == "__main__":
    main()
