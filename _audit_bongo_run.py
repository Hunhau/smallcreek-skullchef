import hashlib, os, re
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(ROOT, 'assets', 'skins', 'catalog.js')
CATALOG = open(CATALOG_PATH, encoding='utf-8').read()

def hash_file(p):
    h = hashlib.md5()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def parse_bongo():
    pat = re.compile(r"\{ id: '(bongo_[^']+)'.*?img: '([^']+)'.*?name_en: '([^']+)'")
    return [(m.group(1), m.group(2), m.group(3)) for m in pat.finditer(CATALOG)]

def parse_helper(prefix):
    pat = re.compile(rf"\{{ id: '({prefix}[^']+)'")
    return [m.group(1) for m in pat.finditer(CATALOG)]

bongo = parse_bongo()
print('=== BONGO CATALOG ===')
print(f'Total entries: {len(bongo)}')
ids = [e[0] for e in bongo]
dup_ids = [i for i in set(ids) if ids.count(i) > 1]
print('Duplicate IDs:', dup_ids or 'none')
paths = [e[1] for e in bongo]
dup_paths = [p for p in set(paths) if paths.count(p) > 1]
print('Duplicate img paths:', dup_paths or 'none')

skins_dir = os.path.join(ROOT, 'assets', 'skins')
pngs = sorted(f for f in os.listdir(skins_dir) if f.startswith('bongo_') and f.endswith('.png'))
catalog_pngs = {os.path.basename(e[1]) for e in bongo}
orphans = [p for p in pngs if p not in catalog_pngs]
missing = [os.path.basename(e[1]) for e in bongo if not os.path.isfile(os.path.join(ROOT, e[1].replace('/', os.sep)))]

print(f'\nPNG files in assets/skins/: {len(pngs)}')
print('Orphans (PNG not in catalog):', orphans or 'none')
print('Missing (catalog refs no file):', missing or 'none')

hashes = defaultdict(list)
for p in pngs:
    hashes[hash_file(os.path.join(skins_dir, p))].append(p)
print('\n=== DUPLICATE BONGO PNG CONTENT ===')
found = False
for h, files in sorted(hashes.items(), key=lambda x: -len(x[1])):
    if len(files) > 1:
        found = True
        print(f'  {files}')
if not found:
    print('  none')

coco_pngs = sorted(f for f in os.listdir(skins_dir) if f.startswith('coco_') and f.endswith('.png'))
coco_hashes = {f: hash_file(os.path.join(skins_dir, f)) for f in coco_pngs}
bongo_hashes = {f: hash_file(os.path.join(skins_dir, f)) for f in pngs}
print('\n=== BONGO IDENTICAL TO COCO (same hash) ===')
cross = []
for bf, bh in sorted(bongo_hashes.items()):
    for cf, ch in coco_hashes.items():
        if bh == ch:
            cross.append((bf, cf))
            print(f'  {bf} == {cf}')
if not cross:
    print('  none')

print('\n=== HELPER COUNTS ===')
for prefix in ['pio', 'ivan', 'coco', 'bunny', 'bongo']:
    print(f'  {prefix}: {len(parse_helper(prefix + "_"))}')

# Check originals/staging
for sub in ['originals', '_staging', 'wave3', 'bongo']:
    d = os.path.join(skins_dir, sub)
    if os.path.isdir(d):
        files = [f for f in os.listdir(d) if 'bongo' in f.lower()]
        if files:
            print(f'\n=== STAGING {sub}/ ===')
            for f in files:
                print(f'  {f}')
