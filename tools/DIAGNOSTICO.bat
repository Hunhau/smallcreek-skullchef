@echo off
title Diagnostico skins - SmallCreek
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\SmallCreek Game\tools\diagnostico.ps1"
echo.
echo ==========================================
echo   LISTO. Info guardada en asset_list.txt
echo   Vuelve a Cursor y escribe: hecho
echo ==========================================
pause >nul
