from PIL import Image
import os

IMG = r"D:\SmallCreek Game\assets\img"
chef = Image.open(os.path.join(IMG, "chef.png")).convert("RGBA")
mouth = Image.open(os.path.join(IMG, "chef-mouth-open.png")).convert("RGBA")

# Composite preview
preview = chef.copy()
preview.alpha_composite(mouth)
preview.save(os.path.join(IMG, "_chef_mouth_preview.png"))

# Strip fringe whites from overlay
px = mouth.load()
w, h = mouth.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 0 and r > 235 and g > 235 and b > 235:
            px[x, y] = (0, 0, 0, 0)
mouth.save(os.path.join(IMG, "chef-mouth-open.png"))
print("preview saved, fringe cleaned, bbox", mouth.getbbox())
