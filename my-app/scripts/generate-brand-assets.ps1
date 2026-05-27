# Regenerates app icon + splash PNGs (run from my-app folder).
# Replace assets/images/splash-icon.png with your own file anytime for a custom logo.

$dir = Join-Path $PSScriptRoot "..\assets\images"
Add-Type -AssemblyName System.Drawing

function Save-Png($path, $w, $h, [scriptblock]$draw) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  & $draw $g $w $h
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

# Charcoal metal — matches app-background / splash (avoid navy #0B1F3A “blue box” on launch).
$bg = [System.Drawing.Color]::FromArgb(255, 20, 18, 16)
$orange = [System.Drawing.Color]::FromArgb(255, 255, 140, 0)

Save-Png (Join-Path $dir "splash-icon.png") 480 560 {
  param($g, $w, $h)
  $g.Clear($bg)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $orange), [int]($w / 2 - 70), 80, 140, 140)
  $bolt = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bolt.AddPolygon(@(
      [System.Drawing.Point]::new([int]($w / 2), 95),
      [System.Drawing.Point]::new([int]($w / 2 + 35), 175),
      [System.Drawing.Point]::new([int]($w / 2 + 8), 175),
      [System.Drawing.Point]::new([int]($w / 2 + 28), 215),
      [System.Drawing.Point]::new([int]($w / 2 - 35), 155),
      [System.Drawing.Point]::new([int]($w / 2 - 8), 155),
      [System.Drawing.Point]::new([int]($w / 2 - 18), 95)
    ))
  $g.FillPath([System.Drawing.Brushes]::White, $bolt)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $font = [System.Drawing.Font]::new("Segoe UI", 34, [System.Drawing.FontStyle]::Bold)
  $sub = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Italic)
  $g.DrawString("IDEAL", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 280, $w, 50), $sf)
  $g.DrawString("SOLUTIONS", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 330, $w, 50), $sf)
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 199, 216, 255))
  $g.DrawString("Electrical contractor tools", $sub, $muted, (New-Object System.Drawing.RectangleF 0, 390, $w, 30), $sf)
}

Save-Png (Join-Path $dir "icon.png") 1024 1024 {
  param($g, $w, $h)
  $g.Clear($bg)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $orange), 312, 200, 400, 400)
  $bolt = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bolt.AddPolygon(@(
      [System.Drawing.Point]::new(512, 240),
      [System.Drawing.Point]::new(620, 420),
      [System.Drawing.Point]::new(545, 420),
      [System.Drawing.Point]::new(590, 520),
      [System.Drawing.Point]::new(404, 380),
      [System.Drawing.Point]::new(479, 380),
      [System.Drawing.Point]::new(460, 240)
    ))
  $g.FillPath([System.Drawing.Brushes]::White, $bolt)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $font = [System.Drawing.Font]::new("Segoe UI", 72, [System.Drawing.FontStyle]::Bold)
  $g.DrawString("IS", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 640, $w, 120), $sf)
}

Copy-Item (Join-Path $dir "icon.png") (Join-Path $dir "favicon.png") -Force
# Transparent adaptive-icon layer (foreground art only; no solid plate).
Save-Png (Join-Path $dir "android-icon-background.png") 1 1 {
  param($g, $w, $h)
  $g.Clear([System.Drawing.Color]::Transparent)
}
Copy-Item (Join-Path $dir "icon.png") (Join-Path $dir "android-icon-monochrome.png") -Force
Copy-Item (Join-Path $dir "splash-icon.png") (Join-Path $dir "android-icon-foreground.png") -Force

Write-Host "Wrote brand assets to $dir"
