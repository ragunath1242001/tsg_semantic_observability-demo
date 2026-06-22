$ErrorActionPreference = "Stop"

$demoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $demoRoot "docker-compose.yml"

docker compose -f $composeFile up --build -d

& (Join-Path $PSScriptRoot "wait-for-health.ps1") -Urls @(
  "http://localhost:3501/health",
  "http://localhost:3502/health"
)

Write-Host ""
Write-Host "Semantic observability demo is running."
Write-Host "Control Plane API and UI: http://localhost:3501"
Write-Host "HTTP Data Plane API and UI: http://localhost:3502"
Write-Host "Control Plane observability UI: http://localhost:3501/semantic-observability"
Write-Host "HTTP Data Plane observability UI: http://localhost:3502/semantic-observability"
Write-Host ""
Write-Host "Run evidence script:"
Write-Host ".\demo\semantic-observability\scripts\run-smoke-demo.ps1"
