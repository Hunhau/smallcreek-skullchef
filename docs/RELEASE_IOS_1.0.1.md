# Skullchef iOS — Build 1.0.1 (definitiva, AdMob producción)

## Qué incluye build-41
- admob.config.json → isTesting: false, IDs reales iOS
- Icono AppIcon.appiconset en ios-app-icon/
- PRODUCTION_BUILD = true
- sync-www copia `audio/` → SFX del juego y farm en iOS/Android

## En Mac (orden exacto)

1. Descomprime skullchef-mac.zip (o git pull)
2. Copia icono:
   cp -R ios-app-icon/AppIcon.appiconset ios/App/App/Assets.xcassets/
   (si ya existe ios/, sustituye AppIcon.appiconset)
3. Scripts:
   chmod +x tools/*.sh
   bash tools/setup-ios-mac.sh
   bash tools/sync-www.sh
   bash tools/patch-ios-admob-plist.sh
   npx cap sync ios
   bash tools/pre-archive-check.sh
4. Xcode → App → General:
   Version = 1.0.1
   Build = 3 (o mayor que builds anteriores)
5. Product → Archive → Upload
6. App Store Connect → Actividad → exportación en build nueva
7. NO enlazar a 1.0 en revisión — dejar lista para 1.0.1 cuando aprueben

## Comprobar anuncios en iPhone
Menú 🎁 Watch ad → NO debe decir "Test Ad"

## Sonidos del juego (SFX / farm)
Los SFX viven en `audio/` (stir, buy, farm, etc.). El ambiente vive en `assets/audio/ambient/`.
`sync-www.sh` **debe** copiar ambas carpetas a `www/`. Si solo suena ambiente en iOS, vuelve a ejecutar `bash tools/sync-www.sh` y comprueba que exista `www/audio/stir1.mp3` antes de archivar.
