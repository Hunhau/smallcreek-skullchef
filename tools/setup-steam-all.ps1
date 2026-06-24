# One-shot Steam prep: manifests, achievement icons, SDK, optional build.
# Usage:
#   .\tools\setup-steam-all.ps1
#   .\tools\setup-steam-all.ps1 -AppId 1234567 -Build
param([int]$AppId = 0, [switch]$Build, [switch]$Run)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "==> [1/4] Regenerating Steamworks manifests..."
Push-Location $root
try {
    node (Join-Path $root 'tools\generate-steamworks-manifest.js')
} catch {
    Write-Warning "Manifest generation failed (Node required): $_"
} finally {
    Pop-Location
}

Write-Host "==> [2/4] Generating achievement icons (64 + 1024 PNG)..."
$iconScript = Join-Path $root 'tools\generate-steam-achievement-icons.py'
if (Test-Path $iconScript) {
    try {
        python $iconScript
    } catch {
        Write-Warning "Icon generation skipped — run: pip install pillow && python tools/generate-steam-achievement-icons.py"
    }
} else {
    Write-Warning "generate-steam-achievement-icons.py not found"
}

Write-Host "==> [3/4] Wiring steamworks.js..."
$wireArgs = @()
if ($AppId -gt 0) { $wireArgs += '-AppId', $AppId }
& (Join-Path $PSScriptRoot 'wire-steam-sdk.ps1') @wireArgs

if ($Build -or $Run) {
    Write-Host "==> [4/4] Building Steam desktop package..."
    $buildArgs = @()
    if ($Run) { $buildArgs += '-Run' }
    & (Join-Path $PSScriptRoot 'build-steam.ps1') @buildArgs
} else {
    Write-Host "==> [4/4] Skipped build (add -Build or -Run to compile .exe)"
}

Write-Host ""
Write-Host "Next steps — read docs/STEAM_ROADMAP_COMPLETO.md"
Write-Host "  Fase 0: crear app en Steamworks + subir build"
Write-Host "  Fase 1: logros en panel + steam_appid.txt real"
Write-Host "  Fase 2: Economy + item defs desde steam/manifest/itemdefs.json"
Write-Host "  Fase 3: Community Market (post-launch)"
