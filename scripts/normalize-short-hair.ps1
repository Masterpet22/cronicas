Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $PSScriptRoot "..\assets\modular\hair"
$source = Join-Path $assetRoot "source\short.png"
$destination = Join-Path $assetRoot "hair_corto.png"
$crop = [System.Drawing.Rectangle]::new(174, 55, 689, 542)

$sourceBitmap = [System.Drawing.Bitmap]::FromFile($source)
try {
  $targetBitmap = New-Object System.Drawing.Bitmap(1500, 1163, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($sourceBitmap, [System.Drawing.Rectangle]::new(0, 0, 1500, 1163), $crop, [System.Drawing.GraphicsUnit]::Pixel)
    } finally { $graphics.Dispose() }
    $targetBitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $targetBitmap.Dispose() }
} finally { $sourceBitmap.Dispose() }
