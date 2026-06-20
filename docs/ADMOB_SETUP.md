# AdMob — monetización iOS / Android (Skullchef)

Skullchef usa **anuncios recompensados** (ver anuncio → bonus en el juego). Los ingresos los paga **Google AdMob** a SmallCreek; Apple no cobra comisión por anuncios.

## Antes de subir a App Store (obligatorio)

1. Crear cuenta en [AdMob](https://admob.google.com).
2. Añadir app **iOS** → Bundle ID `com.smallcreek.skullchef` (debe coincidir con App Store Connect y Xcode).
3. Crear unidad **Rewarded** → copiar **App ID** y **Ad unit ID**.
4. Copiar `admob.config.example.json` → `admob.config.json` y pegar tus IDs reales.
5. Poner `"isTesting": false` antes del envío a revisión.
6. En **App Store Connect** → declarar **Sí, contiene anuncios** (recompensados).

IDs de prueba de Google (solo desarrollo): ver comentarios en `admob.config.example.json`.

## Setup en Mac (iOS)

```bash
cd ~/Downloads/skullchef-mac   # o tu carpeta del proyecto
cp admob.config.example.json admob.config.json   # si no existe
# Edita admob.config.json con tus IDs de AdMob

chmod +x tools/setup-ios-mac.sh tools/patch-ios-admob-plist.sh
./tools/setup-ios-mac.sh
```

El script instala `@capacitor-community/admob`, sincroniza `www/` y parchea `Info.plist` con tu App ID.

Probar en iPhone físico (los simuladores a veces no muestran anuncios reales):

```bash
npx cap open ios
# Xcode → Run en tu iPhone
```

En el juego: botón **🎁 Watch ad** en el menú lateral → debe abrir un vídeo de AdMob (o anuncio de prueba si `isTesting: true`).

## App Store Connect — notas para revisión

> Rewarded ads (Google AdMob) are integrated. Tap the 🎁 side button → "Watch ad" for optional in-game bonuses. No in-app purchases. No login required. Privacy: https://hunhau.github.io/smallcreek-skullchef/privacy.html

## GDPR / consentimiento (UE)

AdMob puede mostrar el formulario de consentimiento (UMP) la primera vez. Si en pruebas rechazas cookies/consentimiento, los anuncios pueden no cargar; en producción es normal.

## Ingresos

- Más jugadores + más anuncios vistos = más ingresos (CPM variable, suele ser modesto al principio).
- AdMob paga cuando superas el umbral mínimo (transferencia bancaria / PayPal según país).

## Web / Steam / Playables

- **Web (GitHub Pages):** anuncios simulados de prueba (no generan ingresos).
- **Steam:** sin anuncios.
- **YouTube Playables:** SDK de YouTube, no AdMob.
