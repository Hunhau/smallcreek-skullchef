from PIL import Image
import os

p = r'D:\SmallCreek Game\assets\img'
for f in ['chef.png', 'chef-mouth-open.png']:
    fp = os.path.join(p, f)
    im = Image.open(fp)
    print(f, 'size=', im.size, 'mode=', im.mode)
    im = im.convert('RGBA')
    data = list(im.getdata())
    white = sum(1 for px in data if px[3] > 200 and px[0] > 240 and px[1] > 240 and px[2] > 240)
    print('  near-white opaque px:', white, '/', len(data))
    print('  alpha bbox:', im.getbbox())
