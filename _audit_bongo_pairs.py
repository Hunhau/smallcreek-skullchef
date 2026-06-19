import hashlib, os

ROOT = r'D:\SmallCreek Game\assets\skins'

def h(f):
    p = os.path.join(ROOT, f)
    if not os.path.isfile(p):
        return None
    m = hashlib.md5()
    with open(p, 'rb') as x:
        for c in iter(lambda: x.read(65536), b''):
            m.update(c)
    return m.hexdigest()

pairs = [
    ('bongo_rare_ninja.png', 'bongo_uncommon_stealth.png'),
    ('bongo_rare_pilot.png', 'bongo_epic_cosmonaut.png'),
    ('bongo_epic_guitarist.png', 'bongo_rare_dj.png'),
    ('bongo_legendary_corsair.png', 'bongo_epic_spacepirate.png'),
    ('bongo_superleg_robot.png', 'bongo_epic_mech.png'),
    ('bongo_uncommon_chef.png', 'bongo_common_sushi.png'),
    ('bongo_uncommon_utensils.png', 'bongo_epic_takoyaki.png'),
    ('bongo_rare_detective.png', 'bongo_rare_masked.png'),
    ('bongo_rare_dj.png', 'bongo_epic_guitarist.png'),
    ('bongo_legendary_elder.png', 'bongo_legendary_warlord.png'),
]

removed = [
    'bongo_uncommon_chef', 'bongo_rare_dj', 'bongo_legendary_elder',
    'bongo_uncommon_utensils', 'bongo_rare_detective',
    'bongo_rare_ninja', 'bongo_rare_pilot', 'bongo_epic_guitarist',
    'bongo_legendary_corsair', 'bongo_superleg_robot',
]

print('=== HASH PAIRS ===')
for a, b in pairs:
    ha, hb = h(a), h(b)
    same = ha == hb if ha and hb else 'missing'
    print(f'  {a} vs {b}: same={same}')

print('\n=== REMOVED FROM CATALOG — PNG exists? ===')
for id in removed:
    png = id + '.png'
    exists = os.path.isfile(os.path.join(ROOT, png))
    print(f'  {id}: png={exists}')

# webp/thumbs gaps
import re
C = open(r'D:\SmallCreek Game\assets\skins\catalog.js', encoding='utf-8').read()
ids = re.findall(r"id: '(bongo_[^']+)'", C)
print(f'\nCatalog: {len(ids)} entries')
for tier, ext, sub in [('webp', '.webp', ''), ('thumb', '.webp', 'thumbs/')]:
    miss = []
    for id in ids:
        p = os.path.join(ROOT, sub, id + ext) if sub else os.path.join(ROOT, id + ext)
        if not os.path.isfile(p):
            miss.append(id)
    print(f'Missing {tier}: {len(miss)} {miss[:5]}...' if len(miss) > 5 else f'Missing {tier}: {miss}')

orph = []
for f in os.listdir(ROOT):
    if f.startswith('bongo_') and f.endswith('.png'):
        if f[:-4] not in ids:
            orphan.append(f[:-4])
print(f'\nOrphan PNGs ({len(orph)}): {orph}')
