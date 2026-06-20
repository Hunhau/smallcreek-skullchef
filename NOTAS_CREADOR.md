# Notas de Creador · Smallcreek Skullchef

Documento privado para el creador. Resume las **herramientas de creador**, cómo activarlas y la **lista de tareas antes del lanzamiento**. No forma parte del juego; es solo tu chuleta.

---

## 1. Activar / desactivar el MODO CREADOR

El modo creador desbloquea las herramientas ocultas. Es invisible para los jugadores.

- **Atajo de teclado (lo más fácil):** `Ctrl + Shift + D` en cualquier momento (pantalla de inicio o dentro del juego).
- **Alternativa táctil:** **3 toques** seguidos (en menos de 3 s) sobre el título *"Smallcreek Skullchef"* de la pantalla de inicio.
- Sale un aviso **"Modo creador ON / OFF"**. Se desactiva igual.
- Guardado en `localStorage` con la clave `__sc_creator` = `'1'`.

> Antes del lanzamiento conviene hacer este gesto **más secreto** (que un jugador no lo descubra por casualidad), pero **conservarlo** para que tú puedas seguir usando las herramientas.

---

## 2. Herramienta de COLOCACIÓN de items  ·  CONSERVAR (permanente, solo creador)

Sirve para colocar cucharas, gorros y futuros utensilios (gorras de rapero, nuevas cucharas, etc.) sin tocar código. **No se borra**: queda oculta tras el modo creador.

**Cómo abrirla:**
1. Activa modo creador (ver arriba).
2. Entra al juego y **equipa** una cuchara o un gorro en **Charms**.
3. Abre el panel lateral **📺 Creator**.
4. Pulsa **"Ajustar posición: OFF" → "ON ✓"**. Aparece el panel abajo a la derecha.

**Controles (panel táctil + teclado):**

| Acción | Panel | Teclado |
|---|---|---|
| Mover | flechas ▲▼◀▶ | flechas |
| Paso fino / grande | botón **x1 / x10** | normal / `Shift` |
| Tamaño | **＋ / －** | `+` / `-` |
| Rotar | **⟲ / ⟳** | `[` / `]` |
| Cambiar cuchara/gorro | botón **⇄** | `Tab` |
| Copiar valores | **Copiar valores** | — |
| Reiniciar esa skin | **Reiniciar esta skin** | — |
| Cerrar | **✕** | — |

**Importante — fijar las posiciones para todos:**
Los ajustes se guardan en TU navegador (`localStorage`, clave `soup_skin_placement`). Para que valgan **para todos los jugadores**, pulsa **"Copiar valores"** y pega el JSON al asistente, que lo grabará en `PLACE_DEFAULTS` dentro de `index.html`.

---

## 3. Otras herramientas de creador

- **Reiniciar cucharas** (`creator.resetSpoons()`): des-equipa y quita las cucharas del álbum para volver a probar compras. **TEMPORAL — quitar antes del lanzamiento.**
- **Dar todos los charms** (grant-all-charms): te concede todas las skins para grabar vídeos/pruebas. **TEMPORAL — quitar antes del lanzamiento.**

---

## 4. Ranking (Supabase)

- **UUID de creador:** `1832ff16-5fec-4afd-b570-f950e19eb434`
- Estás fijado **#1** en los tres tableros (puntuación, prestigio, Grand Prix) con números creíbles de **prestigio 6** (score 12.000.000.000, prix_wins 120).
- **Para que el #1 sea efectivo en vivo:** ejecutar el archivo **`leaderboard/creator_top_rank.sql`** en el editor SQL de tu panel de Supabase.
- Nombres de marca **vetados** ("smallcreek", "skullchef" y variantes) para todos menos para ti (exención por UUID).
- Web pública del ranking: `leaderboard/index.html` (pendiente de desplegar, p. ej. GitHub Pages).

---

## 5. Cambios recientes ya aplicados

- **Chef calvo** como sprite base (`assets/img/chef.png`). Respaldo del de gorro en `assets/img/chef_hatted_backup.png`.
- **Gorro blanco común** (`chefhat_common_white`) en propiedad de **todos** los jugadores desde el inicio (sin equipar; el chef sale calvo por defecto).
- **6 gorros** regenerados con base recta, transparentes (alfa real), optimizados, en `assets/skins/`.

---

## 6. Checklist ANTES DEL LANZAMIENTO

**Ya hecho:**
- [x] Ejecutar `leaderboard/creator_top_rank.sql` en Supabase.  ✅
- [x] Fijar las 12 posiciones de cucharas/gorros en `PLACE_DEFAULTS`.  ✅
- [x] **Insignia de Creador** (👑) en el ranking (juego + web pública).  ✅
- [x] **Botón exportar/importar guardado + identidad** (en Ajustes / menú).  ✅
- [x] Suavizar el cambio de pestañas del ranking.  ✅
- [x] Chef calvo + gorro blanco en propiedad de todos + 6 gorros con base recta.  ✅

**BLOQUEANTES pendientes (de la auditoría):**
- [ ] **Quitar el "grant-all-charms"** del arranque — JUSTO antes de publicar (lo conservamos hasta entonces para vídeos promocionales).
- [ ] **Privacidad/consentimiento**: aviso de qué guarda Supabase (nombre+puntuación) antes de subir el nombre + enlace a política.
- [ ] **Constantes de build por plataforma** (`BUILD` / `PLATFORM`: web/playables/steam/android/ios) en vez de fijo `web`.
- [ ] **Playables cloud LOAD**: enganchar `cloudSave.load()` dentro de `game.load()` (ahora solo guarda, no restaura).
- [ ] **Verificar SDK de YouTube Playables** (nombres de métodos, firstFrameReady/gameReady, ads).
- [ ] **Shells nativos**: Capacitor + AdMob (Android/iOS), Steam (Electron/Steamworks).
- [ ] **Assets de tienda**: íconos, capturas, manifest, metadatos.

**IMPORTANTE pendiente:**
- [ ] Integrar **cloud save** de Steam/móvil (ahora solo plan).
- [ ] **Quitar** *reset spoons* (temporal) y los `console.log('[creator]…')`.
- [ ] **Conservar** la herramienta de colocación y el desbloqueo de creador (hacer el gesto más secreto).
- [ ] Desplegar la **web pública del ranking** (p. ej. GitHub Pages).
- [ ] **Tutorial/ayuda inicial** mínima (tocar caldero, tienda, menú).
- [ ] Import usa `secure.wrap`; avisar de guardado manipulado; revisar textos fijos EN/ES.
- [ ] **Medir peso total de assets** (excluir `originals/` y backups del build) para Playables/móvil.

**Conservar (ocultas):** herramienta de colocación + modo creador.
- [ ] Revisión final: sin errores, optimizado, copia de seguridad en GitHub.

---

## 4. iOS / App Store — ID canónico (no cambiar)

| Campo | Valor correcto |
|-------|------------------|
| **Bundle ID (App Store Connect + Xcode)** | `com.smallcreek.skullchef` |
| **Nombre en App Store** | Skullchef (o variante si el nombre simple está ocupado) |
| **Display Name (icono iPhone)** | Skullchef |
| **Carpeta transfer Mac** | `skullchef-mac` (solo local, no es el Bundle ID) |

**No usar** `com.smallcreek.skullchefapp` — es otro identificador en Apple Developer; la app publicada en App Store Connect usa **`com.smallcreek.skullchef`**.

Tras cambiar el Bundle ID: **Archive nuevo** en Xcode (archives viejos llevan el ID antiguo).
