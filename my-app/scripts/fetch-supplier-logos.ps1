# Downloads 128px favicons into assets/images/suppliers/{id}.png
$ErrorActionPreference = "Stop"
$dir = Join-Path $PSScriptRoot "..\assets\images\suppliers"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$suppliers = @{
  homedepot        = "homedepot.com"
  lowes            = "lowes.com"
  grainger         = "grainger.com"
  graybar          = "graybar.com"
  rexel            = "rexelusa.com"
  cityelectric     = "cityelectricsupply.com"
  ferguson         = "ferguson.com"
  platt            = "platt.com"
  amazon           = "amazon.com"
  fastenal         = "fastenal.com"
  menards          = "menards.com"
  ace              = "acehardware.com"
  truevalue        = "truevalue.com"
  harbor_freight   = "harborfreight.com"
}

foreach ($entry in $suppliers.GetEnumerator()) {
  $out = Join-Path $dir "$($entry.Key).png"
  $url = "https://www.google.com/s2/favicons?domain=$($entry.Value)&sz=128"
  try {
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -TimeoutSec 30
    Write-Host "OK $($entry.Key)"
  } catch {
    if ($entry.Key -eq "fastenal") {
      Invoke-WebRequest -Uri "https://icons.duckduckgo.com/ip3/fastenal.com.ico" -OutFile $out -UseBasicParsing -TimeoutSec 30
      Write-Host "OK fastenal (fallback)"
    } else {
      Write-Warning "FAILED $($entry.Key): $($_.Exception.Message)"
    }
  }
}
