@echo off
title Integrar skins HD - SmallCreek
echo ============================================
echo   Copiando las 36 skins HD a assets\skins
echo ============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\SmallCreek Game\tools\integrate_skins.ps1"
echo.
echo ============================================
echo   Terminado. Revisa que ponga "Copied 36/36".
echo   Pulsa una tecla para cerrar esta ventana.
echo ============================================
pause >nul
