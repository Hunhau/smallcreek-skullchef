# Wave 4 — Viral Kawaii / Meme Theme Packs

Scaffold only. **Do not bulk-generate art yet.** Uncomment rows in `assets/skins/catalog.js` only after PNG + WebP + thumb exist.

## Naming contract

```
{helper}_{rarity}_{suffix}.png
```

| Token | Values |
|---|---|
| `helper` | `pio`, `ivan`, `coco`, `bunny`, `bongo` |
| `rarity` | `common`, `uncommon`, `rare`, `epic`, `legendary`, `superleg` |
| `suffix` | **globally unique** — never reuse across helpers or waves |

Before adding a suffix, grep the repo:

```bash
rg "_suffix'" assets/skins/catalog.js
python tools/audit_skin_duplicates.py
```

## Art pipeline (per skin)

1. PNG source `768×512`, transparent, no baked aura (engine draws rarity glow).
2. `python tools/generate_skin_webp.py assets/skins/{id}.png`
3. Uncomment the matching line in `catalog.js`.
4. Re-run `python tools/audit_skin_duplicates.py --check-catalog`.

Lazy load is automatic: collection grid uses thumbs via `IntersectionObserver`; scene uses full WebP through `SkinAssetManager`.

---

## Pack A — Classic Memes (40 skins)

Viral meme icons, kawaii-styled for Skullchef helpers.

| Rarity | Suffix | EN name seed | ES name seed |
|---|---|---|---|
| common | `doge` | Doge | Doge |
| common | `nyancat` | Nyan Cat | Gato Arcoíris |
| uncommon | `grumpycat` | Grumpy Cat | Gato Gruñón |
| uncommon | `pepe` | Pepe | Pepe |
| rare | `wojak` | Wojak | Wojak |
| rare | `thisisfine` | This Is Fine | Todo Bien |
| epic | `distracted` | Distracted | Distraído |
| superleg | `megameme` | Mega Meme | Mega Meme |

Repeat each row for all five helpers (`pio_`, `ivan_`, `coco_`, `bunny_`, `bongo_`).

---

## Pack B — Chaos Food (40 skins)

Absurd food combos, slime drips, oversized props.

| Rarity | Suffix | EN | ES |
|---|---|---|---|
| common | `cheesequake` | Cheese Quake | Terremoto Queso |
| uncommon | `spicyslider` | Spicy Slider | Mini Hamburguesa Picante |
| uncommon | `bubbletea` | Bubble Tea | Té de Burbujas |
| rare | `ramenstorm` | Ramen Storm | Tormenta Ramen |
| rare | `syrupvolcano` | Syrup Volcano | Volcán de Jarabe |
| epic | `pizzatornado` | Pizza Tornado | Tornado Pizza |
| legendary | `feastgolem` | Feast Golem | Gólem Banquete |
| superleg | `cosmicbento` | Cosmic Bento | Bento Cósmico |

---

## Pack C — Internet Culture (40 skins)

Streamer / VTuber / glitch / lo-fi vibes.

| Rarity | Suffix | EN | ES |
|---|---|---|---|
| common | `lofigirl` | Lo-Fi Girl | Chica Lo-Fi |
| uncommon | `glitchcore` | Glitch Core | Glitch Core |
| uncommon | `emojihead` | Emoji Head | Cabeza Emoji |
| rare | `streamer` | Streamer | Streamer |
| rare | `vtuber` | VTuber | VTuber |
| epic | `viralclip` | Viral Clip | Clip Viral |
| legendary | `algorithm` | Algorithm | Algoritmo |
| superleg | `terminallyonline` | Terminally Online | Online Terminal |

---

## Pack D — Cursed Cute (40 skins)

Kawaii on the outside, unsettling on the inside — shareable “cursed” energy.

| Rarity | Suffix | EN | ES |
|---|---|---|---|
| common | `cursedtoast` | Cursed Toast | Tostada Maldita |
| uncommon | `teethy` | Teethy | Dientes |
| uncommon | `voidblob` | Void Blob | Bola del Vacío |
| rare | `wrongeyes` | Wrong Eyes | Ojos Raros |
| rare | `toomanyarms` | Too Many Arms | Demasiados Brazos |
| epic | `eldritchplush` | Eldritch Plush | Peluche Eldritch |
| legendary | `smilewide` | Smile Wide | Sonrisa Ancha |
| superleg | `uncannykawaii` | Uncanny Kawaii | Kawaii Inquietante |

---

## Pack E — Kawaii Overload (40 skins)

Pastel, stickers, sparkles, mochi — maximum cute for clips.

| Rarity | Suffix | EN | ES |
|---|---|---|---|
| common | `pastelcloud` | Pastel Cloud | Nube Pastel |
| uncommon | `sparklesticker` | Sparkle Sticker | Sticker Brillante |
| uncommon | `mochibounce` | Mochi Bounce | Rebote Mochi |
| rare | `plushpile` | Plush Pile | Montón Peluches |
| rare | `hearteyes` | Heart Eyes | Ojos Corazón |
| epic | `rainbowribbon` | Rainbow Ribbon | Cinta Arcoíris |
| legendary | `cutecore` | Cute Core | Cute Core |
| superleg | `hyperkawaii` | Hyper Kawaii | Hiper Kawaii |

---

## Pack F — Skullchef Meta (40 skins)

In-universe jokes: soup, cauldron, chef skull, kitchen chaos.

| Rarity | Suffix | EN | ES |
|---|---|---|---|
| common | `souplord` | Soup Lord | Señor Sopa |
| uncommon | `cauldronkid` | Cauldron Kid | Niño Caldero |
| uncommon | `bonebroth` | Bone Broth | Caldo de Hueso |
| rare | `skullemoji` | Skull Emoji | Emoji Calavera |
| rare | `ladlehero` | Ladle Hero | Héroe Cucharón |
| epic | `kitchenchaos` | Kitchen Chaos | Caos Cocina |
| legendary | `grandchef` | Grand Chef | Gran Chef |
| superleg | `skullchefgod` | Skullchef God | Dios Skullchef |

---

## Rollout checklist (when ready)

- [ ] Pick **one pack** + **one helper** as pilot (8 PNGs).
- [ ] Run duplicate audit — **zero** identical MD5 across helpers.
- [ ] Uncomment pilot block in `catalog.js`.
- [ ] Creator mode → **Unlock all charms** → verify lazy thumbs in collection grid.
- [ ] Ship pack-by-pack; never duplicate PNG bytes between helpers.

## Reserved / blocked suffixes

Do not reuse suffixes already in active catalog. Grep before naming:

```bash
rg "id: '[a-z]+_[a-z]+_" assets/skins/catalog.js | sed "s/.*_\\([a-z0-9]*\\)'.*/\\1/" | sort -u
```

Wave 3 examples already taken: `greenie`, `taco`, `donut`, `ninja`, `zombie`, `caped`, `milkshake`, etc.
