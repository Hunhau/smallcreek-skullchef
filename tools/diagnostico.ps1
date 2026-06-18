$ErrorActionPreference = 'SilentlyContinue'

$assets = 'C:\Users\VersusPC\.cursor\projects\d-SmallCreek-Game\assets'
$out    = 'D:\SmallCreek Game\tools\asset_list.txt'

$lines = @()
$lines += '===== PNG en assets del proyecto ====='
$pngs = Get-ChildItem -Path $assets -Filter *.png -File | Select-Object -ExpandProperty Name | Sort-Object
if ($pngs) { $lines += $pngs } else { $lines += '(ninguno)' }

$lines += ''
$lines += '===== ALPHA CHECK (helpers ya copiados) ====='
Add-Type -AssemblyName System.Drawing
foreach ($n in @('pio_common_beanie','ivan_legendary_drip','coco_superleg_iced')) {
    $t = "D:\SmallCreek Game\assets\skins\$n.png"
    if (Test-Path -LiteralPath $t) {
        $b = [System.Drawing.Bitmap]::FromFile($t)
        $lines += ("{0} : {1}  cornerAlpha={2}  ({3}x{4})" -f $n, $b.PixelFormat, ($b.GetPixel(0,0)).A, $b.Width, $b.Height)
        $b.Dispose()
    } else {
        $lines += ("{0} : NO ENCONTRADO" -f $n)
    }
}

$lines += ''
$lines += '===== PYTHON ====='
$py = Get-Command python -ErrorAction SilentlyContinue
if ($py) { $lines += ('python: ' + $py.Source) } else { $lines += 'python: NO INSTALADO' }

$lines | Out-File -Encoding utf8 $out
Write-Host ''
Write-Host '===== RESULTADO =====' -ForegroundColor Cyan
$lines | ForEach-Object { Write-Host $_ }
Write-Host ''
Write-Host ("Guardado en: " + $out) -ForegroundColor Green
