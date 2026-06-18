import os, shutil
from PIL import Image

SKINS = r"D:\SmallCreek Game\assets\skins"
BACKUP = os.path.join(SKINS, "canva_masters")
MAXSIDE = 1024

NAMES = [
    "coco_common_beanie", "coco_uncommon_cap", "coco_rare_shades",
    "coco_epic_chain", "coco_legendary_drip", "coco_superleg_iced",
    "bunny_common_hoodie", "bunny_uncommon_cap", "bunny_rare_shades",
    "bunny_epic_cresthoodie", "bunny_legendary_drip", "bunny_superleg_iced",
]

os.makedirs(BACKUP, exist_ok=True)

print(f"{'file':28} {'old KB':>8} {'new KB':>8}  {'dims':>12}  alpha")
print("-" * 72)
for n in NAMES:
    src = os.path.join(SKINS, n + ".png")
    if not os.path.isfile(src):
        print(f"{n:28} MISSING")
        continue
    bak = os.path.join(BACKUP, n + ".png")
    if not os.path.exists(bak):
        shutil.copy2(src, bak)
    old_kb = os.path.getsize(src) / 1024
    im = Image.open(src)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    w, h = im.size
    scale = min(1.0, MAXSIDE / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    im.save(src, "PNG", optimize=True)
    new_kb = os.path.getsize(src) / 1024
    chk = Image.open(src)
    has_alpha = chk.mode == "RGBA" and chk.getextrema()[3][0] < 255
    print(f"{n:28} {old_kb:8.0f} {new_kb:8.0f}  {chk.size[0]}x{chk.size[1]:>6}  {'yes' if has_alpha else 'NO'}")
print("\nBackup de masters en:", BACKUP)
