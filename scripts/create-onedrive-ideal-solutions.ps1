# Creates "Ideal Solutions" under personal OneDrive (first match found).
$candidates = @()
if ($env:OneDriveConsumer) { $candidates += $env:OneDriveConsumer }
if ($env:OneDrive) { $candidates += $env:OneDrive }
$candidates += @(
    (Join-Path $env:USERPROFILE "OneDrive - Personal")
    (Join-Path $env:USERPROFILE "OneDrive")
)
$created = @()
foreach ($base in ($candidates | Select-Object -Unique)) {
    if ($base -and (Test-Path -LiteralPath $base)) {
        $dest = Join-Path $base "Ideal Solutions"
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        $created += $dest
    }
}
if ($created.Count -eq 0) {
    Write-Error "No OneDrive folder found. Set OneDrive or create OneDrive manually."
    exit 1
}
$created | ForEach-Object { Write-Host "Created or exists: $_" }
