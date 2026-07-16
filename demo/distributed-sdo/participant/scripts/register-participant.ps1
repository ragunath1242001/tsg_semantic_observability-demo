param(
  [Parameter(Mandatory = $true)]
  [string]$SdoUrl,

  [Parameter(Mandatory = $true)]
  [string]$DisplayName,

  [string]$SystemDescription = "TSG distributed SDO participant",

  [string]$SdoExportUrl,

  [string]$PublicHost,

  [string]$ControlPlanePort,

  [string]$DataPlanePort
)

. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
$envPath = Join-Path $root ".env"
$examplePath = Join-Path $root ".env.example"

if (!(Test-Path $envPath)) {
  Copy-Item $examplePath $envPath
}

$envValues = Read-EnvFile $envPath
$body = @{
  displayName = $DisplayName
  systemDescription = $SystemDescription
} | ConvertTo-Json

$registration = Invoke-RestMethod `
  -Method POST `
  -Uri "$($SdoUrl.TrimEnd('/'))/api/participants/register" `
  -ContentType "application/json" `
  -Body $body `
  -TimeoutSec 30

$sdoEndpoint = $registration.endpoint
if ($SdoExportUrl) {
  $sdoEndpoint = "$($SdoExportUrl.TrimEnd('/'))/api/ingest/events"
}

$updates = [ordered]@{
  PARTICIPANT_ID = $registration.participantId
  PARTICIPANT_DISPLAY_NAME = $DisplayName
  COMPOSE_PROJECT_NAME = "tsg-$(Convert-ToComposeProjectName $registration.participantId)"
  SDO_API_KEY = $registration.apiKey
  SDO_OBSERVABILITY_ENDPOINT = $sdoEndpoint
}

if ($PublicHost) {
  $updates["PUBLIC_HOST"] = $PublicHost
}
if ($ControlPlanePort) {
  $updates["CONTROL_PLANE_PORT"] = $ControlPlanePort
}
if ($DataPlanePort) {
  $updates["DATA_PLANE_PORT"] = $DataPlanePort
}

$merged = Merge-EnvValues -Base $envValues -Updates $updates
Write-EnvFile -Path $envPath -Values $merged

Write-Host "Registered participant with SDO."
Write-Host "Participant ID: $($registration.participantId)"
Write-Host "Endpoint:       $sdoEndpoint"
Write-Host "Updated:        $envPath"
Write-Host ""
Write-Host "Keep the generated SDO_API_KEY private."
