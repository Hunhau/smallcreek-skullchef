from PIL import Image
import os

GEN = r"D:\SmallCreek Game\assets\img\chef-mouth-open-gen.png"
im = Image.open(GEN).convert("RGBA")
w, h = im.size
px = im.load()
bb = im.getbbox()
print("size", im.size, "bbox", bb)

# grid sample dark pixels
for yf in [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45]:
    y = int(h * yf)
    dark = []
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 128 and (0.299*r+0.587*g+0.114*b) < 60:
            dark.append(x)
    if dark:
        print(f"y={yf:.2f} dark span {min(dark)}-{max(dark)} width={max(dark)-min(dark)}")

# tight mouth bbox: bottom of skull only
xs, ys = [], []
y0, y1 = int(h * 0.24), int(h * 0.38)
x0, x1 = int(w * 0.35), int(w * 0.65)
for y in range(y0, y1):
    for x in range(x0, x1):
        r, g, b, a = px[x, y]
        if a > 128 and (0.299*r+0.587*g+0.114*b) < 70:
            xs.append(x); ys.append(y)
if xs:
    pad = 12
    box = (min(xs)-pad, min(ys)-pad, max(xs)+pad, max(ys)+pad)
    print("mouth box", box, "size", (box[2]-box[0], box[3]-box[1]))
    crop = im.crop(box)
    crop.save(r"D:\SmallCreek Game\assets\img\_mouth_crop_test.png")
