# Steam — primeros pasos (cuenta socio aprobada)

Ya tienes acceso a **Steamworks Partner**. Orden recomendado:

---

## 1. Completar perfil Steamworks (15–30 min)

1. Entra en https://partner.steamgames.com  
2. **Settings → Financial** — datos fiscales + cuenta bancaria (para cobros futuros)  
3. **Users & Permissions** — confirma que tu usuario tiene acceso a la app  

---

## 2. Pagar Steam Direct y crear la app (si aún no lo hiciste)

1. **Apps & Packages → Create new app**  
2. Nombre: **Skullchef**  
3. Paga **Steam Direct** (~100 USD, recuperable tras 1000 USD brutos)  
4. Anota tu **Steam App ID** (número, ej. `1234567`)

Guía completa: `docs/STEAM_LAUNCH.md`

---

## 3. Build Windows (en tu PC)

```powershell
cd "D:\SmallCreek Game"
.\tools\build-steam.ps1
```

Salida: `dist-steam\app\out\`

- `Skullchef x.x.x.exe` — portable (probar)  
- `Skullchef Setup x.x.x.exe` — instalador  
- Carpeta `win-unpacked\` — la que suele subirse al depot  

Prueba rápida:

```powershell
.\tools\build-steam.ps1 -Run
```

---

## 4. Subir build a Steam (SteamPipe)

En Steamworks → tu app → **SteamPipe → Builds**:

1. Crea un **depot** Windows si no existe  
2. Sube el contenido de `win-unpacked\` (o sigue el asistente de upload del partner site)  
3. Asigna el build a la rama **default** / **beta** para probar  

Documentación Valve: https://partner.steamgames.com/doc/sdk/uploading

---

## 5. Página de la tienda

| Campo | Valor |
|-------|--------|
| Nombre | Skullchef |
| Desarrollador | SmallCreek |
| Privacidad | https://hunhau.github.io/smallcreek-skullchef/privacy.html |

Assets (capsulas, capturas): `docs/STEAM_STORE_LISTING.md`

Logros Steam (opcional v1): manifiesto en `steam/manifest/achievements.json` — iconos en `docs/STEAM_ACHIEVEMENT_ICONS.md`

---

## 6. Qué NO hace falta el día 1

- Mercado comunitario de amuletos → Fase 2 (`docs/STEAMWORKS_PHASE2.md`)  
- SDK Steamworks nativo en el .exe → el juego ya funciona offline con guardado local  
- Anuncios → desactivados en build Steam (correcto)

---

## Resumen monetización

| Plataforma | Estado | Ingresos |
|------------|--------|----------|
| **Apple iOS** | build-276 en camino | AdMob rewarded |
| **Steam** | Cuenta OK → crear app + subir build | Venta del juego |
| **Web** | Publicada | Sin ingresos reales (sim ads) |
