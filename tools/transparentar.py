# -*- coding: utf-8 -*-
# Quita el fondo por IA (rembg) a todas las skins *_hi.png y las guarda
# transparentes (alfa real) en assets/skins con el nombre correcto (sin _hi).
import os, glob, sys

try:
    from rembg import remove
    from PIL import Image
except Exception as e:
    print("ERROR importando rembg/PIL:", e)
    print("Instala con: python -m pip install rembg onnxruntime pillow")
    sys.exit(1)

SRC = r'C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets'
DST = r'D:\SmallCreek Game\assets\skins'
os.makedirs(DST, exist_ok=True)

files = sorted(glob.glob(os.path.join(SRC, '*_hi.png')))
print("Encontrados %d archivos *_hi.png" % len(files))

ok = 0
fail = 0
for f in files:
    name = os.path.basename(f)
    base = name[:-4]                 # quita .png
    if base.endswith('_hi'):
        base = base[:-3]             # quita _hi
    target = os.path.join(DST, base + '.png')
    try:
        img = Image.open(f).convert("RGBA")
        out = remove(img)            # IA: quita fondo -> alfa real
        out.save(target)
        ok += 1
        print("OK   %-34s -> %s.png" % (name, base))
    except Exception as e:
        fail += 1
        print("FALLO %-34s : %s" % (name, e))

print("")
print("=== Hecho. %d/%d procesados (fallos: %d) en %s ===" % (ok, len(files), fail, DST))
