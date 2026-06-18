# DIRECTO ON: enciende el badge "EN VIVO" para todos los jugadores.
# NO usa la API de YouTube ni credenciales: solo reescribe live.json (un flag
# JSON plano en tu propio repo) y lo sube a GitHub.
# Uso: click derecho > "Ejecutar con PowerShell"
$ErrorActionPreference = "Stop"

# Asegura que git este disponible aunque la terminal no lo tenga en PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location -Path $PSScriptRoot

$json = '{"live": true, "url": "https://www.youtube.com/@smallcreekskullchefasmr/live"}'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot "live.json"), $json, $utf8NoBom)

Write-Host "Activando directo..." -ForegroundColor Cyan
git add live.json
git commit -m "Directo ON"
git push

Write-Host ""
Write-Host "==== DIRECTO ACTIVADO ====" -ForegroundColor Green
Write-Host "El badge 'EN VIVO' se encendera para los jugadores automaticamente." -ForegroundColor Green
Write-Host "NOTA: la CDN de GitHub puede tardar hasta ~5 minutos en reflejar el cambio." -ForegroundColor Yellow
