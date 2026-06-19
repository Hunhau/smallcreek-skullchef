"""Align full open-mouth chef to chef.png canvas (1024x1656)."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
CHEF = os.path.join(IMG, "chef.png")
GEN = os.path.join(IMG, "chef-mouth-open-gen.png")
OUT = os.path.join(IMG, "chef-mouth-open.png")
PREVIEW = os.path.join(IMG, "_chef_mouth_preview.png")


def rembg(im):
    try:
        from rembg import remove
        return remove(im)
    except Exception:
        return im


def bbox(im):
    return im.getbbox() or (0, 0, im.size[0], im.size[1])


def align_to_chef(chef, src):
    chef = chef.convert("RGBA")
    src = src.convert("RGBA")
    cb = bbox(chef)
    sb = bbox(src)
    cw, ch = cb[2] - cb[0], cb[3] - cb[1]
    sw, sh = sb[2] - sb[0], sb[3] - sb[1]
    scale = min(cw / sw, ch / sh)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    resized = src.crop(sb).resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", chef.size, (0, 0, 0, 0))
    ox = cb[0] + (cw - nw) // 2
    oy = cb[1] + (ch - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def build():
    chef = Image.open(CHEF)
    src = rembg(Image.open(GEN))
    aligned = align_to_chef(chef, src)
    aligned.save(OUT, "PNG")
    preview = Image.alpha_composite(chef.convert("RGBA"), aligned)
    preview.save(PREVIEW, "PNG")
    print("saved", OUT, "bbox", aligned.getbbox())


if __name__ == "__main__":
    build()
