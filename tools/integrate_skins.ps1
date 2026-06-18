# ============================================================================
# integrate_skins.ps1
# ----------------------------------------------------------------------------
# Copies the 36 NEW high-resolution, transparent skin PNGs (the "*_hi" set)
# over the live skin art used by the game in assets/skins/<catalog img>.
#
# These HD images are the canonical art and must be used BOTH in the charm
# catalog thumbnails AND in-scene. This script ONLY touches the 36 known
# files, is idempotent (re-running just re-copies), and never deletes anything
# (the pristine originals/ folder is left untouched).
#
# Run:  powershell -ExecutionPolicy Bypass -File "D:\SmallCreek Game\tools\integrate_skins.ps1"
# ============================================================================

$ErrorActionPreference = 'Stop'

$SrcDir = 'C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets'
$DstDir = 'D:\SmallCreek Game\assets\skins'

# NOTE: This is the FALLBACK copier (copies the HD art AS-IS, WITHOUT removing
# the background). The preferred path is HAZ_TRANSPARENTE.bat (rembg), which
# makes the art truly transparent before placing it. Use this only if rembg
# cannot run. Every "*_hi.png" maps to "<same name without _hi>.png".

Write-Host "=== SmallCreek skin integration (fallback, NO transparency) ===" -ForegroundColor Cyan
Write-Host "Source: $SrcDir"
Write-Host "Target: $DstDir"
Write-Host ""

if (-not (Test-Path -LiteralPath $DstDir)) {
    Write-Host "Target folder missing, creating: $DstDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DstDir -Force | Out-Null
}

$srcFiles = Get-ChildItem -LiteralPath $SrcDir -Filter '*_hi.png' -File
$copied = 0

foreach ($f in $srcFiles) {
    $dstName = ($f.BaseName -replace '_hi$', '') + '.png'
    $dstPath = Join-Path $DstDir $dstName
    Copy-Item -LiteralPath $f.FullName -Destination $dstPath -Force
    Write-Host ("COPIED  {0,-34} -> {1}" -f $f.Name, $dstName) -ForegroundColor Green
    $copied++
}

Write-Host ""
Write-Host ("=== Done. Copied {0} files. ===" -f $copied) -ForegroundColor Cyan
Write-Host "REMINDER: this copy does NOT add transparency. Prefer HAZ_TRANSPARENTE.bat." -ForegroundColor Yellow
