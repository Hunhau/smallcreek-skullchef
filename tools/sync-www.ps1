# Copy web game files into www/ for Capacitor (webDir cannot be ".").
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root 'www'
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Path $www | Out-Null

$items = @(
    'index.html', 'sw.js', 'manifest.webmanifest', 'privacy.html',
    'version.json', 'live.json', 'events.js', 'assets', 'leaderboard', 'admob.config.json'
)
foreach ($item in $items) {
    $src = Join-Path $root $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $www $item) -Recurse -Force
    }
}
Write-Host "www/ ready at $www"
