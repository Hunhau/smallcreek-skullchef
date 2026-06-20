# Zip the full game project for Mac / iOS Capacitor setup.
# Usage: .\tools\build-mac-transfer.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'dist-mac'
$stage = Join-Path $outDir 'stage'
$zip = Join-Path $outDir 'skullchef-mac.zip'

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeDirs = @('.git', 'dist-playables', 'dist-mac', 'node_modules', '__pycache__',
    'assets/skins_backup_pre_compress', 'assets/skins/canva_masters')

Get-ChildItem -Path $root -Force | Where-Object {
    $_.Name -notin @('.git', 'dist-playables', 'dist-mac', 'node_modules')
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $stage $_.Name) -Recurse -Force
}

# Store build: auto-detect ios on Capacitor (Mac script also patches if still 'web').
$indexPath = Join-Path $stage 'index.html'
$html = Get-Content -Path $indexPath -Raw -Encoding UTF8
$html = $html -replace "BUILD_TARGET_OVERRIDE = 'web'", "BUILD_TARGET_OVERRIDE = 'auto'"
Set-Content -Path $indexPath -Value $html -Encoding UTF8 -NoNewline

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force

$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Mac transfer zip ready: $zip ($sizeMb MB)"
Write-Host "On Mac: unzip, then run: chmod +x tools/setup-ios-mac.sh && ./tools/setup-ios-mac.sh"
