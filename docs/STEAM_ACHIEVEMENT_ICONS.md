# Iconos de logros Steam (Skullchef)

Los logros en `steam/manifest/achievements.json` son **solo nombres y API keys**. **No incluyen imágenes** — Valve no las genera por ti.

## Qué subes tú en Steamworks

Cuando tengas **App ID**, en **Steamworks → tu app → Stats & Achievements → Achievements**:

Por cada logro (9 en total), sube **dos iconos**:

| Tamaño | Uso |
|--------|-----|
| **64×64 px** | Icono en overlay / lista de logros |
| **1024×1024 px** | Icono grande en perfil Steam (opcional pero recomendado) |

Formato: **PNG** con transparencia.

## Los 9 logros y ideas de icono

| API Name | Nombre EN | Idea visual |
|----------|-----------|-------------|
| `ACH_FIRSTCLICK` | First Stir | Cuchara removiendo ola |
| `ACH_FIRSTPRES` | First Prestige | Flecha circular / ascenso |
| `ACH_FIRSTCHAMP` | Grand Prix Champion | Trofeo / bandera meta |
| `ACH_FULLTEAM` | Full Kitchen Crew | 5 ayudantes juntos |
| `ACH_ALLSPOONS` | Sacred Spoon Album | Álbum de cucharas |
| `ACH_CENTURION` | Centurion Chef | Número 100 / yelmo |
| `ACH_AWAKENED5` | Five Awakenings | 5 estrellas / despertar |
| `ACH_COLLECTOR` | Charm Collector | Amuleto / colección |
| `ACH_MYTHICCHARM` | Mythic Drop (oculto) | Amuleto superleg brillante |

Puedes reutilizar arte del juego (`assets/img/`, thumbs de amuletos) redimensionado a 64×64.

## Iconos generados (repo)

Script: `python tools/generate-steam-achievement-icons.py`

Salida:

```
steam/achievements/
  ACH_FIRSTCLICK_64.png
  ACH_FIRSTCLICK_1024.png
  … (9 logros × 2 tamaños)
```

Sube esos PNG al panel Steamworks cuando tengas App ID.
- ✅ El juego desbloquea con `ACH_*` cuando conectes `steamworks.js`

## Cuándo hacerlo

**Después** de pagar Steam Direct y crear la app — necesitas App ID para entrar al panel de logros.

## Plantilla rápida (Canva / Photoshop)

1. Canvas 1024×1024, fondo transparente
2. Icono centrado estilo Skullchef (calavera chef, cuchara, amuleto)
3. Exportar 1024 + reducir a 64
4. Subir ambos en cada logro del panel
