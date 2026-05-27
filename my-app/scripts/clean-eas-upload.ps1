# Remove local folders that must not be uploaded to EAS (especially with EAS_NO_VCS=1).
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

foreach ($dir in @('.expo', 'android', 'ios')) {
  if (-not (Test-Path $dir)) { continue }
  Write-Host "Removing $dir ..."
  cmd /c "rmdir /s /q `"$dir`"" 2>$null
  if (Test-Path $dir) {
    npx --yes rimraf $dir 2>$null
  }
  if (Test-Path $dir) {
    Write-Warning "Could not fully remove $dir (OneDrive path length?). Rename or move project off OneDrive, then delete manually."
    exit 1
  }
}

Write-Host 'EAS upload cleanup done.'
