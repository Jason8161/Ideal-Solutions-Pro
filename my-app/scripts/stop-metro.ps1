# Stops stale Metro / Expo dev servers on 8081 and 8082 (common cause of "couldn't connect to server").
$ErrorActionPreference = "SilentlyContinue"
$ports = 8081, 8082
$stopped = @()

foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port\s"
  foreach ($line in $lines) {
    $pid = ($line -split '\s+')[-1]
    if ($pid -match '^\d+$' -and $pid -notin $stopped) {
      Stop-Process -Id ([int]$pid) -Force
      $stopped += $pid
      Write-Host "Stopped PID $pid (port $port)"
    }
  }
}

if ($stopped.Count -eq 0) {
  Write-Host "No listeners on 8081/8082."
} else {
  Write-Host "Done. Start Expo with: npm run start:lan"
}
