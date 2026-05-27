# Copies image files into my-app/assets/settings/images/home-screen-buttons
#
# Source (first match wins):
#   1) IDEAL_SOLUTIONS_HOME_SCREEN_BUTTONS - full path to your folder of images (e.g. OneDrive\...\Ideal Solutions\Ideal Solutions\home screen buttons)
#   2) Sibling folder next to my-app: <parent of my-app>\home screen buttons
#   3) Legacy: ...\images\home-screen-buttons (same parent as sync:home-images, then subfolder home-screen-buttons)
$ErrorActionPreference = "Stop"

$ImageExtensions = @(
  ".bmp", ".gif", ".jpg", ".jpeg", ".jfif", ".jpe", ".png", ".webp", ".svg",
  ".tif", ".tiff", ".ico", ".avif", ".heic", ".heif"
)

function Test-SourceDir([string]$Path) {
  return (Test-Path -LiteralPath $Path -PathType Container)
}

function Test-ImageFile([System.IO.FileInfo]$File) {
  $ext = $File.Extension.ToLowerInvariant()
  return $ImageExtensions -contains $ext
}

$Dest = Join-Path $PSScriptRoot "..\assets\settings\images\home-screen-buttons"
if (-not (Test-Path -LiteralPath $Dest)) {
  New-Item -ItemType Directory -Path $Dest | Out-Null
}

$Source = $null

if ($env:IDEAL_SOLUTIONS_HOME_SCREEN_BUTTONS) {
  $c = $env:IDEAL_SOLUTIONS_HOME_SCREEN_BUTTONS.TrimEnd('\', '/')
  if (Test-SourceDir $c) {
    $Source = $c
  }
  else {
    Write-Warning "IDEAL_SOLUTIONS_HOME_SCREEN_BUTTONS is set but folder not found: $c"
  }
}

# Sibling of my-app: ...\Ideal Solutions\Ideal Solutions\home screen buttons
if (-not $Source) {
  $myAppRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
  $idealSolutionsRoot = Split-Path -Parent $myAppRoot.Path
  $sibling = Join-Path $idealSolutionsRoot "home screen buttons"
  if (Test-SourceDir $sibling) {
    $Source = $sibling
  }
}

# Legacy: images\home-screen-buttons under shared "images" parent
if (-not $Source) {
  $Tail = "Ideal Solutions\Ideal Solutions\images"
  $SourceRoot = $null
  if ($env:IDEAL_SOLUTIONS_HOME_IMAGES) {
    $cand = $env:IDEAL_SOLUTIONS_HOME_IMAGES.TrimEnd('\', '/')
    if (Test-SourceDir $cand) { $SourceRoot = $cand }
  }
  if (-not $SourceRoot) {
    foreach ($root in @($env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial)) {
      if (-not $root) { continue }
      $cand = Join-Path $root.TrimEnd('\') $Tail
      if (Test-SourceDir $cand) {
        $SourceRoot = $cand
        break
      }
    }
  }
  if (-not $SourceRoot) {
    $rel = Join-Path $PSScriptRoot "..\..\images"
    if (Test-SourceDir $rel) {
      $SourceRoot = (Resolve-Path -LiteralPath $rel).Path
    }
  }
  if ($SourceRoot) {
    $nested = Join-Path $SourceRoot "home-screen-buttons"
    if (Test-SourceDir $nested) {
      $Source = $nested
    }
  }
}

if (-not $Source) {
  Write-Warning @"
Could not find a home screen buttons image folder. Use one of:
  - Put images in:  ...\Ideal Solutions\Ideal Solutions\home screen buttons  (next to the my-app folder), OR
  - Set user env var IDEAL_SOLUTIONS_HOME_SCREEN_BUTTONS to that full path, OR
  - Legacy: ...\images\home-screen-buttons  (under the same parent used for sync:home-images)
"@
  exit 1
}

Write-Host "Source: $Source"

$files = Get-ChildItem -LiteralPath $Source -File -ErrorAction SilentlyContinue | Where-Object { Test-ImageFile $_ }
if (-not $files -or $files.Count -eq 0) {
  Write-Warning "No supported image files in: $Source (extensions: $($ImageExtensions -join ', '))"
  exit 0
}

foreach ($f in $files) {
  Copy-Item -LiteralPath $f.FullName -Destination $Dest -Force
}
Write-Host "Copied $($files.Count) file(s) to $Dest"
Write-Host "Restart Expo with cache clear if you added or renamed files: npx.cmd expo start -c"
