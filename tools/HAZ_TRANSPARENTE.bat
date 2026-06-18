@echo off
title Transparencia IA (rembg) - SmallCreek
echo ============================================================
echo   Paso 1/2: instalando rembg (solo la primera vez).
echo   Descarga ~200MB. Necesita internet. Puede tardar.
echo ============================================================
python -m pip install --upgrade pip
python -m pip install rembg onnxruntime pillow
echo.
echo ============================================================
echo   Paso 2/2: quitando fondos por IA y guardando en skins.
echo   (la primera vez baja el modelo de IA, ~170MB)
echo ============================================================
python "D:\SmallCreek Game\tools\transparentar.py"
echo.
echo ============================================================
echo   LISTO. Revisa que ponga "36/36 procesados".
echo   Luego abre el juego con Ctrl+F5.
echo ============================================================
pause >nul
