param(
  [string]$AlfaControlPlane = "http://localhost:3701",
  [string]$AlfaDataPlane = "http://localhost:3702",
  [string]$BravoControlPlane = "http://localhost:3801",
  [string]$BravoDataPlane = "http://localhost:3802",
  [string]$ProviderAddress = "http://alfa-control-plane:3000/api",
  [string]$ProviderAudience = "did:web:alfa-control-plane",
  [string]$ExecutePath = "get",
  [ValidateSet("all", "happy-path", "missing-ontology", "missing-schema", "deprecated-artefact", "validation-error", "version-drift", "missing-required-field", "invalid-field-type", "version-regression", "field-adoption-change")]
  [string]$Scenario = "all",
  [ValidateSet("controlled", "native")]
  [string]$TelemetryMode = "controlled",
  [string]$SdoUrl = "http://localhost:4100"
)

$ErrorActionPreference = "Stop"

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

  $json = $Body | ConvertTo-Json -Depth 50
  return Invoke-RestMethod -Method $Method -Uri $Uri -ContentType "application/json" -Body $json -TimeoutSec 90
}

function Assert-Healthy {
  param([string]$Name, [string]$BaseUrl)

  $response = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/health" -TimeoutSec 30
  if ($response.StatusCode -ne 200) {
    throw "$Name is not healthy. Status: $($response.StatusCode)"
  }
  Write-Host "$Name healthy at $BaseUrl"
}

function Show-Events {
  param([string]$Name, [string]$BaseUrl)

  Write-Step "$Name recent combined observability events"
  $response = Invoke-Json -Method GET -Uri "$BaseUrl/api/management/semantic-observability/combined/events?take=12&order=DESC&order_by=timestamp"
  $events = $response
  if ($null -ne $response.data) {
    $events = $response.data
  }
  @($events) |
    Select-Object timestamp, component, eventType, status, failureCategory |
    Format-Table -AutoSize
}

function Read-DemoEnv {
  $envPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) ".env"
  if (-not (Test-Path $envPath)) {
    throw "Demo .env was not found at $envPath. Start the demo first with start-sdo-dashboard-demo.ps1."
  }

  $values = @{}
  Get-Content $envPath | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
      $values[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
  return $values
}

function Get-SdoIngestUrl {
  param([hashtable]$EnvValues)

  $endpoint = $EnvValues["SDO_OBSERVABILITY_ENDPOINT"]
  if ($endpoint -and $endpoint -notmatch "sdo-observability:4100") {
    return $endpoint
  }

  return "$($SdoUrl.TrimEnd('/'))/api/ingest/events"
}

function ConvertTo-DemoPseudonym {
  param(
    [string]$Value,
    [string]$Kind
  )

  if (-not $Value) {
    return $Value
  }
  if ($Value.StartsWith("p_")) {
    return $Value
  }

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("$Kind|$Value")
    $hex = -join ($sha256.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
    return "p_${Kind}_$($hex.Substring(0, 16))"
  } finally {
    $sha256.Dispose()
  }
}

function New-SemanticEvent {
  param(
    [string]$ScenarioName,
    [string]$ParticipantRole,
    [string]$Component,
    [string]$EventType,
    [string]$Status,
    [string[]]$Dimensions,
    [array]$Artefacts,
    [hashtable]$Context,
    [hashtable]$Attributes = $null,
    [string]$FailureCategory = $null,
    [double]$MetadataCompletenessScore = 1.0
  )

  $event = @{
    eventId = "demo-$ScenarioName-$ParticipantRole-$([guid]::NewGuid().ToString('N'))"
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    component = $Component
    eventType = $EventType
    status = $Status
    dimensions = $Dimensions
    artefacts = $Artefacts
    context = $Context
    metadataCompletenessScore = $MetadataCompletenessScore
  }

  if ($FailureCategory) {
    $event.failureCategory = $FailureCategory
  }
  if ($Attributes) {
    $event.attributes = $Attributes
  }

  return $event
}

function New-FieldUsageEvents {
  param(
    [string]$ParticipantRole,
    [hashtable]$Context
  )

  $windowEnd = (Get-Date).ToUniversalTime()
  $windowStart = $windowEnd.AddHours(-1)
  return @(
    New-FieldUsageEvent -ScenarioName "field-usage" -ParticipantRole $ParticipantRole -Context $Context -Version "2.0.0" -FieldId "setu:vehicle.startDate" -Observed 25 -Present 0 -WindowStart $windowStart -WindowEnd $windowEnd
    New-FieldUsageEvent -ScenarioName "field-usage" -ParticipantRole $ParticipantRole -Context $Context -Version "2.0.0" -FieldId "setu:vehicle.role" -Observed 25 -Present 20 -WindowStart $windowStart -WindowEnd $windowEnd
  )
}

