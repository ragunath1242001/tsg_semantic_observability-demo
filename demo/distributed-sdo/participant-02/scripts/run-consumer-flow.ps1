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
$providerAddress = Require-EnvValue $envValues "REMOTE_CONTROL_PLANE_API"
$providerAudience = Require-EnvValue $envValues "REMOTE_PARTICIPANT_AUDIENCE"
$executePath = $envValues["EXECUTE_PATH"]
if (!$executePath) {
  $executePath = "get"
}

$hostPublicHost = (Convert-ToHostReachableUrl "http://$publicHost") -replace "^http://", ""
$hostProviderAddress = Convert-ToHostReachableUrl $providerAddress

$controlPlane = "http://$hostPublicHost`:$controlPlanePort"
$dataPlane = "http://$hostPublicHost`:$dataPlanePort"
$management = "$controlPlane/api/management"
$providerControlPlane = $hostProviderAddress -replace "/api/?$", ""
$providerManagement = "$providerControlPlane/api/management"
$encodedProviderAddress = [uri]::EscapeDataString($providerAddress)
$encodedAudience = [uri]::EscapeDataString($providerAudience)

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

Write-Step "Checking consumer health"
Invoke-WebRequest -UseBasicParsing -Uri "$controlPlane/health" -TimeoutSec 30 | Out-Null
Invoke-WebRequest -UseBasicParsing -Uri "$dataPlane/health" -TimeoutSec 30 | Out-Null
Write-Host "Consumer Control Plane: $controlPlane"
Write-Host "Consumer Data Plane:    $dataPlane"

Write-Step "Checking provider health"
Invoke-WebRequest -UseBasicParsing -Uri "$providerControlPlane/health" -TimeoutSec 30 | Out-Null
Write-Host "Provider Control Plane: $providerControlPlane"

Write-Step "Requesting provider catalog"
$catalog = Invoke-Json -Method GET -Uri "$management/catalog/request?address=$encodedProviderAddress&audience=$encodedAudience&take=50"
$dataset = @($catalog.dataset) | Where-Object { $_.distribution } | Select-Object -First 1
if ($null -eq $dataset) {
  throw "No transferable dataset with distribution was found in provider catalog."
}
$offer = @($dataset.hasPolicy) | Select-Object -First 1
if ($null -eq $offer) {
  throw "No policy offer was found on dataset $($dataset.'@id')."
}
Write-Host "Dataset: $($dataset.'@id')"
Write-Host "Offer:   $($offer.'@id')"

Write-Step "Starting contract negotiation"
$encodedDatasetId = [uri]::EscapeDataString($dataset.'@id')
Invoke-Json -Method POST -Uri "$management/negotiations/request?dataSet=$encodedDatasetId&address=$encodedProviderAddress&audience=$encodedAudience" -Body $offer | Out-Null
Start-Sleep -Seconds 4

$consumerNegotiation = @((Invoke-Json -Method GET -Uri "$management/negotiations?take=1&order=DESC&order_by=modifiedDate"))[0]
$providerNegotiation = @((Invoke-Json -Method GET -Uri "$providerManagement/negotiations?take=1&order=DESC&order_by=modifiedDate"))[0]
$consumerNegotiationId = $consumerNegotiation.id
$providerNegotiationId = $providerNegotiation.id
if (!$providerNegotiationId) {
  throw "Provider negotiation was not found. Check provider reachability and control-plane logs."
}
Write-Host "Consumer negotiation: $consumerNegotiationId"
Write-Host "Provider negotiation: $providerNegotiationId"

Write-Step "Completing contract negotiation"
Invoke-Json -Method POST -Uri "$providerManagement/negotiations/$providerNegotiationId/agreement" | Out-Null
Invoke-Json -Method POST -Uri "$management/negotiations/$consumerNegotiationId/verify" | Out-Null
Invoke-Json -Method POST -Uri "$providerManagement/negotiations/$providerNegotiationId/finalize" | Out-Null
Start-Sleep -Seconds 4

$consumerNegotiationDetails = Invoke-Json -Method GET -Uri "$management/negotiations/$consumerNegotiationId"
if ($consumerNegotiationDetails.state -ne "FINALIZED") {
  throw "Negotiation did not finalize. State: $($consumerNegotiationDetails.state). Provider manual action may still be needed."
}
$agreementId = $consumerNegotiationDetails.agreement.'@id'
Write-Host "Agreement: $agreementId"

Write-Step "Requesting transfer"
$encodedAgreementId = [uri]::EscapeDataString($agreementId)
Invoke-Json -Method POST -Uri "$management/transfers/request?address=$encodedProviderAddress&agreementId=$encodedAgreementId&audience=$encodedAudience&format=tsg%3AHTTP" | Out-Null
Start-Sleep -Seconds 4

$transferResponse = Invoke-Json -Method GET -Uri "$dataPlane/api/management/transfers"
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

$dataPlaneTransfer = $transferItems |
  Where-Object { $_.request.agreementId -eq $agreementId } |
  Sort-Object createdDate -Descending |
  Select-Object -First 1
if ($null -eq $dataPlaneTransfer) {
  throw "No consumer data-plane transfer found for agreement $agreementId."
}
if ($dataPlaneTransfer.state -ne "STARTED") {
  throw "Consumer data-plane transfer did not start. State: $($dataPlaneTransfer.state)"
}
Write-Host "Consumer data-plane transfer: $($dataPlaneTransfer.id)"

Write-Step "Executing data access through consumer Data Plane"
$dataResponse = Invoke-Json -Method GET -Uri "$dataPlane/api/management/transfers/$($dataPlaneTransfer.id)/execute/$executePath"
Write-Host "Backend method: $($dataResponse.method)"
Write-Host "Provider transfer header: $($dataResponse.headers.'x-dsp-transfer-id')"
Write-Host "Agreement header: $($dataResponse.headers.'x-dsp-agreement-id')"

Write-Step "Refreshing semantic observability snapshots"
Invoke-Json -Method POST -Uri "$management/semantic-observability/combined/report/snapshots/refresh?bucket=hour" | Out-Null

Write-Step "Recent combined observability events"
$events = Invoke-Json -Method GET -Uri "$management/semantic-observability/combined/events?take=12&order=DESC&order_by=timestamp"
$events.data |
  Select-Object timestamp, component, eventType, status, failureCategory |
  Format-Table -AutoSize

Write-Step "UI links"
Write-Host "Consumer Control Plane UI:        $controlPlane"
Write-Host "Consumer Data Plane UI:           $dataPlane"
Write-Host "Consumer observability UI:        $controlPlane/semantic-observability"
Write-Host "Consumer Data Plane observability: $dataPlane/semantic-observability"
