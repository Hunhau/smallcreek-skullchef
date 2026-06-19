# Generate WebP full + thumb skin assets (Windows wrapper).
# Usage:
#   .\tools\generate_skin_webp.ps1
#   .\tools\generate_skin_webp.ps1 -Report
#   .\tools\generate_skin_webp.ps1 assets\skins\new_skin.png
param(
    [switch]$Report,
    [string[]]$Pngs
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$args = @("tools/generate_skin_webp.py", "--update-catalog")
if ($Report) { $args += "--report" }
if ($Pngs) { $args += $Pngs }

python @args