function New-FieldUsageEvent {
  param(
    [string]$ScenarioName,
    [string]$ParticipantRole,
    [hashtable]$Context,
    [string]$Version,
    [string]$FieldId,
    [int]$Observed,
    [int]$Present,
    [datetime]$WindowStart = (Get-Date).ToUniversalTime().AddHours(-1),
    [datetime]$WindowEnd = (Get-Date).ToUniversalTime()
  )

  New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole $ParticipantRole -Component "http-data-plane" -EventType "semantic-field.usage.summary" -Status "info" -Dimensions @("adoption") -Context $Context -Artefacts @() -Attributes @{
    governedStandardId = "setu:vehicle-sharing"
    governedVersion = $Version
    fieldId = $FieldId
    timeWindowStart = $WindowStart.ToString("o")
    timeWindowEnd = $WindowEnd.ToString("o")
    observationCount = $Observed
    presentCount = $Present
  }
}

function Send-SdoEvents {
  param(
    [string]$ParticipantId,
    [string]$ApiKey,
    [string]$IngestUrl,
    [array]$Events
  )

  if (-not $ParticipantId -or -not $ApiKey) {
    throw "Missing SDO participant credentials in demo .env."
  }

  foreach ($event in $Events) {
    foreach ($key in @("participantPseudonym", "remoteParticipantPseudonym", "participantPairPseudonym", "datasetPseudonym", "negotiationId", "agreementId", "transferId", "correlationId", "traceId")) {
      if ($event.context -and $event.context.ContainsKey($key)) {
        $event.context[$key] = ConvertTo-DemoPseudonym -Value $event.context[$key] -Kind $key
      }
    }
    foreach ($artefact in @($event.artefacts)) {
      $artefact.reference = ConvertTo-DemoPseudonym -Value $artefact.reference -Kind "artefact"
    }
  }

  Invoke-RestMethod `
    -Method POST `
    -Uri $IngestUrl `
    -ContentType "application/json" `
    -Headers @{
      "X-SDO-Participant-Id" = $ParticipantId
      "X-SDO-API-Key" = $ApiKey
    } `
    -Body (@{ participantId = $ParticipantId; events = $Events } | ConvertTo-Json -Depth 50) `
    -TimeoutSec 90 | Out-Null
}

function Get-ScenarioNames {
  if ($Scenario -eq "all") {
    return @("happy-path", "missing-ontology", "missing-schema", "deprecated-artefact", "validation-error", "version-drift", "missing-required-field", "invalid-field-type", "version-regression", "field-adoption-change")
  }
  return @($Scenario)
}

