# Mobile launch guide — Google Play & App Store

Smallcreek Skullchef is a single-page web game (`index.html`). Three viable store paths:

| Path | Best for | Effort | Offline |
|------|----------|--------|---------|
| **PWA + TWA** | Fastest Play Store listing | Low | Shell + cached assets |
| **Capacitor** | Full native wrapper (Play + App Store) | Medium | Full control |
| **PWA only (iOS)** | TestFlight-free beta via “Add to Home Screen” | Lowest | Same as PWA |

Recommended: **Capacitor** for App Store + Play Store with one codebase; **TWA** if you only need Android first.

---

## Current mobile readiness (repo)

| Item | Status |
|------|--------|
| `manifest.webmanifest` | ✅ landscape standalone PWA |
| Icons 192 / 512 / maskable / apple-touch | ✅ `assets/icons/` |
| Viewport + `viewport-fit=cover` | ✅ `index.html` |
| Safe-area insets (`env(safe-area-inset-*)`) | ✅ HUD, home, overlays |
| Touch / pointer stir | ✅ `#main-stage` `onpointerdown`, `touch-action` tuned |
| Quality presets (auto → low on phones) | ✅ `quality.detectAuto()` |
| Skin lazy load (LRU, mobile limits) | ✅ `SkinAssetManager` |
| Service worker | ✅ `sw.js` (offline shell) |
| Privacy policy | ✅ `privacy.html` |
| Version | ✅ `version.json` + `BUILD_V` in `index.html` + `package.json` |
| Capacitor config | ✅ `capacitor.config.json` (scaffold) |

---

## Production build flags

Before any store upload, edit **one block** at the top of `index.html` (search `BUILD TARGET`):

```javascript
var BUILD_TARGET_OVERRIDE = 'auto';  // or 'android' / 'ios' explicitly
var PRODUCTION_BUILD = true;         // disables creator-only dev tools
```

| Flag | Store build | Dev / itch |
|------|-------------|------------|
| `BUILD_TARGET_OVERRIDE` | `'auto'`, `'android'`, or `'ios'` | `'web'` |
| `PRODUCTION_BUILD` | `true` | `false` |

Bump **both** on every release:

- `version.json` → `{ "v": "build-10" }`
- `index.html` → `const BUILD_V = "build-10";`
- `sw.js` → `const CACHE_VERSION = 'build-10';`
- `package.json` → `"version": "1.0.1"` (semver for stores)

---

## Icons & splash screens checklist

### Required icons (already in repo)

| Asset | Size | Path |
|-------|------|------|
| Launcher | 192×192 | `assets/icons/icon-192.png` |
| Launcher | 512×512 | `assets/icons/icon-512.png` |
| Maskable | 512×512 | `assets/icons/icon-512-maskable.png` |
| Apple touch | 180×180 | `assets/icons/apple-touch-icon.png` |

### Splash screens to generate (Capacitor / native)

Capacitor `SplashScreen` plugin expects drawable assets per density. Create **portrait + landscape** if you support both orientations (game is landscape-first but portrait is playable).

| Platform | Sizes (px) | Notes |
|----------|------------|-------|
| **Android** | 480×800, 720×1280, 1080×1920, 1440×2560 | `android/app/src/main/res/drawable-*` after `cap add android` |
| **iOS** | 2048×2732 (universal storyboard) | LaunchScreen.storyboard or Assets.xcassets |
| **PWA** | Uses `background_color` + `theme_color` in manifest (`#1a1030`) + first paint of `index.html` |

Splash art tip: centered `assets/img/angel.png` on `#1a1030` background, title “Skullchef”.

### Store listing graphics (not in repo — prepare separately)

- **Feature graphic** (Play): 1024×500
- **Screenshots**: phone 1080×1920 or 1920×1080 landscape (game is landscape-first)
- **App icon**: reuse 512×512 PNG

---

## Path A — PWA + Android TWA (Trusted Web Activity)

