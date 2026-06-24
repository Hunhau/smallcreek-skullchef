# Subir Skullchef a App Store — guía rápida (build-276)

## En Windows (ya hecho o repetir antes de enviar al Mac)

```powershell
cd "D:\SmallCreek Game"
powershell -File tools\build-mac-transfer.ps1
node tools\verify-admob-config.js
```

**Salida:** `dist-mac\skullchef-mac.zip` (~proyecto completo listo para Mac).

Copia el ZIP al Mac (AirDrop, USB, nube).

---

## En Mac (una sola vez por ZIP nuevo)

Abre **Terminal**:

```bash
cd ~/Downloads/skullchef-mac   # carpeta descomprimida del ZIP
chmod +x tools/*.sh
./tools/setup-ios-mac.sh
bash tools/pre-archive-check.sh
```

Eso instala npm, crea `ios/`, copia `www/`, parchea AdMob + audio, instala iconos.

---

## Solo 3 pasos en Xcode

1. **Abrir proyecto**  
   `open ios/App/App.xcworkspace`

2. **Signing**  
   Target **App** → **Signing & Capabilities**  
   - Team = tu cuenta Apple Developer  
   - Bundle ID = `com.smallcreek.skullchef`  
   - **General** → Version **1.0.1**, Build **55** (o mayor que el último subido)

3. **Archive y subir**  
   - Selector de dispositivo: **Any iOS Device (arm64)**  
   - **Product → Archive**  
   - **Distribute App → App Store Connect → Upload**

---

## Anuncios (importante para Apple)

| Dónde | Qué pasa |
|-------|----------|
| Web / PWA | Simulador 3-2-1 (prueba local) |
| App nativa iOS | **3-2-1 “Anuncio”** → anuncio real AdMob → toast **“Recompensa concedida”** |

Config actual (`admob.config.json`):

- `isTesting: false` — IDs producción SmallCreek  
- `useFillFallback: true` — si no hay fill de producción, usa unidad test Google (común en 1ª revisión)

**Probar en iPad físico** (Apple rechazó en iPad Air 11"):

1. Instalación limpia (borrar app anterior)  
2. PLAY → activar 🔊 si está apagado (cuenta nueva)  
3. Columna **inferior izquierda** → **🎁 Ver anuncio** → elegir recompensa → **▶ Ver anuncio**  
4. Debe verse 3-2-1 → anuncio → recompensa  
5. Repetir: modal offline → **x2 (Ver anuncio)**

---

## App Store Connect

| Campo | Valor |
|-------|--------|
| Nombre | Skullchef |
| Bundle ID | com.smallcreek.skullchef |
| Contiene anuncios | **Sí** (recompensados) |
| Privacidad | https://hunhau.github.io/smallcreek-skullchef/privacy.html |

**Notas para revisión (inglés):**

> Rewarded ads (Google AdMob). Tap PLAY, enable sound if muted, then tap 🎁 Watch ad from the bottom-left menu. A short countdown appears, then the rewarded ad plays; completing it grants the in-game bonus. Offline welcome screen also offers x2 via Watch ad. No login, no IAP. Privacy: https://hunhau.github.io/smallcreek-skullchef/privacy.html

---

## Si algo falla

| Problema | Solución |
|----------|----------|
| `pre-archive-check.sh` error | Leer mensaje; suele ser `sync-www.sh` o Bundle ID |
| Anuncio no carga | iPhone/iPad real (no simulador); internet; ATT/UMP aceptados |
| Sin sonido | Cuenta nueva: pulsar 🔊 en inicio antes de jugar |
| Pantalla negra | `bash tools/sync-www.sh && npx cap sync ios` |

Más detalle: `docs/APP_STORE_REVIEW_ADS.md`, `docs/ADMOB_SETUP.md`
