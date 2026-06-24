#!/usr/bin/env python3
"""Generate 9 Steam achievement icons (64 + 1024 PNG) from Skullchef art."""
from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFont
except ImportError:
    raise SystemExit("pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"
OUT = ROOT / "steam" / "achievements"

ACHIEVEMENTS = [
    ("ACH_FIRSTCLICK", "First Stir", (IMG / "spoon.png", 0.35, -25)),
    ("ACH_FIRSTPRES", "First Prestige", (IMG / "angel.png", 0.42, 0)),
    ("ACH_FIRSTCHAMP", "Grand Prix Champion", (IMG / "card-legendary.png", 0.38, 0)),
    ("ACH_FULLTEAM", "Full Kitchen Crew", None),
    ("ACH_ALLSPOONS", "Sacred Spoon Album", (IMG / "spoon.png", 0.32, 15)),
    ("ACH_CENTURION", "Centurion Chef", (IMG / "chef.png", 0.40, 0)),
    ("ACH_AWAKENED5", "Five Awakenings", (IMG / "angel.png", 0.38, 0)),
    ("ACH_COLLECTOR", "Charm Collector", (IMG / "card-rare.png", 0.40, 0)),
    ("ACH_MYTHICCHARM", "Mythic Drop", (IMG / "card-legendary.png", 0.42, 0)),
]

HELPERS = ["pio.png", "ivan.png", "coco.png", "bunny.png", "bongo.png"]


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def trim_alpha(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def paste_scaled(base: Image.Image, layer: Image.Image, cx: int, cy: int, scale: float, rotate: float = 0) -> None:
    layer = trim_alpha(layer)
    nw = max(1, int(layer.width * scale))
    nh = max(1, int(layer.height * scale))
    layer = layer.resize((nw, nh), Image.Resampling.LANCZOS)
    if rotate:
        layer = layer.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)
    base.paste(layer, (cx - layer.width // 2, cy - layer.height // 2), layer)


def make_bg(size: int) -> Image.Image:
    bg = Image.new("RGBA", (size, size), (26, 16, 48, 255))
    draw = ImageDraw.Draw(bg)
    draw.ellipse((size * 0.08, size * 0.08, size * 0.92, size * 0.92), fill=(48, 24, 78, 255))
    draw.ellipse((size * 0.20, size * 0.55, size * 0.80, size * 0.88), fill=(110, 55, 170, 55))
    return bg


def compose_team(size: int) -> Image.Image:
    canvas = make_bg(size)
    cx = size // 2
    cy = int(size * 0.58)
    xs = [cx - int(size * 0.28), cx - int(size * 0.14), cx, cx + int(size * 0.14), cx + int(size * 0.28)]
    for i, name in enumerate(HELPERS):
        path = IMG / name
        if path.exists():
            paste_scaled(canvas, load_rgba(path), xs[i], cy, 0.16 * (size / 1024))
    return canvas


def compose_icon(api: str, title: str, spec, size: int) -> Image.Image:
    canvas = make_bg(size)
    cx, cy = size // 2, int(size * 0.52)
    if api == "ACH_FULLTEAM":
        return compose_team(size)
    if api == "ACH_CENTURION":
        paste_scaled(canvas, load_rgba(IMG / "chef.png"), cx, cy, 0.44 * (size / 1024))
        draw = ImageDraw.Draw(canvas)
        txt = "100"
        font_size = max(24, size // 8)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()
        tw = draw.textlength(txt, font=font) if hasattr(draw, "textlength") else font_size * 2
        draw.text((cx - tw / 2, size * 0.08), txt, fill=(255, 220, 80, 255), font=font)
        return canvas
    if api == "ACH_AWAKENED5":
        paste_scaled(canvas, load_rgba(IMG / "angel.png"), cx, cy, 0.40 * (size / 1024))
        draw = ImageDraw.Draw(canvas)
        txt = "×5"
        font_size = max(20, size // 10)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()
        draw.text((size * 0.62, size * 0.12), txt, fill=(255, 255, 255, 230), font=font)
        return canvas
    if spec:
        path, scale, rot = spec
        if path.exists():
            paste_scaled(canvas, load_rgba(path), cx, cy, scale * (size / 1024), rot)
    return ImageEnhance.Contrast(canvas).enhance(1.06)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for api, title, spec in ACHIEVEMENTS:
        master = compose_icon(api, title, spec, 1024)
        hi = OUT / f"{api}_1024.png"
        lo = OUT / f"{api}_64.png"
        master.save(hi, "PNG", optimize=True)
        master.resize((64, 64), Image.Resampling.LANCZOS).save(lo, "PNG", optimize=True)
        print(f"OK {api} -> {hi.name}, {lo.name}")
    readme = OUT / "README.txt"
    readme.write_text(
        "Upload to Steamworks → Stats & Achievements:\n"
        "  *_64.png  = achievement icon (64×64)\n"
        "  *_1024.png = large icon (optional)\n",
        encoding="utf-8",
    )
    print(f"\n==> {len(ACHIEVEMENTS)} achievements in {OUT}")


if __name__ == "__main__":
    main()