1. Host the game over **HTTPS** (GitHub Pages, Cloudflare, Firebase Hosting, etc.).
2. Verify Lighthouse PWA checks (manifest, SW, icons).
3. Create a minimal Android Studio project with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) or `@nicolo-ribaudo/twa-manifest`:
   ```bash
   npx @bubblewrap/cli init --manifest https://YOUR_DOMAIN/manifest.webmanifest
   ```
4. Set `digital_asset_links.json` on your domain for `/.well-known/assetlinks.json`.
5. Upload signed AAB to Google Play Console.
6. Privacy policy URL: `https://YOUR_DOMAIN/privacy.html`

**Pros:** No WebView maintenance; instant web deploys update users.  
**Cons:** iOS has no TWA equivalent — use Capacitor or PWA “Add to Home Screen”.

---

## Path B — Capacitor (recommended for Play + App Store)

### One-time setup

```bash
cd "D:\SmallCreek Game"
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Skullchef" com.smallcreek.skullchef --web-dir .
npx cap add android
npx cap add ios
```

`capacitor.config.json` is already scaffolded. After `cap add`, sync:

```bash
# Set production flags in index.html first
npx cap sync
npx cap open android   # Android Studio → Build → Generate Signed Bundle
npx cap open ios       # Xcode → Archive → App Store Connect
```

### Store-specific steps

**Google Play**

1. Google Play Console → Create app.
2. Upload **AAB** (Android App Bundle).
3. Content rating questionnaire, target audience, ads declaration (rewarded ads stub exists).
4. Privacy policy: host `privacy.html` and paste URL.
5. Set `BUILD_TARGET_OVERRIDE` to `'android'` or `'auto'`.

**Apple App Store**

1. Apple Developer account + App ID `com.smallcreek.skullchef`.
2. Xcode: signing, capabilities, **Portrait + Landscape** (game supports both).
3. `Info.plist`: `UIViewControllerBasedStatusBarAppearance`, safe areas (Capacitor handles most).
4. App Privacy labels: local storage, optional network (leaderboard).
5. Upload via Xcode Organizer or Transporter.
6. Set `BUILD_TARGET_OVERRIDE` to `'ios'` or `'auto'`.

### Optional native plugins (post-MVP)

- `@capacitor-community/admob` — **wired** for rewarded ads on iOS/Android. See `docs/ADMOB_SETUP.md`.
- `@capacitor/status-bar` / `@capacitor/splash-screen` — already referenced in config.

---

## Path C — iOS PWA (no App Store)

Users: Safari → Share → **Add to Home Screen**.  
`apple-mobile-web-app-capable` and `apple-touch-icon` are already set.  
Fullscreen on iOS **requires** this path (no Fullscreen API in Safari).

---

## Pre-upload checklist

- [ ] `PRODUCTION_BUILD = true`
- [ ] `BUILD_TARGET_OVERRIDE` = `'auto'` / `'android'` / `'ios'`
- [ ] Version bumped in `version.json`, `BUILD_V`, `sw.js`, `package.json`
- [ ] `privacy.html` reviewed; URL live on production host
- [ ] Icons 192 + 512 + maskable present and referenced in manifest
- [ ] Splash assets added (Capacitor/native builds)
- [ ] Test on real device: stir tap, shop, prestige, collection skins, pause menu
- [ ] Test offline: airplane mode → game shell loads from SW
- [ ] Leaderboard: fails gracefully offline (already stubbed)
- [ ] Remove or exclude dev assets (`assets/img/_*`, `tools/`, audit scripts) from store bundle
- [ ] Playables build: use separate `BUILD_TARGET_OVERRIDE = 'playables'` (not for stores)

---

## Testing locally

```bash
npm run serve
# Open http://localhost:5173 — use Chrome DevTools device mode
# Application → Service Workers → verify sw.js active
```

On phone (same Wi‑Fi): use your PC LAN IP, **must be HTTPS or localhost** for SW on some browsers.

---

## Playables vs mobile stores

YouTube Playables uses `BUILD_TARGET = 'playables'` and `ytPlayables` SDK hooks. **Do not** ship that build to Play/App Store. Use `web` / `android` / `ios` targets instead.

---

## Support contacts in listing

- Privacy: `privacy.html`
- Version displayed: sync `package.json` semver with store listing “What’s New”
