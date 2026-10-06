Add-Type -AssemblyName System.Drawing

$AssetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets\modular"))
if (-not $AssetRoot.StartsWith([IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\assets")))) { throw "Ruta de salida inválida" }
New-Item -ItemType Directory -Force -Path $AssetRoot | Out-Null

function C([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Points([object[]]$coords) {
  $result = [System.Drawing.PointF[]]::new($coords.Count / 2)
  for ($i = 0; $i -lt $coords.Count; $i += 2) { $result[$i / 2] = [System.Drawing.PointF]::new($coords[$i], $coords[$i + 1]) }
  return $result
}
function Poly($g, [string]$fill, [string]$stroke, [object[]]$coords, [float]$width = 6) {
  $pts = Points $coords; $b = [System.Drawing.SolidBrush]::new((C $fill)); $p = [System.Drawing.Pen]::new((C $stroke), $width); $p.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.FillPolygon($b, $pts); $g.DrawPolygon($p, $pts); $b.Dispose(); $p.Dispose()
}
function Ellipse($g, [string]$fill, [string]$stroke, [float]$x, [float]$y, [float]$w, [float]$h, [float]$width = 6) {
  $b = [System.Drawing.SolidBrush]::new((C $fill)); $p = [System.Drawing.Pen]::new((C $stroke), $width)
  $g.FillEllipse($b, $x, $y, $w, $h); if ($width -gt 0) { $g.DrawEllipse($p, $x, $y, $w, $h) }; $b.Dispose(); $p.Dispose()
}
function Rect($g, [string]$fill, [string]$stroke, [float]$x, [float]$y, [float]$w, [float]$h, [float]$width = 6) {
  $b = [System.Drawing.SolidBrush]::new((C $fill)); $p = [System.Drawing.Pen]::new((C $stroke), $width)
  $g.FillRectangle($b, $x, $y, $w, $h); if ($width -gt 0) { $g.DrawRectangle($p, $x, $y, $w, $h) }; $b.Dispose(); $p.Dispose()
}
function Line($g, [string]$color, [float]$width, [float]$x1, [float]$y1, [float]$x2, [float]$y2) {
  $p = [System.Drawing.Pen]::new((C $color), $width); $p.StartCap = $p.EndCap = [System.Drawing.Drawing2D.LineCap]::Round; $g.DrawLine($p, $x1, $y1, $x2, $y2); $p.Dispose()
}
function Save-Layer([string]$relativePath, [scriptblock]$draw) {
  $path = Join-Path $AssetRoot $relativePath; New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path)) | Out-Null
  $bmp = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Transparent); $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias; $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  & $draw $g
  $g.Dispose(); $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}

$ink = "#172033"; $skin = "#e8b88f"; $skinShadow = "#c98d6b"

function Draw-Body($g, [bool]$female) {
  Line $g $ink 42 204 220 174 315; Line $g $skin 30 204 220 174 315
  Line $g $ink 42 304 220 334 315; Line $g $skin 30 304 220 334 315
  Line $g $ink 48 230 330 218 445; Line $g $skin 34 230 330 218 445
  Line $g $ink 48 282 330 294 445; Line $g $skin 34 282 330 294 445
  Ellipse $g $skin $ink 154 300 40 38 6; Ellipse $g $skin $ink 318 300 40 38 6
  Ellipse $g $skin $ink 198 64 116 132 7
  Rect $g $skin $ink 237 174 38 46 5
  if ($female) { Poly $g $skin $ink @(215,205,297,205,310,330,202,330) 7 } else { Poly $g $skin $ink @(205,205,307,205,300,330,212,330) 7 }
  Ellipse $g $skinShadow $ink 196 432 54 30 5; Ellipse $g $skinShadow $ink 270 432 54 30 5
}
Save-Layer "body\body_male.png" { param($g) Draw-Body $g $false }
Save-Layer "body\body_female.png" { param($g) Draw-Body $g $true }

Save-Layer "face\face_01.png" { param($g) Line $g $ink 7 220 125 239 125; Line $g $ink 7 274 123 292 120; Ellipse $g "#ffffff" $ink 219 127 22 16 3; Ellipse $g "#ffffff" $ink 273 125 22 16 3; Ellipse $g $ink $ink 229 132 6 8 0; Ellipse $g $ink $ink 280 130 6 8 0; Line $g "#9a4c52" 4 247 158 267 158 }
Save-Layer "face\face_02.png" { param($g) Line $g $ink 7 219 122 241 126; Line $g $ink 7 272 126 294 121; Line $g $ink 5 221 137 241 134; Line $g $ink 5 273 134 293 137; Line $g "#9a4c52" 4 248 158 265 158 }
Save-Layer "face\face_03.png" { param($g) Line $g $ink 7 219 124 241 122; Line $g $ink 7 273 122 295 124; Ellipse $g "#ffffff" $ink 219 127 22 17 3; Ellipse $g "#ffffff" $ink 273 127 22 17 3; Ellipse $g "#4f6f8e" $ink 228 131 7 9 1; Ellipse $g "#4f6f8e" $ink 280 131 7 9 1; Line $g "#9a4c52" 4 248 159 266 154 }

Save-Layer "hair\hair_01_rear.png" { param($g) Ellipse $g "#273147" $ink 190 48 135 122 7 }
Save-Layer "hair\hair_01_front.png" { param($g) Poly $g "#34415d" $ink @(194,112,202,72,225,54,246,74,265,49,280,76,309,62,318,112,294,101,281,119,262,96,244,119,226,94,211,116) 7 }
Save-Layer "hair\hair_02_rear.png" { param($g) Ellipse $g "#542f3d" $ink 187 45 142 170 7; Poly $g "#542f3d" $ink @(203,145,190,266,224,239,246,157) 7; Poly $g "#542f3d" $ink @(288,143,326,263,291,238,270,156) 7 }
Save-Layer "hair\hair_02_front.png" { param($g) Poly $g "#684052" $ink @(194,116,198,75,225,53,250,74,273,50,303,71,320,112,292,98,275,121,254,94,235,121,216,98) 7 }
Save-Layer "hair\hair_03_rear.png" { param($g) Ellipse $g "#274d53" $ink 188 51 140 116 7 }
Save-Layer "hair\hair_03_front.png" { param($g) Poly $g "#33707a" $ink @(190,111,200,78,181,57,222,65,230,35,251,65,270,29,279,67,319,48,309,84,330,91,302,118,282,96,263,120,242,96,220,119) 7 }
Save-Layer "hair\hair_04_rear.png" { param($g) Ellipse $g "#684a2e" $ink 189 48 137 120 7; Ellipse $g "#684a2e" $ink 300 54 75 110 7; Poly $g "#684a2e" $ink @(320,135,382,213,348,222,300,159) 7 }
Save-Layer "hair\hair_04_front.png" { param($g) Poly $g "#805d39" $ink @(193,115,201,76,229,54,251,74,274,52,307,72,319,111,292,99,276,121,254,96,235,120,215,98) 7 }
Save-Layer "hair\hair_05_rear.png" { param($g) Ellipse $g "#202633" $ink 188 49 140 122 7; Poly $g "#202633" $ink @(190,122,174,214,205,190,225,139) 7 }
Save-Layer "hair\hair_05_front.png" { param($g) Poly $g "#30394b" $ink @(191,113,198,76,223,54,245,72,267,50,301,66,322,106,294,97,278,119,257,96,238,120,217,97) 7; Rect $g "#8794a8" $ink 199 96 114 20 4 }

Save-Layer "top\top_01.png" { param($g) Poly $g "#e8edf4" $ink @(204,201,307,201,316,284,292,321,220,321,196,284) 7; Poly $g "#d9e2ed" $ink @(205,204,176,220,163,291,190,300,217,235) 6; Poly $g "#d9e2ed" $ink @(305,204,336,220,349,291,322,300,294,235) 6; Line $g "#7b8798" 9 255 205 255 315 }
Save-Layer "top\top_02.png" { param($g) Poly $g "#eef1f4" $ink @(204,201,307,201,321,286,289,324,222,324,191,286) 7; Poly $g "#bcc5d2" $ink @(204,214,180,221,164,277,189,288,216,237) 6; Poly $g "#bcc5d2" $ink @(307,214,333,221,349,277,324,288,294,237) 6; Rect $g "#7e8999" $ink 215 212 82 28 5; Line $g "#596577" 10 216 274 302 274 }
Save-Layer "top\top_03.png" { param($g) Poly $g "#f3f3f0" $ink @(206,202,305,202,314,284,292,321,220,321,198,284) 7; Poly $g "#9aa6b7" $ink @(203,211,185,205,166,239,204,251,225,225) 6; Poly $g "#9aa6b7" $ink @(307,211,327,205,347,239,307,251,287,225) 6; Rect $g "#687487" $ink 219 235 74 52 5 }

Save-Layer "bottom\bottom_01.png" { param($g) Poly $g "#e9edf2" $ink @(211,306,255,306,252,405,211,430,196,403) 7; Poly $g "#dce3eb" $ink @(255,306,301,306,316,403,276,430,258,405) 7; Line $g "#7a8798" 12 209 320 301 320 }
Save-Layer "bottom\bottom_02.png" { param($g) Poly $g "#edf0f3" $ink @(207,306,305,306,303,367,265,371,255,336,246,371,208,367) 7 }
Save-Layer "bottom\bottom_03.png" { param($g) Poly $g "#e5eaf0" $ink @(210,306,256,306,249,409,210,432,193,398) 7; Poly $g "#cfd8e3" $ink @(256,306,302,306,319,398,278,432,261,409) 7; Rect $g "#7e8999" $ink 205 381 48 22 4; Rect $g "#7e8999" $ink 261 381 48 22 4 }

Save-Layer "shoes\shoes_01.png" { param($g) Poly $g "#ecf0f3" $ink @(194,414,250,414,249,459,190,459) 6; Poly $g "#d9e0e8" $ink @(265,414,321,414,326,459,265,459) 6; Line $g "#6d798b" 7 196 438 247 438; Line $g "#6d798b" 7 268 438 321 438 }
Save-Layer "shoes\shoes_02.png" { param($g) Poly $g "#eef1f4" $ink @(194,404,251,404,248,461,187,461,190,435) 6; Poly $g "#d8dfe8" $ink @(264,404,320,404,327,461,265,461) 6; Line $g "#6d798b" 6 199 420 246 441; Line $g "#6d798b" 6 270 420 319 441 }

Save-Layer "weapon\weapon_kunai.png" { param($g) Poly $g "#aab5c4" $ink @(335,301,389,267,361,321) 5; Ellipse $g "#596577" $ink 325 302 26 26 5 }
Save-Layer "weapon\weapon_sword.png" { param($g) Poly $g "#d9e4ef" $ink @(334,313,415,203,429,216,349,326) 6; Line $g "#805638" 13 334 319 317 342; Line $g "#d5a449" 10 326 309 350 330 }
Save-Layer "weapon\weapon_staff.png" { param($g) Line $g $ink 21 338 316 407 103; Line $g "#875c35" 13 338 316 407 103 }
Save-Layer "weapon\weapon_dagger.png" { param($g) Poly $g "#d9e4ef" $ink @(335,311,383,258,394,270,348,324) 5; Line $g "#7b4e36" 12 338 319 322 336 }

$manifest = @{
  canvas = @(512, 512)
  anchors = @{ HEAD=@(256,130); NECK=@(256,194); SHOULDER_L=@(204,220); SHOULDER_R=@(304,220); HAND_L=@(174,319); HAND_R=@(338,319); WAIST=@(256,320); FOOT_L=@(220,459); FOOT_R=@(294,459); WEAPON_HAND=@(338,319) }
  body = @("male", "female"); faces = @(1,2,3); hair = @(1,2,3,4,5); tops = @(1,2,3); bottoms = @(1,2,3); shoes = @(1,2); weapons = @("kunai","sword","staff","dagger")
}
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $AssetRoot "manifest.json"), $manifestJson, [System.Text.UTF8Encoding]::new($false))
Write-Output "Generated modular assets at $AssetRoot"
