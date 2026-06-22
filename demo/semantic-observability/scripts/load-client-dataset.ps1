param(
  [Parameter(Mandatory = $true)]
  [string]$DatasetConfig,

  [string]$ControlPlaneUrl = "http://localhost:3501",
  [string]$HttpDataPlaneUrl = "http://localhost:3502",
  [switch]$RefreshSnapshots
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message =="
}

function Invoke-DemoJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [string]$JsonBody = $null
  )

  $headers = @{ Accept = "application/json" }
  if ([string]::IsNullOrWhiteSpace($JsonBody)) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -TimeoutSec 30
  }

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $Uri `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $JsonBody `
    -TimeoutSec 30
}

$configPath = Resolve-Path -Path $DatasetConfig
$datasetJson = Get-Content -Path $configPath -Raw

try {
  $datasetJson | ConvertFrom-Json | Out-Null
} catch {
  throw "Dataset config is not valid JSON: $($_.Exception.Message)"
}

Write-Step "Checking services"
Invoke-DemoJson -Method GET -Uri "$ControlPlaneUrl/health" | Out-Null
Write-Host "Control Plane reachable at $ControlPlaneUrl"
Invoke-DemoJson -Method GET -Uri "$HttpDataPlaneUrl/health" | Out-Null
Write-Host "HTTP Data Plane reachable at $HttpDataPlaneUrl"

Write-Step "Loading client dataset config"
Invoke-DemoJson `
  -Method PUT `
  -Uri "$HttpDataPlaneUrl/api/management/config" `
  -JsonBody $datasetJson | Out-Null
Write-Host "Loaded dataset config from $configPath"

Write-Step "Refreshing Data Plane registration/catalog synchronization"
Invoke-DemoJson -Method POST -Uri "$HttpDataPlaneUrl/api/management/refresh" | Out-Null
Write-Host "Data Plane registration refresh requested."

if ($RefreshSnapshots) {
  Write-Step "Refreshing semantic observability snapshots"
  Invoke-DemoJson `
    -Method POST `
    -Uri "$ControlPlaneUrl/api/management/semantic-observability/combined/report/snapshots/refresh?bucket=hour" | Out-Null
  Write-Host "Combined hourly snapshots refreshed."
}

Write-Step "Recent combined observability events"
$events = Invoke-DemoJson `
  -Method GET `
  -Uri "$ControlPlaneUrl/api/management/semantic-observability/combined/events?take=12&order=DESC&order_by=timestamp"
$events.data |
  Select-Object timestamp, component, eventType, status, failureCategory |
  Format-Table -AutoSize

Write-Step "Current combined report"
$report = Invoke-DemoJson `
  -Method GET `
  -Uri "$ControlPlaneUrl/api/management/semantic-observability/combined/report"
Write-Host "Adoption metrics:  $($report.adoption.Count)"
Write-Host "Friction metrics:  $($report.friction.Count)"
Write-Host "Evolution metrics: $($report.evolution.Count)"
Write-Host "Stability metrics: $($report.stability.Count)"

Write-Host ""
Write-Host "Client dataset loaded."
Write-Host "Control Plane observability UI: $ControlPlaneUrl/semantic-observability"
Write-Host "HTTP Data Plane observability UI: $HttpDataPlaneUrl/semantic-observability"
