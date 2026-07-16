param(
  [string]$AlfaControlPlane = "http://localhost:3701",
  [string]$AlfaDataPlane = "http://localhost:3702",
  [string]$BravoControlPlane = "http://localhost:3801",
  [string]$BravoDataPlane = "http://localhost:3802",
  [string]$ProviderAddress = "http://alfa-control-plane:3000/api",
  [string]$ProviderAudience = "did:web:alfa-control-plane",
  [string]$ExecutePath = "get"
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

$alfaManagement = "$AlfaControlPlane/api/management"
$bravoManagement = "$BravoControlPlane/api/management"
$encodedProviderAddress = [uri]::EscapeDataString($ProviderAddress)
$encodedAudience = [uri]::EscapeDataString($ProviderAudience)

Write-Step "Checking service health"
Assert-Healthy "Alfa Control Plane" $AlfaControlPlane
Assert-Healthy "Alfa Data Plane" $AlfaDataPlane
Assert-Healthy "Bravo Control Plane" $BravoControlPlane
Assert-Healthy "Bravo Data Plane" $BravoDataPlane

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
