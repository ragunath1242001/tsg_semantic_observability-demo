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
$displayName = $envValues["PARTICIPANT_DISPLAY_NAME"]
if (!$displayName) {
  $displayName = $participantId
}

$correlationId = "p_test_$([guid]::NewGuid().ToString("N"))"
$event = @{
  participantId = $participantId
  events = @(
    @{
      eventId = "test-$([guid]::NewGuid().ToString("N"))"
      timestamp = (Get-Date).ToUniversalTime().ToString("o")
      component = "control-plane"
      eventType = "catalog.metadata.observed"
      dimensions = @("adoption", "evolution")
      status = "success"
      context = @{
        participantPseudonym = "p_$participantId"
        datasetPseudonym = "p_test_dataset"
        correlationId = $correlationId
      }
      artefacts = @(
        @{
          type = "semantic-model"
          reference = "p_test_semantic_model"
          version = "1.0.0"
        }
      )
      metadataCompletenessScore = 1
      attributes = @{
        source = "distributed-sdo-preflight"
        displayName = $displayName
      }
    }
  )
}

$response = Invoke-RestMethod `
  -Method POST `
  -Uri $hostEndpoint `
  -Headers @{
    "X-SDO-Participant-Id" = $participantId
    "X-SDO-API-Key" = $apiKey
  } `
  -ContentType "application/json" `
  -Body ($event | ConvertTo-Json -Depth 20) `
  -TimeoutSec 30

Write-Host "SDO test event accepted."
Write-Host "Participant: $participantId"
Write-Host "Accepted:    $($response.accepted)"
Write-Host "Endpoint:    $hostEndpoint"
