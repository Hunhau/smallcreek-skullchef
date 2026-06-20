@echo off
cd /d "D:\SmallCreek Game\tools"
echo Copiando script al Mac...
scp archive-ios-mac.sh juancarlosgomezgarcia@192.168.1.35:Desktop/skullchef-mac/tools/
if errorlevel 1 goto fail
echo.
echo Archive en el Mac (10-20 min). Contraseña del Mac si pide...
ssh juancarlosgomezgarcia@192.168.1.35 chmod +x Desktop/skullchef-mac/tools/archive-ios-mac.sh
ssh juancarlosgomezgarcia@192.168.1.35 bash Desktop/skullchef-mac/tools/archive-ios-mac.sh
echo.
echo Terminado. Copia las ultimas lineas de arriba y pegalas en Cursor.
pause
exit /b 0
:fail
echo Error en scp o ssh.
pause
exit /b 1
