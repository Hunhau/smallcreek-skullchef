import os, re
ROOT = r'D:\SmallCreek Game'
skins = os.path.join(ROOT, 'assets', 'skins')
pngs = sorted(f for f in os.listdir(skins) if f.startswith('bongo_') and f.endswith('.png'))
C = open(os.path.join(skins, 'catalog.js'), encoding='utf-8').read()
ids = re.findall(r"id: '(bongo_[^']+)'", C)
print('pngs', len(pngs))
print('catalog', len(ids))
print('missing png:', [i for i in ids if not os.path.isfile(os.path.join(skins, i+'.png'))])
print('orphan png:', [p[:-4] for p in pngs if p[:-4] not in ids])

# coco parity
coco = re.findall(r"id: '(coco_[^']+)'", C)
print('coco', len(coco))

W1 = ['rapper','chef','dj','kraken','elder','galaxy']
W2 = ['utensils','detective','spacepirate','prism']
for label, sufs in [('w1',W1),('w2',W2)]:
    have = [s for s in sufs if any(i.endswith(s) or i.split('_',1)[1]==s for i in ids)]
    miss = [s for s in sufs if not any(i.endswith('_'+s) for i in ids)]
    print(f'bongo {label} missing vs coco parallel: {miss}')

W3M = ['soccer','ninja','pilot','guitarist','knight','zombie','corsair','robot']
miss3 = [s for s in W3M if not any(i.endswith('_'+s) for i in ids)]
print('mixed w3 missing:', miss3)
