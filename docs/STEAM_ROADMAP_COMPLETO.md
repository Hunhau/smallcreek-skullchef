# Skullchef — Roadmap Steam + Apple (todas las fases)

Guía unificada para publicar en **Steam** y **App Store** con logros Steam y mercado de amuletos.

| Plataforma | Estado cuenta | Build en repo |
|------------|---------------|---------------|
| **Apple** (iOS/iPad) | App Store Connect | `docs/SUBIR_A_APPLE_AHORA.md`, build Capacitor |
| **Steam** (Windows) | Partner aprobado (~100 USD pagado) | `tools/build-steam.ps1`, Electron + `BUILD_TARGET=steam` |
| **Web** (PWA) | GitHub Pages | `main` → auto-deploy |

---

## Resumen por fases Steam

| Fase | Qué | Cuándo | Repo / herramienta |
|------|-----|--------|-------------------|
| **0** | Launch v1 (juego completo, save local) | **Ahora** | `build-steam.ps1`, `STEAM_LAUNCH.md` |
| **1** | Logros Steam (overlay) | Con App ID real | `steam-backend.js`, `manifest/achievements.json` |
| **2** | Amuletos como items Steam (inventario) | Tras Fase 1 estable | `manifest/itemdefs.json` (~409 skins) |
| **3** | Community Market (vender amuletos) | App **publicada** + umbrales Valve | items `marketable: true` (~110) |
| **4** | Steam Cloud save (opcional) | Post-launch | `steamworks.js` → `cloud.*` |

**Apple en paralelo:** mismas builds web (`build-277+`); iOS usa `www/` vía `sync-www.ps1`. Steam no comparte binario con iOS.

---

## Fase 0 — Publicar v1 en Steam (sin SDK obligatorio)

### Checklist Steamworks (panel)

1. **Apps & Packages** → crear **Skullchef** → anotar **App ID**
2. **Depots** → Windows (64-bit)
3. **Store page** → assets (`docs/STEAM_STORE_LISTING.md`)
4. **Pricing** → gratis o precio deseado
5. **Steam Direct** → ya pagado ✓

### Build local

```powershell
cd "D:\SmallCreek Game"
.\tools\build-steam.ps1
```

Salida: `dist-steam/app/out/` (portable + installer + `win-unpacked` para SteamPipe).

Prueba rápida:

```powershell
.\tools\build-steam.ps1 -Run
```

### Subir a SteamPipe

1. Steamworks → **SteamPipe** → subir carpeta `win-unpacked` (o la que indique Valve para Electron)
2. Asignar build a rama **default** → **Preview** en tu cuenta
3. Verificar: juego arranca, save local, sin anuncios (correcto en Steam)

**v1 puede salir sin logros Steam** — el juego ya tiene logros y amuletos en guardado local.

---

## Fase 1 — Logros Steam

### Archivos del repo

| Archivo | Uso |
|---------|-----|
| `steam/manifest/achievements.json` | 9 logros → API names para el panel |
| `steam/achievements/*.png` | Iconos 64×64 y 1024×1024 (generar con script) |
| `steam/steam-backend.js` | Init `steamworks.js`, sync al cargar partida |
| `steam/preload.js` | Puente `window.steamworks` |
| `index.html` | `steamAchievementsProvider` + sync post-load |

### Setup automático

```powershell
.\tools\setup-steam-all.ps1 -AppId TU_APP_ID -Run
```

O paso a paso:

```powershell
# 1. Manifiestos + iconos
node tools/generate-steamworks-manifest.js
python tools/generate-steam-achievement-icons.py   # pip install pillow

# 2. App ID + SDK
.\tools\wire-steam-sdk.ps1 -AppId TU_APP_ID

# 3. Build y prueba con Steam abierto
.\tools\build-steam.ps1 -Run
```

### Panel Steamworks → Stats & Achievements

Por cada fila en `achievements.json`:

| Campo panel | Valor |
|-------------|-------|
| **API Name** | `apiName` (ej. `ACH_FIRSTCLICK`) |
| **Display Name** | `displayName_en` / ES |
| **Hidden** | `hidden` (solo `ACH_MYTHICCHARM`) |
| **Icon** | Subir PNG de `steam/achievements/ACH_*.png` |

### Probar logros

1. Steam cliente **abierto** y logueado
2. `steam/steam_appid.txt` = tu App ID (no 480 en producción)
3. Jugar → desbloquear logro in-game → overlay Steam debe mostrarlo
4. Al cargar save antiguo, `syncAfterLoad` re-sincroniza logros ya conseguidos

### Requisitos técnicos

