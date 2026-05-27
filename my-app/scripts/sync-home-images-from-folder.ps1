# Copies home-*.png into my-app/assets/home-buttons and the 20 electrical-trade catalog PNGs into
# my-app/assets/button-picker so Metro bundles them for Settings → Home screen buttons.
#
# Shared laptop + PC: keep this repo (including the "images" folder) under OneDrive — Windows syncs
# the same files to both machines. Run "npm run sync:home-images" on whichever machine you edit PNGs on,
# before "npx.cmd expo start -c".
#
# Source resolution (first match wins):
#   1) IDEAL_SOLUTIONS_HOME_IMAGES — full path to your shared images folder (set in User env on each PC if needed)
#   2) %OneDrive%\Ideal Solutions\Ideal Solutions\images  (and same under OneDriveCommercial)
#   3) ..\..\images relative to this script (sibling of my-app: repo "images" folder)
$ErrorActionPreference = "Stop"

$Tail = "Ideal Solutions\Ideal Solutions\images"

function Test-SourceDir([string]$Path) {
  return (Test-Path -LiteralPath $Path -PathType Container)
}

$Source = $null
if ($env:IDEAL_SOLUTIONS_HOME_IMAGES) {
  $cand = $env:IDEAL_SOLUTIONS_HOME_IMAGES.TrimEnd('\', '/')
  if (Test-SourceDir $cand) { $Source = $cand }
}
if (-not $Source) {
  foreach ($root in @($env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial)) {
    if (-not $root) { continue }
    $cand = Join-Path $root.TrimEnd('\') $Tail
    if (Test-SourceDir $cand) {
      $Source = $cand
      break
    }
  }
}
if (-not $Source) {
  $rel = Join-Path $PSScriptRoot "..\..\images"
  if (Test-SourceDir $rel) {
    $Source = (Resolve-Path -LiteralPath $rel).Path
  }
}

$Dest = Join-Path $PSScriptRoot "..\assets\home-buttons"
if (-not (Test-Path -LiteralPath $Dest)) {
  New-Item -ItemType Directory -Path $Dest | Out-Null
}

$DestPicker = Join-Path $PSScriptRoot "..\assets\button-picker"
if (-not (Test-Path -LiteralPath $DestPicker)) {
  New-Item -ItemType Directory -Path $DestPicker | Out-Null
}

if (-not $Source) {
  Write-Warning @"
Could not find the shared images folder. Options:
  - Put PNGs in: ...\Ideal Solutions\Ideal Solutions\images  (next to my-app), inside your synced OneDrive tree, OR
  - Set user env var IDEAL_SOLUTIONS_HOME_IMAGES to that folder on each PC, then re-run this script.
"@
  exit 1
}

Write-Host "Source: $Source"

$files = Get-ChildItem -Path $Source -Filter "home-*.png" -File -ErrorAction SilentlyContinue
if (-not $files -or $files.Count -eq 0) {
  Write-Warning "No home-*.png files in: $Source"
  Write-Host "Expected names like home-materials.png, home-todo.png, etc."
  exit 0
}

Copy-Item -Path (Join-Path $Source "home-*.png") -Destination $Dest -Force
Write-Host "Copied $($files.Count) file(s) to $Dest"

$pickerNames = @(
  "saved_material_list", "voltage_check", "current_test", "circuit_breakers", "wire_testing",
  "energy_usage", "lighting_jobs", "receptacles", "panel_service", "cable_pull",
  "conduit_work", "grounding", "lockout_tagout", "plans_prints", "generator_power",
  "solar_install", "ev_charging", "transformers", "safety_first", "job_settings"
)
$pickerCopied = 0
foreach ($n in $pickerNames) {
  $p = Join-Path $Source "$n.png"
  if (Test-Path -LiteralPath $p) {
    Copy-Item -LiteralPath $p -Destination $DestPicker -Force
    $pickerCopied++
  }
}
Write-Host "Catalog: copied $pickerCopied / $($pickerNames.Count) file(s) to $DestPicker"
Write-Host "Restart Expo with cache clear if tiles look unchanged: npx.cmd expo start -c"
