# Skullchef — iOS desde Mac (checklist de hoy)

La **subida a App Store** solo se puede hacer en **Mac + Xcode**. Desde Windows preparamos el ZIP; en el Mac ejecutas el script.

---

## ZIP listo (Windows)

**`D:\SmallCreek Game\dist-mac\skullchef-mac.zip`** (build-39 + AdMob)

En Mac: descomprime → `~/Downloads/skullchef-mac` (o donde quieras).

---

## Parte 1 — AdMob (15 min, en el navegador)

1. https://admob.google.com → crear cuenta / iniciar sesión  
2. **Apps → Añadir app → iOS**  
3. Bundle ID: **`com.smallcreek.skullchefapp`**  
4. Crear unidad **Rewarded**  
5. Copiar **App ID** (ca-app-pub-…~…) y **Rewarded Ad Unit ID** (ca-app-pub-…/…)  
6. En el proyecto Mac, editar **`admob.config.json`**:
   - Pegar tus IDs en `ios.appId` y `ios.rewardedAdUnitId`
   - `"isTesting": false` antes de subir a revisión (usa `true` solo mientras pruebas)

Guía completa: **`docs/ADMOB_SETUP.md`**

---

## Parte 2 — Mac + Xcode (30 min)

### Instalar (solo la primera vez)

- **Node.js LTS**: https://nodejs.org  
- **Xcode** (App Store) → abrir → aceptar licencia  
- Terminal: `xcode-select --install`

### Script automático

```bash
cd ~/Downloads/skullchef-mac
chmod +x tools/setup-ios-mac.sh tools/patch-ios-admob-plist.sh
./tools/setup-ios-mac.sh
npx cap open ios
```

Instala Capacitor + AdMob, crea `ios/`, copia `www/`, parchea `Info.plist`.

### Xcode

1. **Signing & Capabilities** → Team = tu cuenta Developer  
2. **Bundle ID**: `com.smallcreek.skullchefapp`  
3. Conecta **iPhone** → **Run ▶**  
4. Prueba: menú lateral → **🎁 Watch ad** (debe cargar anuncio)  
5. **Product → Archive → Distribute → App Store Connect**

---

## Parte 3 — App Store Connect

https://appstoreconnect.apple.com

| Campo | Valor |
|-------|--------|
| Nombre | Skullchef |
| Bundle ID | com.smallcreek.skullchefapp |
| Privacidad | https://hunhau.github.io/smallcreek-skullchef/privacy.html |
| **Contiene anuncios** | **Sí** (recompensados) |
| Desarrollador | SmallCreek |

**Notas para revisión** (inglés):

> Rewarded ads (Google AdMob). Tap 🎁 → Watch ad for optional in-game bonuses. No login, no IAP. Privacy: https://hunhau.github.io/smallcreek-skullchef/privacy.html

---

## Errores frecuentes

| Problema | Solución |
|----------|----------|
| Signing error | Xcode → Settings → Accounts → Apple ID |
| `pod install` falla | `cd ios/App && pod install` |
| Anuncio no carga | iPhone real (no simulador); revisar `admob.config.json`; consentimiento GDPR |
| Pantalla negra | `npx cap sync ios` otra vez |

---

## Web (GitHub Pages)

El repo en GitHub usa `BUILD_TARGET = 'web'`. El ZIP de Mac usa `'auto'` dentro del stage — no afecta la web pública.
