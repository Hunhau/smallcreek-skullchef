"""Build mouth-only delta overlay aligned 1:1 with chef.png (1024×1656)."""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
CHEF = os.path.join(IMG, "chef.png")
GEN = os.path.join(IMG, "_rejected_chef_mouth", "chef-mouth-open-gen.png")
ALIGNED = os.path.join(IMG, "_tmp_open_aligned.png")
DELTA_OUT = os.path.join(IMG, "chef-mouth-delta.png")
OUT = os.path.join(IMG, "chef-mouth-open.png")
PREVIEW = os.path.join(IMG, "_chef_mouth_preview.png")

SHIFT_X = 0
MASK_Y0 = 520
MASK_Y1 = 690
MASK_X0 = 395
MASK_X1 = 635
DILATE = 6
DIFF_MIN = 12
WHITE_THRESH = 235


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
    ox = cb[0] + (cw - nw) // 2 + SHIFT_X
    oy = cb[1] + (ch - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def load_open_aligned(chef):
    if os.path.isfile(ALIGNED):
        im = Image.open(ALIGNED).convert("RGBA")
        if im.size == chef.size:
            return im
    if not os.path.isfile(GEN):
        raise FileNotFoundError(GEN)
    aligned = align_to_chef(chef, rembg(Image.open(GEN)))
    aligned.save(ALIGNED, "PNG")
    return aligned


def strip_white_fringe(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r > WHITE_THRESH and g > WHITE_THRESH and b > WHITE_THRESH:
                px[x, y] = (0, 0, 0, 0)
    return im


def mouth_dilated_mask(chef: Image.Image) -> set:
    chef = chef.convert("RGBA")
    cp = chef.load()
    w, h = chef.size
    mask = set()
    for y in range(MASK_Y0, MASK_Y1):
        for x in range(MASK_X0, MASK_X1):
            r, g, b, a = cp[x, y]
            if a < 128:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum < 90:
                mask.add((x, y))

    rad = DILATE * DILATE
    dilated = set()
    for x, y in mask:
        for dy in range(-DILATE, DILATE + 1):
            for dx in range(-DILATE, DILATE + 1):
                if dx * dx + dy * dy <= rad:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        dilated.add((nx, ny))
    return dilated


def build_delta(chef: Image.Image, open_m: Image.Image) -> Image.Image:
    chef = chef.convert("RGBA")
    open_m = open_m.convert("RGBA")
    cp = chef.load()
    op = open_m.load()
    dilated = mouth_dilated_mask(chef)

    out = Image.new("RGBA", chef.size, (0, 0, 0, 0))
    opx = out.load()
    for x, y in dilated:
        cr, cg, cb, ca = cp[x, y]
        if ca < 128:
            continue
        r, g, b, a = op[x, y]
        if a < 128:
            continue
        if abs(r - cr) + abs(g - cg) + abs(b - cb) < DIFF_MIN:
            continue
        if r > WHITE_THRESH and g > WHITE_THRESH and b > WHITE_THRESH and cr > WHITE_THRESH:
            continue
        opx[x, y] = (r, g, b, 255)

    return strip_white_fringe(out)


def build_full_open_sprite(chef: Image.Image, open_aligned: Image.Image) -> Image.Image:
    """Full 1024×1656 open-mouth sprite (aligned open character, same canvas as chef.png)."""
    open_m = open_aligned.convert("RGBA")
    if open_m.size != chef.size:
        raise ValueError(f"open aligned {open_m.size} != chef {chef.size}")
    return open_m


def alpha_stats(im: Image.Image):
    full = semi = any_a = 0
    for p in im.get_flattened_data():
        a = p[3]
        if a == 255:
            full += 1
        elif a > 0:
            semi += 1
        if a > 0:
            any_a += 1
    return full, semi, any_a


def main():
    chef = Image.open(CHEF)
    open_aligned = load_open_aligned(chef)
    delta = build_delta(chef, open_aligned)
    bbox_delta = delta.getbbox()
    full, semi, any_a = alpha_stats(delta)
    print("shift_x:", SHIFT_X)
    print("mask_y0:", MASK_Y0)
    print("delta bbox:", bbox_delta, "opaque px:", any_a)
    print("alpha255:", full, "semi:", semi)
    if semi:
        print("ERROR: semi-transparent pixels in delta overlay", file=sys.stderr)
        sys.exit(1)
    delta.save(DELTA_OUT, "PNG")
    full_open = build_full_open_sprite(chef, open_aligned)
    full_open.save(OUT, "PNG")
    full_open.save(PREVIEW, "PNG")
    print("saved delta", DELTA_OUT, "full open", OUT, "preview", PREVIEW)


if __name__ == "__main__":
    main()