- `steamworks.js` instalado en `steam/` (`wire-steam-sdk.ps1`)
- En build **release**: copiar DLLs de `node_modules/steamworks.js/sdk/redistributable_bin/win64/` junto al `.exe`
- Steam debe estar corriendo (init falla gracefully → juego sigue en modo local)

---

## Fase 2 — Amuletos como Steam Inventory

`steamworks.js` **no expone ISteamInventory** hoy. Opciones:

1. **Esperar** binding inventory en steamworks.js, o
2. **Greenworks** (legacy) solo para inventario, o
3. **Backend propio** con Steam Web API + servidor de juego

### Preparación ya hecha en repo

| Archivo | Contenido |
|---------|-----------|
| `steam/manifest/itemdefs.json` | ~409 item defs (`itemdefid`, `gameSkinId`, rareza) |
| `steamMarketProvider` en `index.html` | Activo cuando `inventoryReady === true` |
| `collectionProvider` lazy | Re-evalúa Steam vs local en cada drop |

### Panel Steamworks → Steam Economy

1. **Item Definitions** → importar / crear desde `itemdefs.json`
2. Por item: icono skin (`assets/skins/...`), `tradable`, `marketable` según rareza
3. **Item Tools** → generar schema JSON si Valve lo pide

### Cuando conectes inventario

En `steam/steam-backend.js`:

- `grantItem(item)` → `GrantPromoItems` / equivalente al dropear amuleto
- `getInventory()` → merge con `game.coll.items` al boot
- Poner `inventoryReady = true` tras primer sync OK

Hasta entonces: **misma experiencia que web** (colección local).

---

## Fase 3 — Community Market (mercado de amuletos)

Valve **no permite** mercado el día 1. Requisitos típicos:

- App **Released** (no solo Coming Soon)
- Steam Economy activa con items **marketable**
- Volumen mínimo de usuarios/transacciones (Valve revisa caso a caso)
- Solo items marcados `"marketable": true` en manifest (~legendary + superleg)

### Items marketables (borrador en manifest)

- `*_legendary_*` y `*_superleg_*` → `marketable: true`
- Common–epic → `marketable: false` (solo tradable in-game si aplica)

### Flujo jugador (cuando esté live)

1. Drop in-game → item en inventario Steam
2. Inventario Steam → "Vender en el mercado"
3. Otro jugador compra → Steam cobra comisión, tú recibes parte

**No implementar compras con dinero real fuera del flujo Steam** — Valve lo prohíbe para items marketables.

---

## Fase 4 — Steam Cloud (opcional)

`steamworks.js` incluye `cloud.readFile` / `cloud.writeFile`.

Estrategia sugerida:

- Clave: `soup_p_v17` (mismo save que local)
- Al boot: si Cloud más reciente → restaurar
- Tras `game.save()`: subir a Cloud (throttle 30 s)

No mezclar Cloud Steam con iCloud — plataformas separadas.

---

## Apple (paralelo a Steam)

| Tema | Doc / acción |
|------|----------------|
| Subir build iOS | `docs/SUBIR_A_APPLE_AHORA.md` |
| Sync web → iOS | `tools/sync-www.ps1` en Windows, archive en Mac |
| Anuncios AdMob | build-276+: countdown 3-2-1 + nativo |
| Logros | Game Center (futuro) — independiente de Steam |
| Amuletos / mercado | Solo in-game; **sin** mercado real en iOS (Guideline 3.1.1) |

**Misma lógica de juego**, distintos stores: Steam puede tener mercado; Apple no.

---

## Comandos rápidos

```powershell
# Web deploy (GitHub Pages)
.\tools\sync-www.ps1
# bump BUILD_V + version.json + sw.js, commit, push main

# Steam todo-en-uno
.\tools\setup-steam-all.ps1 -AppId TU_APP_ID -Build

# Solo regenerar manifiestos
node tools/generate-steamworks-manifest.js
```

---

## Orden recomendado (tu situación actual)

1. ✅ **Web build-277** — fix audio compra ayudantes móvil
2. **Apple** — probar iPad anuncios build-276+, resubmit si OK
3. **Steam Fase 0** — `build-steam.ps1`, subir depot, store page, preview
4. **Steam Fase 1** — App ID en `steam_appid.txt`, logros en panel, `-Run` test
5. **Launch Steam v1** (local charms OK)
6. **Fase 2–3** — Economy + mercado cuando la app esté publicada y estable

---

## Referencias

- `docs/STEAM_LAUNCH.md` — build y SteamPipe
- `docs/STEAMWORKS_PHASE2.md` — detalle logros + economy
- `docs/STEAM_STORE_LISTING.md` — textos y assets tienda
- `docs/STEAM_PRIMEROS_PASOS.md` — cuenta partner
- `docs/SUBIR_A_APPLE_AHORA.md` — App Store
