# Skullchef — Steam launch guide

Desktop build for **Steam** using **Electron**. Separate from web, Playables, and mobile.

| Build | `BUILD_TARGET` | Output |
|-------|----------------|--------|
| Web (GitHub Pages) | `web` | Browser |
| YouTube Playables | `playables` | Zip |
| **Steam** | **`steam`** | **.exe (Windows)** |
| Android / iOS | `android` / `ios` | Capacitor |

---

## What is already done in code

- `BUILD_TARGET = 'steam'` disables rewarded ads (Steam has no AdMob).
- **Build Steam** (`.\tools\build-steam.ps1`) → portable + installer + `win-unpacked` for SteamPipe.
- Logros y amuletos **funcionan en juego** (guardado local).
- Adaptadores Steam listos: cuando conectes el SDK, se activan solos (`window.steamworks`).
- Manifiestos para el panel: `steam/manifest/achievements.json` (9 logros) + `itemdefs.json` (409 skins).
- Guía Fase 2 (logros Steam + mercado amuletos): **`docs/STEAMWORKS_PHASE2.md`**
- **Roadmap completo (0–4):** **`docs/STEAM_ROADMAP_COMPLETO.md`**
- Setup automático: `.\tools\setup-steam-all.ps1 -AppId TU_ID`

**Cableado en código (Fase 1):** logros vía `steamworks.js` cuando Steam está abierto + App ID real.

**Pendiente panel / Economy:** inventario Steam, mercado comunitario (Fases 2–3).

---

## Prerequisites (Windows)

1. **Node.js LTS** — https://nodejs.org  
2. **Steamworks partner account** — https://partner.steamgames.com  
   - **Steam Direct fee:** ~$100 USD per game (recoupable after $1000 gross).  
3. Tax/bank info in Steamworks when you create the app slot.

---

## 1. Build locally

From repo root (PowerShell):

```powershell
cd "D:\SmallCreek Game"
.\tools\build-steam.ps1
```

Output: `dist-steam/app/out/`

- `Skullchef x.x.x.exe` — portable  
- `Skullchef Setup x.x.x.exe` — installer  

**Quick test without packaging:**

```powershell
.\tools\build-steam.ps1 -Run
```

Or after a build:

```powershell
cd dist-steam\app
npm start
```

---

## 2. Create the Steam app (Steamworks)

1. Log in to **Steamworks** → **Apps & Packages** → **Create new app**.
2. App name: **Skullchef**
3. Note your **Steam App ID** (e.g. `480` is Sparta — yours will be different).

### Depots (Windows)

- Create a depot for **Windows** (default).
- Upload build with **SteamPipe** (Steamworks SDK `steamcmd` or GUI upload in partner site).

Typical layout uploaded to depot:

```
Skullchef.exe
resources/   (Electron packaged app)
```

Use the **portable** or **installer output** from `electron-builder`; for Steam, upload the **packed app folder** contents per Valve docs (often the whole `win-unpacked` folder from `out/`).

---

## 3. Store page checklist

| Asset | Spec |
|-------|------|
| Capsule header | 460×215 |
| Capsule main | 616×353 |
| Capsule vertical | 374×448 |
| Library hero | 3840×1240 |
| Screenshots | 1920×1080 (landscape) |
| Short description | ~300 chars |
| About / description | Full game text (EN; add ES if you want) |
| Privacy | https://hunhau.github.io/smallcreek-skullchef/privacy.html |

Developer name: **SmallCreek**

---

## 4. Steamworks integration (phase 2 — optional for v1)

When you have an **App ID**, wire native Steamworks:

1. Add `steamworks.js` or **greenworks** to `steam/` Electron shell.
2. Set `steam_appid.txt` with your App ID for local testing.
3. Implement in preload: `activateAchievement`, `setStat`, `storeStats`, Steam Cloud save.
4. Game stubs already exist in `index.html` (`steamAchievementsProvider`, `steamMarketProvider`).

Until then, the Steam build runs **offline/local save** like the web version.

---

## 5. Build vs other platforms

- **Never** upload the Playables zip to Steam.
- **Never** ship `BUILD_TARGET = 'playables'` to Steam.
- Web GitHub Pages stays on `BUILD_TARGET = 'web'`.
- Re-run `.\tools\build-steam.ps1` for each Steam release; bump `version.json`, `BUILD_V`, `sw.js`, and `steam/package.json` version together.

---

## 6. Review timeline

After upload + store page complete:

- **Steam review:** typically a few days to ~2 weeks.
- Fix build issues if Valve rejects (common: executable name, depots empty, missing build).

---

## Support links

- [Steamworks documentation](https://partner.steamgames.com/doc/home)
- [Steam Direct](https://partner.steamgames.com/doc/store/application)
- [Electron builder](https://www.electron.build/)
