# Copia solo fuentes web a www/ — SIN borrar assets/audio (anti-OOM / rápido).
# Usar esto en tandas normales. sync-www.ps1 completo solo antes de cap sync iOS.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root 'www'
if (-not (Test-Path $www)) { New-Item -ItemType Directory -Path $www | Out-Null }

$files = @(
    'index.html', 'sw.js', 'manifest.webmanifest', 'privacy.html', 'app-ads.txt', 'events.js',
    'version.json', 'live.json', 'css', 'admob.config.json'
)
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $www $f) -Force }
}

$dirs = @('js', 'leaderboard')
foreach ($d in $dirs) {
    $src = Join-Path $root $d
    $dst = Join-Path $www $d
    if (Test-Path $src) {
        if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
        Copy-Item $src $dst -Recurse -Force
    }
}

Write-Host "sync-www-lite OK (js + html; assets/audio sin tocar)"
