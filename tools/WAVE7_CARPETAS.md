# Wave 7 — Realm Ruckus (440 amuletos)

> **Staging only** hasta OK del creador. **NO** subir a `assets/skins`, catálogo ni remoto sin orden explícita.

## Meta respecto a 1000

| Estado | Cantidad |
|--------|----------|
| Publicados hoy (catalog) | **494** |
| Faltan para 1000 | **506** |
| Wave 6 en transparente (revisión) | **440** → llegarías a **934** |
| Tramo final a 1000 tras Wave 6 | **~66 amuletos** (≈2 packs de Wave 7) |
| Wave 7 manifiesto completo | **440** (11 packs) |

Tras publicar Wave 6 + Wave 5 pendiente en transparente (~360) superas 1000 con margen. Wave 7 es la reserva temática para completar el hito y seguir creciendo.

## Carpetas

```
D:\SmallCreek Originales HD\
  Wave7_incoming\{pack}\      ← ORIGINAL con fondo (blanco)
  Wave7_transparente\{pack}\  ← TRANSPARENTE para revisión
```

Manifiesto: `tools/wave7_realm_ruckus.json`  
Generar scaffold: `python tools/generate-wave7-scaffold.py`  
Crear subcarpetas: `python -c "from wave7_paths import ensure_pack_dirs; ensure_pack_dirs()"`

## Packs (11 × 40 = 440)

| Carpeta | Título ES |
|---------|-----------|
| `winter_wonderland` | Invierno Maravilla |
| `desert_dunes` | Dunas del Desierto |
| `pirate_plunder` | Pillaje Pirata |
| `ninja_noodle` | Ninja Fideo |
| `vampire_vogue` | Moda Vampiro |
| `fairy_glade` | Claro de Hadas |
| `steampunk_soup` | Sopa Steampunk |
| `detective_clue` | Detective Pista |
| `wild_west_wacky` | Lejano Oeste Loco |
| `prehistoric_silly` | Prehistoria Tonta |
| `tv_studio_chaos` | Caos Estudio TV |

## Pipeline (cuando empiece generación)

Mismas reglas que Wave 5/6: caos kawaii, props ON body, **sin peluca**, fondo blanco 768×512, Ivan sentado como Bongo, 40 camisas únicas por pack.

```powershell
python tools/generate_wave7_roster.py <pack> roster-status
# generar PNG en CURSOR_ASSETS
python tools/generate_wave7_roster.py <pack> build-roster
python tools/process_wave7_skin.py --review-only <pack>/pio_common_snowflake.png
python tools/process_wave7_pack.py <pack>
python tools/validate_wave7_concepts.py <pack>
# Tras OK creador:
python tools/integrate_wave7_pack_assets.py <pack>
python tools/integrate_wave7_pack_assets.py <pack> --drop-live
python tools/build_atlas_manifest.py
```

Tablas de accesorios (`_pack_theme_tables_wave7.py`) y `wave7_roster_common.py` se añaden **pack a pack** al arrancar arte (igual que Wave 6).

## Estado

| Pack | incoming | transparente | en juego |
|------|----------|--------------|----------|
| `winter_wonderland` | 40 | 40 | 0 | listo revisión — 40/40 framing OK |
| `desert_dunes` | 40 | 40 | 40 | **integrado** staging `dropLive:false` |
| *(resto)* | 0 | 0 | 0 | cola |
