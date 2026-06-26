# Configure Ideal Solutions AI Assistance (local dev + EAS/TestFlight checklist).
# Usage: npm run setup:ai
#        npm run setup:ai -- -UpdateLanIp

param(
  [switch]$UpdateLanIp
)

$ErrorActionPreference = "Stop"

$MyAppRoot = Split-Path $PSScriptRoot -Parent
$BackendRoot = Join-Path (Split-Path $MyAppRoot -Parent) "pricing-backend"
$AppEnv = Join-Path $MyAppRoot ".env"
$BackendEnv = Join-Path $BackendRoot ".env"
$BackendEnvExample = Join-Path $BackendRoot ".env.example"

function Get-LanIPv4 {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.InterfaceAlias -notmatch "Loopback" -and
      $_.IPAddress -notmatch "^169\." -and
      $_.IPAddress -notmatch "^127\."
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) {
    throw "Could not detect LAN IPv4. Run ipconfig and set EXPO_PUBLIC_PRICING_API_URL manually."
  }
  return $ip
}

function Set-EnvLine {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$Value
  )
  $line = "${Key}=${Value}"
  if (-not (Test-Path $FilePath)) {
    Set-Content -Path $FilePath -Value $line -Encoding utf8
    return
  }
  $content = Get-Content $FilePath -Raw
  if ($content -match "(?m)^${Key}=.*$") {
    $content = [regex]::Replace($content, "(?m)^${Key}=.*$", $line)
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
    $content += "${line}`n"
  }
  Set-Content -Path $FilePath -Value $content.TrimEnd() -Encoding utf8 -NoNewline
  Add-Content -Path $FilePath -Value "" -Encoding utf8
}

Write-Host ""
Write-Host "=== Ideal Solutions AI Assistance setup ===" -ForegroundColor Cyan
Write-Host ""

# --- pricing-backend ---
if (-not (Test-Path $BackendRoot)) {
  Write-Warning "pricing-backend not found at: $BackendRoot"
} else {
  if (-not (Test-Path $BackendEnv) -and (Test-Path $BackendEnvExample)) {
    Copy-Item $BackendEnvExample $BackendEnv
    Write-Host "Created pricing-backend/.env from .env.example"
  }

  $openAiSet = $false
  if (Test-Path $BackendEnv) {
    $openAiSet = Select-String -Path $BackendEnv -Pattern '^\s*OPENAI_API_KEY=\S+' -Quiet
  }

  if ($openAiSet) {
    Write-Host "[OK] pricing-backend/.env has OPENAI_API_KEY" -ForegroundColor Green
  } else {
    Write-Host "[!!] pricing-backend/.env missing OPENAI_API_KEY" -ForegroundColor Yellow
    Write-Host "     Edit $BackendEnv"
    Write-Host "     Add: OPENAI_API_KEY=sk-...  (from https://platform.openai.com/api-keys)"
  }
}

# --- my-app .env ---
$lanIp = Get-LanIPv4
$apiUrl = "http://${lanIp}:3001"

if (-not (Test-Path $AppEnv)) {
  $example = Join-Path $MyAppRoot ".env.example"
  if (Test-Path $example) {
    Copy-Item $example $AppEnv
    Write-Host "Created my-app/.env from .env.example"
  }
}

$currentUrl = $null
if (Test-Path $AppEnv) {
  $match = Select-String -Path $AppEnv -Pattern '^\s*EXPO_PUBLIC_PRICING_API_URL=(.*)$' | Select-Object -First 1
  if ($match) { $currentUrl = $match.Matches[0].Groups[1].Value.Trim() }
}

$shouldWrite = $UpdateLanIp -or [string]::IsNullOrWhiteSpace($currentUrl)
if ($shouldWrite) {
  Set-EnvLine -FilePath $AppEnv -Key "EXPO_PUBLIC_PRICING_API_URL" -Value $apiUrl
  Write-Host "[OK] my-app/.env EXPO_PUBLIC_PRICING_API_URL=$apiUrl" -ForegroundColor Green
} else {
  Write-Host "[OK] my-app/.env EXPO_PUBLIC_PRICING_API_URL=$currentUrl" -ForegroundColor Green
  Write-Host "     (use -UpdateLanIp to refresh to $apiUrl)"
}

# --- health check ---
Write-Host ""
Write-Host "Checking pricing-backend at http://127.0.0.1:3001/health ..." -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:3001/health" -TimeoutSec 5
  if ($health.aiAssistanceConfigured) {
    Write-Host "[OK] Backend running - aiAssistanceConfigured=true" -ForegroundColor Green
  } else {
    Write-Host "[!!] Backend running but aiAssistanceConfigured=false - set OPENAI_API_KEY" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[!!] pricing-backend not reachable on port 3001" -ForegroundColor Yellow
  Write-Host "     Start it: cd `"$BackendRoot`"; npm run dev"
}

Write-Host ""
Write-Host "=== Local dev (Expo Go / dev client + Metro) ===" -ForegroundColor Cyan
Write-Host "1. Terminal 1: cd `"$BackendRoot`"; npm run dev"
Write-Host "2. Terminal 2: cd `"$MyAppRoot`"; npx expo start -c --host lan"
Write-Host "3. AI route: POST ${apiUrl}/api/ai-assistance"
Write-Host ""

Write-Host "=== EAS / TestFlight (required for preview & production builds) ===" -ForegroundColor Cyan
Write-Host "EAS cloud builds do NOT upload my-app/.env. Set EXPO_PUBLIC_PRICING_API_URL in EAS, then rebuild."
Write-Host ""
Write-Host "# Same Wi-Fi LAN testing (phone + PC on same network):"
Write-Host "npx eas env:create --name EXPO_PUBLIC_PRICING_API_URL --value `"$apiUrl`" --environment preview --visibility plaintext"
Write-Host ""
Write-Host "# Production / public API (recommended for TestFlight outside your LAN):"
Write-Host "npx eas env:create --name EXPO_PUBLIC_PRICING_API_URL --value `"https://api.yourdomain.com`" --environment preview --visibility plaintext"
Write-Host "npx eas env:create --name EXPO_PUBLIC_PRICING_API_URL --value `"https://api.yourdomain.com`" --environment production --visibility plaintext"
Write-Host ""
Write-Host "# Deploy pricing-backend with OPENAI_API_KEY in server .env (never in the mobile app)."
Write-Host ""
Write-Host "# Rebuild TestFlight:"
Write-Host "npm run eas:build:preview:ios"
Write-Host ""
