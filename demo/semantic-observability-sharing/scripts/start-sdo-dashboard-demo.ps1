param(
  [string]$SdoUrl = "http://localhost:4100",
  [switch]$ExternalSdo,
  [switch]$Build
)

$ErrorActionPreference = "Stop"

$SdoUrl = $SdoUrl.TrimEnd("/")
$demoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeFile = Join-Path $demoRoot "docker-compose.yml"
$envFile = Join-Path $demoRoot ".env"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message =="
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null
  )

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -TimeoutSec 90
  }

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $Uri `
    -ContentType "application/json" `
    -Body ($Body | ConvertTo-Json -Depth 20) `
    -TimeoutSec 90
}

function Wait-ForSdo {
  param([string]$HealthUrl)

  for ($i = 1; $i -le 60; $i++) {
    try {
      $health = Invoke-Json -Method GET -Uri $HealthUrl
      if ($health.status -eq "ok") {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "SDO service did not become healthy at $HealthUrl"
}

function Register-Participant {
  param(
    [string]$DisplayName,
    [string]$Description
  )

  Invoke-Json `
    -Method POST `
    -Uri "$SdoUrl/api/participants/register" `
    -Body @{
      displayName = $DisplayName
      systemDescription = $Description
    }
}

if (-not $ExternalSdo) {
  Write-Step "Starting local central SDO dashboard"
  $upArgs = @("compose", "-f", $composeFile, "up", "-d")
  if ($Build) {
    $upArgs += "--build"
  }
  $upArgs += "sdo-observability"
  docker @upArgs
} else {
  Write-Step "Using external central SDO dashboard"
}

Wait-ForSdo "$SdoUrl/api/health"

Write-Step "Registering local Alfa and Bravo demo participants"
$alfa = Register-Participant `
  -DisplayName "Alfa local demo" `
  -Description "Provider-side TSG services in the local SDO dashboard demo"
$bravo = Register-Participant `
  -DisplayName "Bravo local demo" `
  -Description "Consumer-side TSG services in the local SDO dashboard demo"

$exportEndpoint = "http://sdo-observability:4100/api/ingest/events"
if ($ExternalSdo) {
  $exportEndpoint = $alfa.endpoint
  if (-not $exportEndpoint) {
    $exportEndpoint = "$SdoUrl/api/ingest/events"
  }
}

@(
  "SDO_OBSERVABILITY_ENDPOINT=$exportEndpoint",
  "SDO_ALFA_PARTICIPANT_ID=$($alfa.participantId)",
  "SDO_ALFA_API_KEY=$($alfa.apiKey)",
  "SDO_BRAVO_PARTICIPANT_ID=$($bravo.participantId)",
  "SDO_BRAVO_API_KEY=$($bravo.apiKey)"
) | Set-Content -Path $envFile -Encoding utf8

Write-Host "Wrote local SDO participant credentials to $envFile"

Write-Step "Starting local Alfa and Bravo TSG services"
$allArgs = @("compose", "-f", $composeFile, "up", "-d")
if ($Build) {
  $allArgs += "--build"
}
docker @allArgs

Write-Step "Open"
Write-Host "Central SDO dashboard:         $SdoUrl"
Write-Host "Alfa Control Plane UI/API:     http://localhost:3701"
Write-Host "Alfa Data Plane UI/API:        http://localhost:3702"
Write-Host "Bravo Control Plane UI/API:    http://localhost:3801"
Write-Host "Bravo Data Plane UI/API:       http://localhost:3802"
Write-Host ""
Write-Host "Run the local demo flow:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1"
