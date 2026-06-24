# Build Skullchef Steam desktop package (Electron + BUILD_TARGET = 'steam').
# Usage: .\tools\build-steam.ps1
#        .\tools\build-steam.ps1 -Run   # build then launch for local test
param([switch]$Run)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'dist-steam'
$stage = Join-Path $outDir 'app'

Write-Host "==> Generating Steamworks manifest (achievements + item defs)..."
Push-Location $root
try {
    node (Join-Path $root 'tools\generate-steamworks-manifest.js')
} catch {
    Write-Warning "Manifest generation skipped (Node required): $_"
} finally {
    Pop-Location
}

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeTop = @('.git', 'dist-playables', 'dist-mac', 'dist-steam', 'node_modules', 'steam', 'tools', 'ios', 'android', 'www', 'backups', 'appstore-screenshots', 'appstore-screenshots-ipad13', 'screenshots-iphone')

Get-ChildItem -Path $root -Force | Where-Object {
    $_.Name -notin $excludeTop
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $stage $_.Name) -Recurse -Force
}

# Electron shell
Copy-Item -Path (Join-Path $root 'steam\main.js') -Destination $stage -Force
Copy-Item -Path (Join-Path $root 'steam\preload.js') -Destination $stage -Force
Copy-Item -Path (Join-Path $root 'steam\steam-backend.js') -Destination $stage -Force
Copy-Item -Path (Join-Path $root 'steam\package.json') -Destination $stage -Force
$steamManifest = Join-Path $root 'steam\manifest'
$steamAch = Join-Path $root 'steam\achievements'
if (Test-Path $steamManifest) {
    Copy-Item -Path $steamManifest -Destination (Join-Path $stage 'manifest') -Recurse -Force
}
if (Test-Path $steamAch) {
    Copy-Item -Path $steamAch -Destination (Join-Path $stage 'achievements') -Recurse -Force
}
if (Test-Path (Join-Path $root 'steam\steam_appid.txt')) {
    Copy-Item -Path (Join-Path $root 'steam\steam_appid.txt') -Destination $stage -Force
}

# Store build flags
$indexPath = Join-Path $stage 'index.html'
$html = Get-Content -Path $indexPath -Raw -Encoding UTF8
$html = $html -replace "BUILD_TARGET_OVERRIDE = 'web'", "BUILD_TARGET_OVERRIDE = 'steam'"
$html = $html -replace "BUILD_TARGET_OVERRIDE = 'auto'", "BUILD_TARGET_OVERRIDE = 'steam'"
Set-Content -Path $indexPath -Value $html -Encoding UTF8 -NoNewline

Write-Host "==> Installing Electron dependencies..."
Push-Location $stage
try {
    npm install --no-fund --no-audit
    if ($Run) {
        Write-Host "==> Launching Skullchef (Steam build)..."
        npm start
    } else {
        Write-Host "==> Packaging Windows binaries (portable + installer)..."
        npm run dist
    }
} finally {
    Pop-Location
}

$portable = Get-ChildItem -Path (Join-Path $stage 'out') -Filter '*portable*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$installer = Get-ChildItem -Path (Join-Path $stage 'out') -Filter '*Setup*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host ""
Write-Host "Steam build ready in: $(Join-Path $stage 'out')"
if ($portable) { Write-Host "  Portable: $($portable.FullName)" }
if ($installer) { Write-Host "  Installer: $($installer.FullName)" }
Write-Host "Local test: cd dist-steam\app && npm start"
Write-Host "Upload the packaged folder/zip to Steamworks when partner account is ready."
