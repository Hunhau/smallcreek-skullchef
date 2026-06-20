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
    $_.Name -notin @('.git', 'dist-playables', 'dist-mac', 'node_modules', 'backups')
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $stage $_.Name) -Recurse -Force
}

# Store build: auto-detect ios on Capacitor (Mac script also patches if still 'web').
$indexPath = Join-Path $stage 'index.html'
$html = Get-Content -Path $indexPath -Raw -Encoding UTF8
$html = $html -replace "BUILD_TARGET_OVERRIDE = 'web'", "BUILD_TARGET_OVERRIDE = 'auto'"
Set-Content -Path $indexPath -Value $html -Encoding UTF8 -NoNewline

# Pre-zip sanity checks
$required = @(
    'index.html', 'admob.config.json', 'capacitor.config.json', 'privacy.html',
    'version.json', 'tools/setup-ios-mac.sh', 'tools/sync-www.sh',
    'tools/patch-ios-admob-plist.sh', 'tools/pre-archive-check.sh',
    'ios-app-icon/AppIcon.appiconset/icon-1024.png', 'docs/RELEASE_IOS_1.0.1.md',
    'audio/stir1.mp3', 'assets/audio/ambient/rain.mp3'
)
foreach ($rel in $required) {
    $p = Join-Path $stage $rel
    if (-not (Test-Path $p)) { throw "Missing in Mac ZIP: $rel" }
}
$syncSh = Get-Content (Join-Path $stage 'tools/sync-www.sh') -Raw
if ($syncSh -notmatch 'copy\s+"\$ROOT/audio"') { throw 'sync-www.sh must copy audio/ into www/' }
$admob = Get-Content (Join-Path $stage 'admob.config.json') -Raw
if ($admob -match '"isTesting"\s*:\s*true') { throw 'admob.config.json still has isTesting: true' }
Write-Host "Pre-zip checks OK (AdMob production, AppIcon 1024, audio SFX)"

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force

$sizeMb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Mac transfer zip ready: $zip ($sizeMb MB)"
Write-Host "On Mac: unzip, then run: chmod +x tools/setup-ios-mac.sh && ./tools/setup-ios-mac.sh"
