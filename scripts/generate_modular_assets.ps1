Add-Type -AssemblyName System.Drawing

$AssetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\modular"))
$SourceRoot = Join-Path $AssetRoot "source"
$CanvasSize = 768

function New-Canvas {
  return [Drawing.Bitmap]::new($CanvasSize, $CanvasSize, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Get-Cell-Rect([Drawing.Bitmap]$atlas, [Drawing.Rectangle]$srcRect) {
  $cell = [Drawing.Bitmap]::new($srcRect.Width, $srcRect.Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($cell)
  $graphics.DrawImage($atlas, [Drawing.Rectangle]::new(0, 0, $cell.Width, $cell.Height), $srcRect, [Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $cell
}

function Get-Cell([Drawing.Bitmap]$atlas, [int]$column, [int]$row, [int]$columns, [int]$rows) {
  $left = [Math]::Round($atlas.Width * $column / $columns)
  $top = [Math]::Round($atlas.Height * $row / $rows)
  $right = [Math]::Round($atlas.Width * ($column + 1) / $columns)
  $bottom = [Math]::Round($atlas.Height * ($row + 1) / $rows)
  return Get-Cell-Rect $atlas ([Drawing.Rectangle]::new($left, $top, $right - $left, $bottom - $top))
}

function Clean-Alpha([Drawing.Bitmap]$bitmap, [int]$cutoff = 38) {
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -lt $cutoff) {
        $bitmap.SetPixel($x, $y, [Drawing.Color]::Transparent)
      } elseif ($pixel.A -lt 160) {
        $alpha = [Math]::Min(255, [Math]::Max(0, [Math]::Round(($pixel.A - $cutoff) * 255 / (160 - $cutoff))))
        $bitmap.SetPixel($x, $y, [Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }
}

function Get-ContentBounds([Drawing.Bitmap]$bitmap, [double]$trimBottom = 0) {
  $minX = $bitmap.Width; $minY = $bitmap.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      if ($bitmap.GetPixel($x, $y).A -gt 30) {
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt $minX) { return [Drawing.Rectangle]::new(0, 0, 1, 1) }
  $height = $maxY - $minY + 1
  if ($trimBottom -gt 0) { $height = [Math]::Max(1, [Math]::Round($height * (1 - $trimBottom))) }
  return [Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $height)
}

function Save-Image-From-Cell([Drawing.Bitmap]$cell, [Drawing.Rectangle]$target, [string]$relativePath, [double]$trimBottom = 0) {
  Clean-Alpha $cell
  $source = Get-ContentBounds $cell $trimBottom
  $canvas = New-Canvas
  $graphics = [Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($cell, $target, $source, [Drawing.GraphicsUnit]::Pixel)
  $path = Join-Path $AssetRoot $relativePath
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
  $canvas.Save($path, [Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $canvas.Dispose(); $cell.Dispose()
}

function Save-Cell([Drawing.Bitmap]$atlas, [int]$column, [int]$row, [int]$columns, [int]$rows, [Drawing.Rectangle]$target, [string]$relativePath, [double]$trimBottom = 0) {
  $cell = Get-Cell $atlas $column $row $columns $rows
  Save-Image-From-Cell $cell $target $relativePath $trimBottom
}

function Save-Blank([string]$relativePath) {
  $canvas = New-Canvas
  $path = Join-Path $AssetRoot $relativePath
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path)) | Out-Null
  $canvas.Save($path, [Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()
}

function Clear-Below([string]$relativePath, [int]$startY) {
  $path = Join-Path $AssetRoot $relativePath
  $source = [Drawing.Bitmap]::new($path)
  $bitmap = New-Canvas
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.DrawImage($source, 0, 0, $CanvasSize, $CanvasSize)
  $graphics.Dispose(); $source.Dispose()
  for ($y = $startY; $y -lt $CanvasSize; $y++) {
    for ($x = 0; $x -lt $CanvasSize; $x++) { $bitmap.SetPixel($x, $y, [Drawing.Color]::Transparent) }
  }
  $bitmap.Save($path, [Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$bodyAtlas = [Drawing.Bitmap]::new((Join-Path $SourceRoot "body-atlas.png"))
$hairAtlas = [Drawing.Bitmap]::new((Join-Path $SourceRoot "hair-atlas.png"))
$clothingAtlas = [Drawing.Bitmap]::new((Join-Path $SourceRoot "clothing-atlas.png"))
$detailAtlas = [Drawing.Bitmap]::new((Join-Path $SourceRoot "face-weapon-atlas.png"))

# 1. CUERPOS BASE
Save-Cell $bodyAtlas 0 0 2 1 ([Drawing.Rectangle]::new(140, 18, 488, 720)) "body\body_male.png"
Save-Cell $bodyAtlas 1 0 2 1 ([Drawing.Rectangle]::new(140, 18, 488, 720)) "body\body_female.png"
Clear-Below "body\body_male.png" 632
Clear-Below "body\body_female.png" 632

# 2. ROSTROS
# Proporción anatómica alineada a la cabeza (ojos a la altura de las orejas, nariz y boca sobre la barbilla)
$faceTarget = [Drawing.Rectangle]::new(312, 80, 156, 98)
for ($index = 0; $index -lt 3; $index++) {
  Save-Cell $detailAtlas $index 0 4 2 $faceTarget ("face\face_0{0}.png" -f ($index + 1))
}

# 3. PEINADOS (limpieza del artefacto '<' y límites exactos de celdas)
# Limpiar exclusivamente el artefacto '<' flotante entre peinado 1 y 2
for ($y = 295; $y -le 415; $y++) {
  for ($x = 865; $x -le 885; $x++) {
    $hairAtlas.SetPixel($x, $y, [Drawing.Color]::Transparent)
  }
}

$hairCellRects = @(
  [Drawing.Rectangle]::new(0, 0, 428, 724),
  [Drawing.Rectangle]::new(431, 0, 434, 724),
  [Drawing.Rectangle]::new(885, 0, 399, 724),
  [Drawing.Rectangle]::new(1286, 0, 452, 724),
  [Drawing.Rectangle]::new(1740, 0, 432, 724)
)

$hairTargets = @(
  [Drawing.Rectangle]::new(184, -4, 400, 272),
  [Drawing.Rectangle]::new(170, 0, 428, 370),
  [Drawing.Rectangle]::new(176, -2, 416, 280),
  [Drawing.Rectangle]::new(166, -2, 436, 370),
  [Drawing.Rectangle]::new(172, -2, 424, 310)
)
for ($index = 0; $index -lt 5; $index++) {
  Save-Blank ("hair\hair_0{0}_rear.png" -f ($index + 1))
  $cell = Get-Cell-Rect $hairAtlas $hairCellRects[$index]
  Save-Image-From-Cell $cell $hairTargets[$index] ("hair\hair_0{0}_front.png" -f ($index + 1))
}

# 4. PRENDAS SUPERIORES E INFERIORES
for ($index = 0; $index -lt 3; $index++) {
  Save-Cell $clothingAtlas $index 0 5 2 ([Drawing.Rectangle]::new(166, 210, 436, 296)) ("top\top_0{0}.png" -f ($index + 1))
  Save-Cell $clothingAtlas $index 1 5 2 ([Drawing.Rectangle]::new(170, 410, 428, 270)) ("bottom\bottom_0{0}.png" -f ($index + 1)) 0.18
}

# 5. CALZADO
Save-Cell $clothingAtlas 3 1 5 2 ([Drawing.Rectangle]::new(144, 620, 480, 122)) "shoes\shoes_01.png"
Save-Cell $clothingAtlas 4 1 5 2 ([Drawing.Rectangle]::new(144, 620, 480, 122)) "shoes\shoes_02.png"

# 6. ARMAS
$weaponTargets = @(
  [Drawing.Rectangle]::new(490, 350, 188, 286),
  [Drawing.Rectangle]::new(390, 285, 278, 380),
  [Drawing.Rectangle]::new(474, 165, 202, 510),
  [Drawing.Rectangle]::new(488, 330, 192, 310)
)
$weaponNames = @("kunai", "sword", "staff", "dagger")
for ($index = 0; $index -lt 4; $index++) {
  Save-Cell $detailAtlas $index 1 4 2 $weaponTargets[$index] ("weapon\weapon_{0}.png" -f $weaponNames[$index])
}

# 7. VISTA PREVIA COMPUESTA (preview.png)
$previewCanvas = New-Canvas
$pg = [Drawing.Graphics]::FromImage($previewCanvas)
$previewLayers = @(
  (Join-Path $AssetRoot "body\body_male.png"),
  (Join-Path $AssetRoot "bottom\bottom_01.png"),
  (Join-Path $AssetRoot "shoes\shoes_01.png"),
  (Join-Path $AssetRoot "top\top_01.png"),
  (Join-Path $AssetRoot "hair\hair_01_front.png"),
  (Join-Path $AssetRoot "face\face_01.png"),
  (Join-Path $AssetRoot "weapon\weapon_kunai.png")
)
foreach ($lp in $previewLayers) {
  $layerBmp = [Drawing.Bitmap]::new($lp)
  $pg.DrawImage($layerBmp, 0, 0, $CanvasSize, $CanvasSize)
  $layerBmp.Dispose()
}
$pg.Dispose()
$previewCanvas.Save((Join-Path $AssetRoot "preview.png"), [Drawing.Imaging.ImageFormat]::Png)
$previewCanvas.Dispose()

$bodyAtlas.Dispose(); $hairAtlas.Dispose(); $clothingAtlas.Dispose(); $detailAtlas.Dispose()

$manifest = @{
  canvas = @($CanvasSize, $CanvasSize)
  anchors = @{ HEAD=@(384,145); NECK=@(384,235); SHOULDER_L=@(292,270); SHOULDER_R=@(476,270); HAND_L=@(225,445); HAND_R=@(543,445); WAIST=@(384,425); FOOT_L=@(310,730); FOOT_R=@(458,730); WEAPON_HAND=@(543,445) }
  body = @("male", "female"); faces = @(1,2,3); hair = @(1,2,3,4,5); tops = @(1,2,3); bottoms = @(1,2,3); shoes = @(1,2); weapons = @("kunai","sword","staff","dagger")
  source = "OpenAI built-in image generation, derived from the project technical reference"
}
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $AssetRoot "manifest.json"), $manifestJson, [Text.UTF8Encoding]::new($false))
Write-Output "Regenerated polished modular assets at $AssetRoot"