function Get-ScenarioEvents {
  param(
    [string]$ScenarioName,
    [string]$AgreementId,
    [string]$TransferId
  )

  $correlationId = "demo-$ScenarioName-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
  $baseContext = @{
    correlationId = $correlationId
    agreementId = $AgreementId
    transferId = $TransferId
    participantPairPseudonym = "alfa-bravo-local-demo"
    datasetPseudonym = "dataset-$ScenarioName"
    scenario = $ScenarioName
  }

  switch ($ScenarioName) {
    "happy-path" {
      return @{
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "success" -Dimensions @("friction", "adoption") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
          New-FieldUsageEvents -ParticipantRole "bravo" -Context $baseContext
        )
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "control-plane" -EventType "catalog.dataset.observed" -Status "success" -Dimensions @("adoption") -Context $baseContext -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
          New-FieldUsageEvents -ParticipantRole "alfa" -Context $baseContext
        )
      }
    }
    "missing-ontology" {
      return @{
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "control-plane" -EventType "catalog.dataset.observed" -Status "warning" -Dimensions @("adoption") -Context $baseContext -MetadataCompletenessScore 0.65 -Artefacts @(
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
        )
        bravo = @()
      }
    }
    "missing-schema" {
      return @{
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "control-plane" -EventType "catalog.dataset.observed" -Status "warning" -Dimensions @("adoption") -Context $baseContext -MetadataCompletenessScore 0.72 -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" }
          )
        )
        bravo = @()
      }
    }
    "deprecated-artefact" {
      return @{
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "control-plane" -EventType "catalog.dataset.observed" -Status "warning" -Dimensions @("adoption", "evolution") -Context $baseContext -MetadataCompletenessScore 0.8 -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/legacy-vehicle-sharing"; version = "0.9.0"; deprecated = $true; lifecycleStatus = "deprecated" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/legacy-vehicle-sharing.json"; version = "0.9.0"; deprecated = $true; lifecycleStatus = "deprecated" }
          )
        )
        bravo = @()
      }
    }
    "validation-error" {
      return @{
        alfa = @()
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "failure" -Dimensions @("friction", "adoption") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -FailureCategory "invalid-controlled-vocabulary" -MetadataCompletenessScore 0.45 -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
        )
      }
    }
    "version-drift" {
      return @{
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "control-plane" -EventType "catalog.dataset.observed" -Status "success" -Dimensions @("adoption", "evolution") -Context $baseContext -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "1.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "1.0.0" }
          )
        )
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "success" -Dimensions @("friction", "adoption", "evolution") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
        )
      }
    }
    "missing-required-field" {
      return @{
        alfa = @(
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.startDate" -Observed 25 -Present 0
        )
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "failure" -Dimensions @("friction", "adoption") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -FailureCategory "missing-required-field" -MetadataCompletenessScore 0.55 -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.startDate" -Observed 25 -Present 0
        )
      }
    }
    "invalid-field-type" {
      return @{
        alfa = @(
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.startDate" -Observed 25 -Present 25
        )
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "failure" -Dimensions @("friction", "adoption") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -FailureCategory "invalid-field-type" -MetadataCompletenessScore 0.9 -Artefacts @(
            @{ type = "ontology"; reference = "https://semantic.example.org/mobility/vehicle-sharing"; version = "2.0.0" },
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.startDate" -Observed 25 -Present 25
        )
      }
    }
    "version-regression" {
      return @{
        alfa = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "failure" -Dimensions @("friction", "evolution") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "1.0.0" } -FailureCategory "schema-version-mismatch" -Artefacts @(
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "1.0.0" }
          )
        )
        bravo = @(
          New-SemanticEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Component "http-data-plane" -EventType "metadata.validation.result" -Status "success" -Dimensions @("friction", "evolution") -Context $baseContext -Attributes @{ governedStandardId = "setu:vehicle-sharing"; governedVersion = "2.0.0" } -Artefacts @(
            @{ type = "schema"; reference = "https://semantic.example.org/schemas/vehicle-sharing.json"; version = "2.0.0" }
          )
        )
      }
    }
    "field-adoption-change" {
      return @{
        alfa = @(
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Context $baseContext -Version "1.0.0" -FieldId "setu:vehicle.role" -Observed 25 -Present 10
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "alfa" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.role" -Observed 25 -Present 23
        )
        bravo = @(
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Context $baseContext -Version "1.0.0" -FieldId "setu:vehicle.role" -Observed 25 -Present 10
          New-FieldUsageEvent -ScenarioName $ScenarioName -ParticipantRole "bravo" -Context $baseContext -Version "2.0.0" -FieldId "setu:vehicle.role" -Observed 25 -Present 23
        )
      }
    }
  }
}

function Publish-ScenarioEvents {
  param(
    [string]$AgreementId,
    [string]$TransferId
  )

  $envValues = Read-DemoEnv
  $ingestUrl = Get-SdoIngestUrl -EnvValues $envValues
  Write-Step "Publishing semantic demo scenario events to SDO"
  Write-Host "SDO ingest endpoint: $ingestUrl"

  foreach ($scenarioName in Get-ScenarioNames) {
    $scenarioEvents = Get-ScenarioEvents -ScenarioName $scenarioName -AgreementId $AgreementId -TransferId $TransferId
    if (@($scenarioEvents.alfa).Count -gt 0) {
      Send-SdoEvents -ParticipantId $envValues["SDO_ALFA_PARTICIPANT_ID"] -ApiKey $envValues["SDO_ALFA_API_KEY"] -IngestUrl $ingestUrl -Events @($scenarioEvents.alfa)
    }
    if (@($scenarioEvents.bravo).Count -gt 0) {
      Send-SdoEvents -ParticipantId $envValues["SDO_BRAVO_PARTICIPANT_ID"] -ApiKey $envValues["SDO_BRAVO_API_KEY"] -IngestUrl $ingestUrl -Events @($scenarioEvents.bravo)
    }
    Write-Host "Published scenario: $scenarioName"
  }
}

