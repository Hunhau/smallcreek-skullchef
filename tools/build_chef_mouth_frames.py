"""Align generated chef mouth frames to chef.png canvas (1024x1656)."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
CURSOR_ASSETS = r"C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets"
CHEF = os.path.join(IMG, "chef.png")
PREVIEW = os.path.join(IMG, "_chef_mouth_frames_preview.png")

GEN_SOURCES = [
    (0, os.path.join(CURSOR_ASSETS, "chef-mouth-0-gen.png")),
    (1, os.path.join(CURSOR_ASSETS, "chef-mouth-1-gen.png")),
    (2, os.path.join(CURSOR_ASSETS, "chef-mouth-2-gen.png")),
    (3, os.path.join(CURSOR_ASSETS, "chef-mouth-3-gen.png")),
]

def rembg(im):
    try:
        from rembg import remove
        return remove(im)
    except Exception:
        return im


def bbox(im):
    return im.getbbox() or (0, 0, im.size[0], im.size[1])


def strip_white_fringe(im, threshold=235):
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r > threshold and g > threshold and b > threshold:
                px[x, y] = (0, 0, 0, 0)
    return im


def has_opaque_white_bg(im, sample=48):
    im = im.convert("RGBA")
    w, h = im.size
    corners = [
        (x, y)
        for x in (0, w - 1, w // 2)
        for y in (0, h - 1, h // 2)
    ][:sample]
    white = 0
    opaque = 0
    for x, y in corners:
        r, g, b, a = im.getpixel((x, y))
        if a > 200:
            opaque += 1
            if r > 240 and g > 240 and b > 240:
                white += 1
    return opaque > 0 and white / max(opaque, 1) > 0.6


def align_to_chef(chef, src, target_bbox=None):
    """Scale source to fill chef content height; fixed top anchor for all frames."""
    chef = chef.convert("RGBA")
    src = src.convert("RGBA")
    if target_bbox is None:
        target_bbox = bbox(chef)
    tx0, ty0, tx1, ty1 = target_bbox
    tw, th = tx1 - tx0, ty1 - ty0
    sw, sh = src.size
    scale = th / sh
    nw, nh = max(1, int(sw * scale)), th
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", chef.size, (0, 0, 0, 0))
    ox = tx0 + (tw - nw) // 2
    oy = ty0
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def process_frame(chef, idx, src_path, target_bbox):
    out = os.path.join(IMG, f"chef-mouth-{idx}.png")
    if not os.path.isfile(src_path):
        raise FileNotFoundError(src_path)
    src = Image.open(src_path)
    if has_opaque_white_bg(src):
        src = rembg(src)
    aligned = align_to_chef(chef, src, target_bbox)
    aligned = strip_white_fringe(aligned)
    aligned.save(out, "PNG")
    im = aligned
    print(f"frame {idx}: aligned from {src_path}")

    alpha = sum(1 for p in im.getdata() if p[3] > 0)
    white = sum(1 for p in im.getdata() if p[3] > 200 and p[0] > 240 and p[1] > 240 and p[2] > 240)
    print(f"  -> {out} size={im.size} bbox={im.getbbox()} opaque={alpha} near_white={white}")
    return im


def main():
    chef = Image.open(CHEF).convert("RGBA")
    assert chef.size == (1024, 1656), chef.size
    target_bbox = bbox(chef)
    frames = []
    for idx, src in GEN_SOURCES:
        frames.append(process_frame(chef, idx, src, target_bbox))

    # Composite preview: chef + frame 2 (open) on top
    preview = chef.copy()
    preview.alpha_composite(frames[2])
    preview.save(PREVIEW, "PNG")
    print("preview saved", PREVIEW)


if __name__ == "__main__":
    main()
