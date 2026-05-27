# Run EAS builds without Git (Windows / no VCS on PATH).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$EasArgs
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = $ProjectRoot

if ($EasArgs.Count -eq 0) {
  Write-Host 'Usage: .\scripts\eas-build.ps1 build --profile preview --platform ios [--non-interactive]'
  exit 1
}

npx eas-cli @EasArgs
