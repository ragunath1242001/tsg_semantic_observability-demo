param(
  [string]$EnvPath
)

. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
if (!$EnvPath) {
  $EnvPath = Join-Path $root ".env"
}

$envValues = Read-EnvFile $EnvPath
$publicHost = Require-EnvValue $envValues "PUBLIC_HOST"
$controlPlanePort = Require-EnvValue $envValues "CONTROL_PLANE_PORT"
$dataPlanePort = Require-EnvValue $envValues "DATA_PLANE_PORT"

$hostPublicHost = (Convert-ToHostReachableUrl "http://$publicHost") -replace "^http://", ""
$controlPlane = "http://$hostPublicHost`:$controlPlanePort"
$dataPlane = "http://$hostPublicHost`:$dataPlanePort"

Invoke-WebRequest -UseBasicParsing -Uri "$controlPlane/health" -TimeoutSec 30 | Out-Null
Write-Host "Control Plane healthy at $controlPlane"

Invoke-WebRequest -UseBasicParsing -Uri "$dataPlane/health" -TimeoutSec 30 | Out-Null
Write-Host "Data Plane healthy at $dataPlane"
