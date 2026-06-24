# Skullchef — Steamworks Fase 2 (logros + amuletos / mercado)

> **Roadmap completo (Fases 0–4 + Apple):** [`STEAM_ROADMAP_COMPLETO.md`](STEAM_ROADMAP_COMPLETO.md)

## Qué funciona HOY en la build Steam (v1.0.0)

| Feature | Estado |
|---------|--------|
| Juego completo (idle, farm, charms, prestigio) | ✅ Local |
| Amuletos: drops, colección, equipar | ✅ Guardado local |
| Logros in-game | ✅ Guardado local |
| Anuncios | ❌ Desactivados (correcto en Steam) |
| Logros Steam overlay | ⏳ Cableado en código — falta App ID real + panel + `wire-steam-sdk.ps1` |
| Mercado Steam / vender amuletos | ⏳ Fase 2 — requiere Economy + app publicada |

**Puedes publicar v1 en Steam** con colección local. Los jugadores juegan igual que en web.

---

## Qué NO se puede automatizar sin tu App ID

1. Crear la app en Steamworks (tú, en el panel)
2. Pagar Steam Direct (~100 USD)
3. Subir iconos de logros / items en el panel
4. **Mercado comunitario**: Valve exige app publicada y requisitos de economía (no day-one)

---

## Archivos preparados en el repo

| Archivo | Para qué |
|---------|----------|
| `steam/manifest/achievements.json` | 9 logros → nombres API para Steamworks |
| `steam/manifest/itemdefs.json` | ~36+ skins → borrador Item Definitions |
| `steam/steam_appid.txt.example` | Copiar a `steam_appid.txt` con tu App ID |
| `steam/preload.js` + `steam/steam-backend.js` | Puente Electron ↔ steamworks.js |
| `tools/setup-steam-all.ps1` | Manifiestos + iconos + SDK + build opcional |
| `tools/wire-steam-sdk.ps1` | Instala steamworks.js + steam_appid.txt |

Regenerar manifiestos:

```powershell
node tools/generate-steamworks-manifest.js
```

---

## Fase 2A — Logros Steam (cuando tengas App ID)

1. Steamworks → **Skullchef** → **Stats & Achievements** → **Achievements**
2. Por cada fila en `steam/manifest/achievements.json`, crea un logro:
   - **API Name** = columna `apiName` (ej. `ACH_FIRST_CLICK`)
   - **Display Name** = `displayName_en` / ES en localized
3. Copia `steam/steam_appid.txt.example` → `steam/steam_appid.txt` con tu número
4. Ejecutar `.\tools\wire-steam-sdk.ps1 -AppId TU_APP_ID` (instala steamworks.js)
5. `steam/preload.js` + `steam/steam-backend.js` ya exponen `window.steamworks`
6. Rebuild: `.\tools\build-steam.ps1 -Run` (Steam abierto)

El juego ya llama `achievementsProvider.unlock(k)` → activará Steam cuando exista el wrapper.

---

## Fase 2B — Amuletos como items Steam (post-launch)

1. Steamworks → **Steam Economy** → **Item Definitions**
2. Importar / crear items desde `steam/manifest/itemdefs.json`
   - `itemdefid` = ID numérico en Steam
   - `gameSkinId` = id del catálogo (`pio_rare_shades`, etc.)
3. Implementar en `steamMarketProvider`:
   - `GrantPromoItems` / `ConsumeItem` al dropear amuleto
   - Sync inventario Steam ↔ `game.coll.items`
4. **Community Market** (vender entre jugadores):
   - Solo tras app **publicada** y cumplir requisitos Valve
   - Items `marketable: true` en manifest = legendary/superleg only (borrador)

Hasta entonces `steamMarketProvider` delega en inventario local (mismo juego, sin dinero real).

---

## Orden recomendado

1. **Ahora:** Publicar v1 Steam (juego + charms locales) ← estás aquí
2. **Con App ID:** Logros Steam (2A)
3. **Tras launch estable:** Economy + mercado (2B)
