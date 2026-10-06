Add-Type -AssemblyName System.Drawing

$AssetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\modular"))
$SourceRoot = Join-Path $AssetRoot "source"
$CanvasSize = 768

function New-Canvas {
  return [Drawing.Bitmap]::new($CanvasSize, $CanvasSize, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Get-Cell([Drawing.Bitmap]$atlas, [int]$column, [int]$row, [int]$columns, [int]$rows) {
  $left = [Math]::Round($atlas.Width * $column / $columns)
  $top = [Math]::Round($atlas.Height * $row / $rows)
  $right = [Math]::Round($atlas.Width * ($column + 1) / $columns)
  $bottom = [Math]::Round($atlas.Height * ($row + 1) / $rows)
  $cell = [Drawing.Bitmap]::new($right - $left, $bottom - $top, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($cell)
  $graphics.DrawImage($atlas, [Drawing.Rectangle]::new(0, 0, $cell.Width, $cell.Height), [Drawing.Rectangle]::new($left, $top, $cell.Width, $cell.Height), [Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  return $cell
}

function Clean-Alpha([Drawing.Bitmap]$bitmap) {
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      if ($pixel.A -lt 42) {
        $bitmap.SetPixel($x, $y, [Drawing.Color]::Transparent)
      } elseif ($pixel.A -lt 150) {
        $alpha = [Math]::Min(255, [Math]::Max(0, [Math]::Round(($pixel.A - 42) * 255 / 108)))
        $bitmap.SetPixel($x, $y, [Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }
}

function Get-ContentBounds([Drawing.Bitmap]$bitmap, [double]$trimBottom = 0) {
  $minX = $bitmap.Width; $minY = $bitmap.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      if ($bitmap.GetPixel($x, $y).A -gt 32) {
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

function Save-Cell([Drawing.Bitmap]$atlas, [int]$column, [int]$row, [int]$columns, [int]$rows, [Drawing.Rectangle]$target, [string]$relativePath, [double]$trimBottom = 0) {
  $cell = Get-Cell $atlas $column $row $columns $rows
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

Save-Cell $bodyAtlas 0 0 2 1 ([Drawing.Rectangle]::new(140, 18, 488, 720)) "body\body_male.png"
Save-Cell $bodyAtlas 1 0 2 1 ([Drawing.Rectangle]::new(140, 18, 488, 720)) "body\body_female.png"
Clear-Below "body\body_male.png" 632
Clear-Below "body\body_female.png" 632

for ($index = 0; $index -lt 3; $index++) {
  Save-Cell $detailAtlas $index 0 4 2 ([Drawing.Rectangle]::new(260, 96, 248, 124)) ("face\face_0{0}.png" -f ($index + 1))
}

$hairTargets = @(
  [Drawing.Rectangle]::new(184, 8, 400, 250),
  [Drawing.Rectangle]::new(170, 4, 428, 360),
  [Drawing.Rectangle]::new(164, 0, 440, 270),
  [Drawing.Rectangle]::new(154, 2, 460, 360),
  [Drawing.Rectangle]::new(160, 0, 448, 300)
)
for ($index = 0; $index -lt 5; $index++) {
  Save-Blank ("hair\hair_0{0}_rear.png" -f ($index + 1))
  Save-Cell $hairAtlas $index 0 5 1 $hairTargets[$index] ("hair\hair_0{0}_front.png" -f ($index + 1))
}

for ($index = 0; $index -lt 3; $index++) {
  Save-Cell $clothingAtlas $index 0 5 2 ([Drawing.Rectangle]::new(166, 218, 436, 286)) ("top\top_0{0}.png" -f ($index + 1))
  Save-Cell $clothingAtlas $index 1 5 2 ([Drawing.Rectangle]::new(170, 410, 428, 270)) ("bottom\bottom_0{0}.png" -f ($index + 1)) 0.18
}
Save-Cell $clothingAtlas 3 1 5 2 ([Drawing.Rectangle]::new(144, 620, 480, 122)) "shoes\shoes_01.png"
Save-Cell $clothingAtlas 4 1 5 2 ([Drawing.Rectangle]::new(144, 620, 480, 122)) "shoes\shoes_02.png"

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

$bodyAtlas.Dispose(); $hairAtlas.Dispose(); $clothingAtlas.Dispose(); $detailAtlas.Dispose()

$manifest = @{
  canvas = @($CanvasSize, $CanvasSize)
  anchors = @{ HEAD=@(384,145); NECK=@(384,235); SHOULDER_L=@(292,270); SHOULDER_R=@(476,270); HAND_L=@(225,445); HAND_R=@(543,445); WAIST=@(384,425); FOOT_L=@(310,730); FOOT_R=@(458,730); WEAPON_HAND=@(543,445) }
  body = @("male", "female"); faces = @(1,2,3); hair = @(1,2,3,4,5); tops = @(1,2,3); bottoms = @(1,2,3); shoes = @(1,2); weapons = @("kunai","sword","staff","dagger")
  source = "OpenAI built-in image generation, derived from the project technical reference"
}
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $AssetRoot "manifest.json"), $manifestJson, [Text.UTF8Encoding]::new($false))
Write-Output "Generated illustrated modular assets at $AssetRoot"
