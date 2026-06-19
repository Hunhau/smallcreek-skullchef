# Seasonal Themes — SmallCreek Skullchef

Plan de skins coleccionables por temporada. **Reglas de arte:** PNG transparente 768×512, sin aura/glow flotante, diseño único por ayudante (misma temática, silueta distinta por personaje).

**Ayudantes:** Pío (pato), Ivan (perro), Coco (mono), Bunny (conejo), Bongo (gorila).

**Pipeline existente:** arte PNG → `python tools/generate_skin_webp.py` → `.webp` + thumb. Integración masiva: patrón en `tools/_integrate_wave_skins.py`. Prompts piloto verano: `tools/seasonal_summer_pilot_catalog.json`.

---

## Fechas de evento (cuándo activar en juego)

| Temporada | Ventana recomendada | Notas |
|-----------|---------------------|-------|
| **Verano** | **1 jun – 31 ago** | Prioridad actual (hemisferio norte). |
| **Halloween** | **1 oct – 2 nov** | Incluye Noche de Brujas; extender 1–2 días post-31 oct. |
| **Navidad** | **1 dic – 6 ene** | Hasta Epifanía / Reyes. |

### Integración en el motor (pendiente)

Hoy `index.html` / colección usa todo `SKIN_CATALOG` sin filtro por fecha. Para limitar drops estacionales:

1. Añadir `season: 'summer' | 'halloween' | 'christmas'` (opcional) en entradas del catálogo.
2. En el motor de drops, filtrar por `isSeasonActive(season)` usando las fechas de arriba (UTC o zona del jugador).
3. Fuera de ventana: skins siguen en colección si ya se obtuvieron; no entran al pool de drop.

---

## Verano 2025 — Wave Seasonal (prioridad)

**Meta:** 8 temas × 5 ayudantes = **40 skins**.

| # | Tema | Sufijo ID | Rareza | Evitar duplicado |
|---|------|-----------|--------|------------------|
| 1 | Playa | `beach` | common | — |
| 2 | Helado / paleta | `popsicle` | uncommon | no usar `icecream` (ya en Bunny, Ivan) |
| 3 | Sol | `sunhat` | rare | distinto de `shades` (gafas genéricas) |
| 4 | Flotador piscina | `poolfloat` | uncommon | no usar `floatie` (Coco) |
| 5 | Surf | `surf` | epic | — |
| 6 | BBQ / parrilla | `bbq` | epic | — |
| 7 | Sandía | `watermelon` | legendary | — |
| 8 | Tropical / luau | `tropical` | superleg | — |

### Piloto (5 skins — solo Pío + Bongo)

Sin PNG aún; entradas comentadas en `catalog.js`. Prompts en `tools/seasonal_summer_pilot_catalog.json`.

| ID | EN | ES |
|----|----|-----|
| `pio_common_beach` | Pío · Beach Day | Pío · Día de Playa |
| `pio_uncommon_popsicle` | Pío · Popsicle | Pío · Paleta |
| `bongo_rare_sunhat` | Bongo · Sun Hat | Bongo · Sombrero de Sol |
| `bongo_epic_surf` | Bongo · Surfer | Bongo · Surfista |
| `pio_legendary_watermelon` | Pío · Watermelon | Pío · Sandía |

### Lista completa 40 — Verano (por ayudante)

Sufijos: `beach`, `popsicle`, `sunhat`, `poolfloat`, `surf`, `bbq`, `watermelon`, `tropical`.

**Pío:** `pio_common_beach`, `pio_uncommon_popsicle`, `pio_rare_sunhat`, `pio_uncommon_poolfloat`, `pio_epic_surf`, `pio_epic_bbq`, `pio_legendary_watermelon`, `pio_superleg_tropical`

**Ivan:** `ivan_common_beach`, `ivan_uncommon_popsicle`, `ivan_rare_sunhat`, `ivan_uncommon_poolfloat`, `ivan_epic_surf`, `ivan_epic_bbq`, `ivan_legendary_watermelon`, `ivan_superleg_tropical`

