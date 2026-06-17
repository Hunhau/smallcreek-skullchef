# Sube los cambios del juego a GitHub (repo privado smallcreek-skullchef).
# Uso:  click derecho > "Ejecutar con PowerShell"   (usa un mensaje por defecto)
#   o:  .\subir-cambios.ps1 "Tu mensaje describiendo el cambio"
param([string]$mensaje = "Actualizacion del juego")

# Asegura que git este disponible aunque la terminal no lo tenga en PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location -Path $PSScriptRoot

Write-Host "Guardando cambios..." -ForegroundColor Cyan
git add -A
git commit -m $mensaje
Write-Host "Subiendo a GitHub..." -ForegroundColor Cyan
git push

Write-Host "Hecho. Repo: https://github.com/Hunhau/smallcreek-skullchef" -ForegroundColor Green
