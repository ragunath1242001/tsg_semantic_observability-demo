param(
  [string]$EnvPath
)

. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
if (!$EnvPath) {
  $EnvPath = Join-Path $root ".env"
}

$envValues = Read-EnvFile $EnvPath
$participantId = Require-EnvValue $envValues "PARTICIPANT_ID"
$apiKey = Require-EnvValue $envValues "SDO_API_KEY"
$endpoint = Require-EnvValue $envValues "SDO_OBSERVABILITY_ENDPOINT"
$hostEndpoint = Convert-ToHostReachableUrl $endpoint
$sdoBaseUrl = $hostEndpoint -replace "/api/ingest/events$", ""

Write-Host "Checking SDO health at $sdoBaseUrl"
Invoke-RestMethod -Method GET -Uri "$sdoBaseUrl/api/health" -TimeoutSec 30 | Out-Null

Write-Host "Checking participant credentials for $participantId"
$me = Invoke-RestMethod `
  -Method GET `
  -Uri "$sdoBaseUrl/api/participants/me" `
  -Headers @{
    "X-SDO-Participant-Id" = $participantId
    "X-SDO-API-Key" = $apiKey
  } `
  -TimeoutSec 30

Write-Host "SDO connection OK."
Write-Host "Participant: $($me.participantId)"
Write-Host "Display:     $($me.displayName)"
Write-Host "Status:      $($me.status)"
