Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $PSScriptRoot "..\assets\modular"
$headSource = Join-Path $assetRoot "man_sprites\source\head.png"
$headRuntime = Join-Path $assetRoot "man_sprites\runtime\cabeza.png"
$faceSourceRoot = Join-Path $assetRoot "faces\source"
$faceRuntimeRoot = Join-Path $assetRoot "faces"

function Export-CroppedPng {
  param(
    [string]$Source,
    [string]$Destination,
    [System.Drawing.Rectangle]$Crop,
    [int]$TargetWidth = $Crop.Width,
    [int]$TargetHeight = $Crop.Height
  )

  $sourceBitmap = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $targetBitmap = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($sourceBitmap, [System.Drawing.Rectangle]::new(0, 0, $TargetWidth, $TargetHeight), $Crop, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $targetBitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $targetBitmap.Dispose() }
  } finally { $sourceBitmap.Dispose() }
}

function Export-NormalizedFace {
  param(
    [string]$Source,
    [string]$Destination,
    [System.Drawing.Rectangle]$Crop,
    [int]$Top,
    [int]$Left = 157,
    [int]$ContentWidth = 278,
    [int]$ContentHeight = 257
  )

  $sourceBitmap = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $targetBitmap = New-Object System.Drawing.Bitmap(441, 593, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($sourceBitmap, [System.Drawing.Rectangle]::new($Left, $Top, $ContentWidth, $ContentHeight), $Crop, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $targetBitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $targetBitmap.Dispose() }
  } finally { $sourceBitmap.Dispose() }
}

function Export-TonedFace {
  param(
    [string]$Source,
    [string]$Destination,
    [array]$Palette
  )

  $sourceBitmap = [System.Drawing.Bitmap]::FromFile($Source)
  try {
    $targetBitmap = New-Object System.Drawing.Bitmap($sourceBitmap.Width, $sourceBitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      for ($y = 0; $y -lt $sourceBitmap.Height; $y++) {
        for ($x = 0; $x -lt $sourceBitmap.Width; $x++) {
          $pixel = $sourceBitmap.GetPixel($x, $y)
          $maximum = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
          $minimum = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
          $luminance = [Math]::Round($pixel.R * .2126 + $pixel.G * .7152 + $pixel.B * .0722)
          if ($pixel.A -gt 0 -and ($maximum - $minimum) -le 24 -and $luminance -ge 45 -and $luminance -le 235) {
            $position = $luminance / 255 * ($Palette.Count - 1)
            $index = [Math]::Min($Palette.Count - 2, [Math]::Floor($position))
            $weight = $position - $index
            $red = [Math]::Round($Palette[$index][0] + ($Palette[$index + 1][0] - $Palette[$index][0]) * $weight)
            $green = [Math]::Round($Palette[$index][1] + ($Palette[$index + 1][1] - $Palette[$index][1]) * $weight)
            $blue = [Math]::Round($Palette[$index][2] + ($Palette[$index + 1][2] - $Palette[$index][2]) * $weight)
            $pixel = [System.Drawing.Color]::FromArgb($pixel.A, $red, $green, $blue)
          }
          $targetBitmap.SetPixel($x, $y, $pixel)
        }
      }
      $targetBitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $targetBitmap.Dispose() }
  } finally { $sourceBitmap.Dispose() }
}

Export-CroppedPng $headSource $headRuntime ([System.Drawing.Rectangle]::new(276, 140, 441, 593)) 174 229
Export-NormalizedFace (Join-Path $faceSourceRoot "male_angry.png") (Join-Path $faceRuntimeRoot "male_angry.png") ([System.Drawing.Rectangle]::new(516, 397, 353, 341)) 237
Export-NormalizedFace (Join-Path $faceSourceRoot "male_happy.png") (Join-Path $faceRuntimeRoot "male_happy.png") ([System.Drawing.Rectangle]::new(413, 457, 406, 384)) 237
Export-NormalizedFace (Join-Path $faceSourceRoot "male_poker.png") (Join-Path $faceRuntimeRoot "male_poker.png") ([System.Drawing.Rectangle]::new(513, 386, 385, 351)) 237

function Mix-Rgb {
  param([int[]]$From, [int[]]$To, [double]$Weight)
  return ,@(
    [Math]::Round($From[0] + ($To[0] - $From[0]) * $Weight),
    [Math]::Round($From[1] + ($To[1] - $From[1]) * $Weight),
    [Math]::Round($From[2] + ($To[2] - $From[2]) * $Weight)
  )
}

function New-SkinPalette {
  param([int[]]$Base)
  $colors = [System.Collections.Generic.List[object]]::new()
  $colors.Add(@(0,0,0))
  foreach ($weight in @(.12,.28,.46,.65,.82,1)) { $colors.Add((Mix-Rgb @(0,0,0) $Base $weight)) }
  $colors.Add((Mix-Rgb $Base @(255,239,218) .45))
  $colors.Add((Mix-Rgb $Base @(255,239,218) .72))
  return ,$colors.ToArray()
}

$toneBases = @{
  "muy-claro" = @(248,205,174); claro = @(226,174,132); dorado = @(205,146,96)
  medio = @(183,121,76); oliva = @(157,102,65); canela = @(132,80,49)
  moreno = @(109,64,40); oscuro = @(79,45,31); ebano = @(52,30,24)
}
$palettes = @{}
foreach ($toneId in $toneBases.Keys) { $palettes[$toneId] = New-SkinPalette $toneBases[$toneId] }
foreach ($faceId in @("angry", "happy", "poker")) {
  foreach ($toneId in $palettes.Keys) {
    Export-TonedFace (Join-Path $faceRuntimeRoot "male_$faceId.png") (Join-Path $faceRuntimeRoot "male_${faceId}_${toneId}.png") $palettes[$toneId]
  }
}