function Wait-NativeSdoEvidence {
  param(
    [string]$Since,
    [string]$AlfaParticipantId,
    [string]$BravoParticipantId,
    [string]$BaseUrl
  )

  Write-Step "Verifying native two-participant evidence in SDO"
  $requiredEventTypes = @(
    "negotiation.state.changed",
    "transfer.state.changed",
    "data-plane.access.observed",
    "metadata.validation.result",
    "semantic-field.usage.summary"
  )
  $deadline = (Get-Date).AddSeconds(60)
  $events = @()

  do {
    $encodedSince = [uri]::EscapeDataString($Since)
    $response = Invoke-Json -Method GET -Uri "$($BaseUrl.TrimEnd('/'))/api/events?take=500&from=$encodedSince"
    $events = @($response.data) | Where-Object {
      $_.source.participantId -in @($AlfaParticipantId, $BravoParticipantId)
    }
    $participants = @($events.source.participantId | Sort-Object -Unique)
    $eventTypes = @($events.eventType | Sort-Object -Unique)
    $missingEvidence = @(
      foreach ($participantId in @($AlfaParticipantId, $BravoParticipantId)) {
        foreach ($eventType in $requiredEventTypes) {
          if (-not ($events | Where-Object {
                $_.source.participantId -eq $participantId -and $_.eventType -eq $eventType
              })) {
            "$participantId/$eventType"
          }
        }
      }
    )
    if ($missingEvidence.Count -eq 0) {
      Write-Host "Native evidence verified"
      Write-Host "Participants:              $($participants.Count)"
      Write-Host "Native events:             $($events.Count)"
      Write-Host "Synthetic events published: 0"
      return
    }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  $observedParticipants = @($events.source.participantId | Sort-Object -Unique) -join ", "
  $observedEventTypes = @($events.eventType | Sort-Object -Unique) -join ", "
  throw "Native SDO evidence was incomplete. Participants: [$observedParticipants]. Event types: [$observedEventTypes]."
}

function Invoke-NativeMetadataValidation {
  param([string]$BaseUrl)

  $config = Invoke-Json -Method GET -Uri "$BaseUrl/api/management/config"
  1..2 | ForEach-Object {
    Invoke-Json -Method PUT -Uri "$BaseUrl/api/management/config" -Body $config | Out-Null
  }
}

$alfaManagement = "$AlfaControlPlane/api/management"
$bravoManagement = "$BravoControlPlane/api/management"
$encodedProviderAddress = [uri]::EscapeDataString($ProviderAddress)
$encodedAudience = [uri]::EscapeDataString($ProviderAudience)

Write-Step "Checking service health"
Assert-Healthy "Alfa Control Plane" $AlfaControlPlane
Assert-Healthy "Alfa Data Plane" $AlfaDataPlane
Assert-Healthy "Bravo Control Plane" $BravoControlPlane
Assert-Healthy "Bravo Data Plane" $BravoDataPlane
$runStartedAt = (Get-Date).ToUniversalTime().AddSeconds(-2).ToString("o")

Write-Step "Requesting Alfa catalog from Bravo"
$catalog = Invoke-Json -Method GET -Uri "$bravoManagement/catalog/request?address=$encodedProviderAddress&audience=$encodedAudience&take=50"
$dataset = @($catalog.dataset) | Where-Object { $_.distribution } | Select-Object -First 1
if ($null -eq $dataset) {
  throw "No transferable dataset with distribution was found in Alfa catalog."
}
$offer = @($dataset.hasPolicy) | Select-Object -First 1
if ($null -eq $offer) {
  throw "No policy offer was found on dataset $($dataset.'@id')."
}
Write-Host "Dataset: $($dataset.'@id')"
Write-Host "Offer:   $($offer.'@id')"

Write-Step "Starting contract negotiation"
$encodedDatasetId = [uri]::EscapeDataString($dataset.'@id')
Invoke-Json -Method POST -Uri "$bravoManagement/negotiations/request?dataSet=$encodedDatasetId&address=$encodedProviderAddress&audience=$encodedAudience" -Body $offer | Out-Null
Start-Sleep -Seconds 2

$providerNegotiation = @((Invoke-Json -Method GET -Uri "$alfaManagement/negotiations?take=1&order=DESC&order_by=modifiedDate"))[0]
$consumerNegotiation = @((Invoke-Json -Method GET -Uri "$bravoManagement/negotiations?take=1&order=DESC&order_by=modifiedDate"))[0]
$providerNegotiationId = $providerNegotiation.id
$consumerNegotiationId = $consumerNegotiation.id
Write-Host "Provider negotiation: $providerNegotiationId"
Write-Host "Consumer negotiation: $consumerNegotiationId"

Invoke-Json -Method POST -Uri "$alfaManagement/negotiations/$providerNegotiationId/agreement" | Out-Null
Invoke-Json -Method POST -Uri "$bravoManagement/negotiations/$consumerNegotiationId/verify" | Out-Null
Invoke-Json -Method POST -Uri "$alfaManagement/negotiations/$providerNegotiationId/finalize" | Out-Null
Start-Sleep -Seconds 2

$consumerNegotiationDetails = Invoke-Json -Method GET -Uri "$bravoManagement/negotiations/$consumerNegotiationId"
if ($consumerNegotiationDetails.state -ne "FINALIZED") {
  throw "Negotiation did not finalize. State: $($consumerNegotiationDetails.state)"
}
$agreementId = $consumerNegotiationDetails.agreement.'@id'
Write-Host "Agreement: $agreementId"

Write-Step "Requesting transfer"
$encodedAgreementId = [uri]::EscapeDataString($agreementId)
Invoke-Json -Method POST -Uri "$bravoManagement/transfers/request?address=$encodedProviderAddress&agreementId=$encodedAgreementId&audience=$encodedAudience&format=tsg%3AHTTP" | Out-Null
Start-Sleep -Seconds 2

$transferResponse = Invoke-Json -Method GET -Uri "$BravoDataPlane/api/management/transfers"
$transferItems = @()
foreach ($item in @($transferResponse)) {
  if ($item -is [array]) {
    foreach ($inner in $item) {
      $transferItems += $inner
    }
  } else {
    $transferItems += $item
  }
}

$bravoDataPlaneTransfer = $transferItems |
  Where-Object { $_.request.agreementId -eq $agreementId } |
  Sort-Object createdDate -Descending |
  Select-Object -First 1
if ($null -eq $bravoDataPlaneTransfer) {
  throw "No Bravo data-plane transfer found for agreement $agreementId."
}
if ($bravoDataPlaneTransfer.state -ne "STARTED") {
  throw "Bravo data-plane transfer did not start. State: $($bravoDataPlaneTransfer.state)"
}
Write-Host "Bravo data-plane transfer: $($bravoDataPlaneTransfer.id)"
Write-Host "Provider proxy endpoint: $($bravoDataPlaneTransfer.dataAddress.endpoint)"

Write-Step "Executing data access through Bravo Data Plane"
$dataResponse = Invoke-Json -Method GET -Uri "$BravoDataPlane/api/management/transfers/$($bravoDataPlaneTransfer.id)/execute/$ExecutePath"
Write-Host "Backend method: $($dataResponse.method)"
Write-Host "Provider transfer header: $($dataResponse.headers.'x-dsp-transfer-id')"
Write-Host "Agreement header: $($dataResponse.headers.'x-dsp-agreement-id')"

if ($TelemetryMode -eq "controlled") {
  Publish-ScenarioEvents -AgreementId $agreementId -TransferId $bravoDataPlaneTransfer.id
} else {
  Write-Step "Running native governed-field validation"
  Invoke-NativeMetadataValidation -BaseUrl $AlfaDataPlane
  Invoke-NativeMetadataValidation -BaseUrl $BravoDataPlane

  $envValues = Read-DemoEnv
  $ingestUrl = Get-SdoIngestUrl -EnvValues $envValues
  $sdoBaseUrl = $ingestUrl -replace "/api/ingest/events/?$", ""
  Wait-NativeSdoEvidence `
    -Since $runStartedAt `
    -AlfaParticipantId $envValues["SDO_ALFA_PARTICIPANT_ID"] `
    -BravoParticipantId $envValues["SDO_BRAVO_PARTICIPANT_ID"] `
    -BaseUrl $sdoBaseUrl
}

Write-Step "Refreshing semantic observability snapshots"
Invoke-Json -Method POST -Uri "$alfaManagement/semantic-observability/combined/report/snapshots/refresh?bucket=hour" | Out-Null
Invoke-Json -Method POST -Uri "$bravoManagement/semantic-observability/combined/report/snapshots/refresh?bucket=hour" | Out-Null

Show-Events "Alfa" $AlfaControlPlane
Show-Events "Bravo" $BravoControlPlane

Write-Step "UI links"
Write-Host "Alfa Control Plane UI:        $AlfaControlPlane"
Write-Host "Alfa Data Plane UI:           $AlfaDataPlane"
Write-Host "Bravo Control Plane UI:       $BravoControlPlane"
Write-Host "Bravo Data Plane UI:          $BravoDataPlane"
Write-Host "Alfa observability UI:        $AlfaControlPlane/semantic-observability"
Write-Host "Bravo observability UI:       $BravoControlPlane/semantic-observability"
Write-Host "Alfa Data Plane observability: $AlfaDataPlane/semantic-observability"
Write-Host "Bravo Data Plane observability: $BravoDataPlane/semantic-observability"