**Coco:** `coco_common_beach`, `coco_uncommon_popsicle`, `coco_rare_sunhat`, `coco_uncommon_poolfloat`, `coco_epic_surf`, `coco_epic_bbq`, `coco_legendary_watermelon`, `coco_superleg_tropical`

**Bunny:** `bunny_common_beach`, `bunny_uncommon_popsicle`, `bunny_rare_sunhat`, `bunny_uncommon_poolfloat`, `bunny_epic_surf`, `bunny_epic_bbq`, `bunny_legendary_watermelon`, `bunny_superleg_tropical`

**Bongo:** `bongo_common_beach`, `bongo_uncommon_popsicle`, `bongo_rare_sunhat`, `bongo_uncommon_poolfloat`, `bongo_epic_surf`, `bongo_epic_bbq`, `bongo_legendary_watermelon`, `bongo_superleg_tropical`

---

## Halloween 2025 — Prep (Oct)

**Meta:** 8 temas × 5 ayudantes = **40 skins** (stubs comentados en `catalog.js`).

| # | Tema | Sufijo | Rareza | Ya existe — no reutilizar |
|---|------|--------|--------|---------------------------|
| 1 | Calabaza | `pumpkin` | common | — |
| 2 | Fantasma | `ghost` | uncommon | — |
| 3 | Esqueleto | `skeleton` | rare | — |
| 4 | Momia | `mummy` | uncommon | — |
| 5 | Hombre lobo | `werewolf` | epic | — |
| 6 | Frankenstein | `frankenstein` | epic | — |
| 7 | Murciélago | `bat` | rare | — |
| 8 | Dulces / truco o trato | `trickortreat` | superleg | — |

**Conflictos actuales en catálogo:** `bunny_epic_witch`, `pio_epic_vampire`, `*_epic_zombie` / `ivan_common_zombie`, `bongo_epic_zombie` — no repetir esos sufijos.

### Lista por ayudante (Halloween)

**Pío:** pumpkin, ghost, skeleton, mummy, werewolf, frankenstein, bat, trickortreat  
**Ivan:** idem  
**Coco:** idem  
**Bunny:** idem  
**Bongo:** idem  

Patrón ID: `{helper}_{rarity}_{suffix}` — mismas rarezas que la tabla de temas.

---

## Navidad 2025 — Prep (Dic)

**Meta:** 8 temas × 5 ayudantes = **40 skins** (stubs comentados en `catalog.js`).

| # | Tema | Sufijo | Rareza | Ya existe — no reutilizar |
|---|------|--------|--------|---------------------------|
| 1 | Papá Noel | `santa` | common | — |
| 2 | Muñeco de nieve | `snowman` | uncommon | — |
| 3 | Elfo | `elf` | uncommon | — |
| 4 | Jengibre | `gingerbread` | rare | — |
| 5 | Cascanueces | `nutcracker` | epic | — |
| 6 | Corona / adviento | `wreath` | rare | — |
| 7 | Regalo | `giftbox` | legendary | — |
| 8 | Aurora / estrella polar | `northstar` | superleg | — |

**Conflictos:** `ivan_common_reindeer` — no usar sufijo `reindeer` en otros personajes (Ivan ya lo tiene).

### Lista por ayudante (Navidad)

**Pío:** santa, snowman, elf, gingerbread, nutcracker, wreath, giftbox, northstar  
**Ivan:** idem (excepto `reindeer` — reservado en Ivan base)  
**Coco, Bunny, Bongo:** idem  

---

## Checklist de producción

1. Generar PNG 768×512 transparente por skin.
2. `python tools/generate_skin_webp.py assets/skins/{id}.png`
3. Descomentar entrada en `assets/skins/catalog.js`.
4. (Futuro) Activar filtro `season` en motor de drops según fechas arriba.
