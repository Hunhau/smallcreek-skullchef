# Build a YouTube Playables upload zip (BUILD_TARGET = 'playables').
# Usage: .\tools\build-playables.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'dist-playables'
$stage = Join-Path $outDir 'stage'
$zip = Join-Path $outDir 'skullchef-playables.zip'

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeDirs = @('.git', 'dist-playables', 'node_modules')
Get-ChildItem -Path $root -Force | Where-Object {
    $_.Name -notin $excludeDirs -and $_.Name -ne 'tools'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $stage $_.Name) -Recurse -Force
}

# Copy tools content is skipped; re-copy leaderboard, assets, etc. from root only.
# Patch BUILD_TARGET in staged index.html only.
$indexPath = Join-Path $stage 'index.html'
$html = Get-Content -Path $indexPath -Raw -Encoding UTF8
$html = $html -replace "BUILD_TARGET_OVERRIDE = 'web'", "BUILD_TARGET_OVERRIDE = 'playables'"
Set-Content -Path $indexPath -Value $html -Encoding UTF8 -NoNewline

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force

Write-Host "Playables zip ready: $zip"
