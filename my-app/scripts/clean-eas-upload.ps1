# Remove local folders that must not be uploaded to EAS (especially with EAS_NO_VCS=1).
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Remove-TreeForce($dir) {
  if (-not (Test-Path $dir)) { return $true }
  Write-Host "Removing $dir ..."
  cmd /c "attrib -R `"$dir`" /S /D" 2>$null
  cmd /c "rmdir /s /q `"$dir`"" 2>$null
  if (Test-Path $dir) {
    npx --yes rimraf $dir 2>$null
  }
  return -not (Test-Path $dir)
}

$ok = $true
foreach ($dir in @(
    '.expo',
    '.expo-export-test',
    '.expo-export-test-build34',
    '.expo-export-ipad-test',
    '.expo-export-ios-review',
    'dist',
    'dist-test-export',
    'android',
    'ios'
  )) {
  if (-not (Remove-TreeForce $dir)) {
    Write-Warning "Could not fully remove $dir (OneDrive path length?). Clear read-only, then delete manually."
    $ok = $false
  }
}

if (-not $ok) { exit 1 }
Write-Host 'EAS upload cleanup done.'
