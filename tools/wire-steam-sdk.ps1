# Install steamworks.js in the Steam Electron shell and set App ID for local testing.
# Usage:
#   .\tools\wire-steam-sdk.ps1
#   .\tools\wire-steam-sdk.ps1 -AppId 1234567
param([int]$AppId = 0)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$steamDir = Join-Path $root 'steam'

if ($AppId -gt 0) {
    Set-Content -Path (Join-Path $steamDir 'steam_appid.txt') -Value "$AppId" -Encoding ASCII
    Write-Host "Wrote steam/steam_appid.txt = $AppId"
} elseif (-not (Test-Path (Join-Path $steamDir 'steam_appid.txt'))) {
    Copy-Item (Join-Path $steamDir 'steam_appid.txt.example') (Join-Path $steamDir 'steam_appid.txt')
    Write-Warning "Using example App ID 480 — replace steam/steam_appid.txt with your real Steam App ID."
}

Write-Host "==> npm install in steam/ (electron + steamworks.js)..."
Push-Location $steamDir
try {
    npm install --no-fund --no-audit
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Steam SDK wired. Requirements:"
Write-Host "  - Steam client running and logged in"
Write-Host "  - steam/steam_appid.txt = your App ID (or 480 for Valve sample)"
Write-Host "  - For packaged builds: copy sdk/redistributable_bin/win64/*.dll next to Skullchef.exe"
Write-Host ""
Write-Host "Test: .\tools\build-steam.ps1 -Run"
