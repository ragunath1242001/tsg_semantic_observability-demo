param(
  [string]$ControlPlaneUrl = "http://localhost:3000",
  [string]$HttpDataPlaneUrl = "http://localhost:3001",
  [string]$LocalParticipant = "did:web:localhost%3A3001",
  [string]$RemoteParticipant = "did:web:client-demo.example"
)

$ErrorActionPreference = "Stop"

function Invoke-DemoJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [object]$Body = $null
  )

  $headers = @{ Accept = "application/json" }
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -TimeoutSec 30
  }

  $json = $Body | ConvertTo-Json -Depth 30
  return Invoke-RestMethod `
    -Method $Method `
    -Uri $Uri `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $json `
    -TimeoutSec 30
}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message =="
}

$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmss")
$datasetId = "urn:tsg:demo:dataset:$runId"
$offerId = "urn:tsg:demo:offer:$runId"
$agreementId = "urn:tsg:demo:agreement:$runId"
$transferId = "urn:tsg:demo:transfer:$runId"
$now = (Get-Date).ToUniversalTime().ToString("o")

Write-Step "Checking services"
Invoke-DemoJson -Method GET -Uri "$ControlPlaneUrl/health" | Out-Null
Write-Host "Control Plane reachable at $ControlPlaneUrl"
try {
  Invoke-DemoJson -Method GET -Uri "$HttpDataPlaneUrl/health" | Out-Null
} catch {
  Write-Host "HTTP Data Plane health endpoint returned a non-JSON/empty response; continuing."
}
Write-Host "HTTP Data Plane reachable at $HttpDataPlaneUrl"

Write-Step "Updating HTTP Data Plane dataset configuration"
$datasetConfig = @{
  type = "versioned"
  title = "Client Demo Dataset $runId"
  description = @(
    "Synthetic dataset used to demonstrate semantic observability listener output."
  )
  baseSemanticModelRef = "https://example.org/semantic/client-demo/base"
  currentVersion = "1.0.0"
  versions = @(
    @{
      version = "1.0.0"
      semanticModelRef = "https://example.org/semantic/client-demo/1.0.0"
      distributions = @(
        @{
          backendUrl = "https://mockhttp.org/anything"
          mediaType = "application/json"
          schemaRef = "https://example.org/schemas/client-demo-1.0.0.json"
          openApiSpecRef = "https://mockhttp.org/docs/json"
        }
      )
    }
  )
}
Invoke-DemoJson -Method PUT -Uri "$HttpDataPlaneUrl/management/config" -Body $datasetConfig | Out-Null
Write-Host "Data Plane dataset config updated."

Write-Step "Refreshing Data Plane registration/catalog synchronization"
try {
  Invoke-DemoJson -Method POST -Uri "$HttpDataPlaneUrl/management/refresh" | Out-Null
  Write-Host "Data Plane registration refresh requested."
} catch {
  Write-Host "Registration refresh did not complete: $($_.Exception.Message)"
}

Write-Step "Adding a Control Plane catalog dataset"
$catalogDataset = @{
  "@type" = "Dataset"
  "@id" = $datasetId
  title = "Client Demo Catalog Dataset $runId"
  description = @(
    "Catalog metadata created by the semantic observability demo runner."
  )
  conformsTo = @("https://example.org/semantic/client-demo/1.0.0")
  version = "1.0.0"
  hasPolicy = @(
    @{
      "@type" = "Offer"
      "@id" = $offerId
      assigner = $LocalParticipant
      permission = @(
        @{
          "@type" = "Permission"
          action = "use"
          target = $datasetId
        }
      )
    }
  )
  distribution = @(
    @{
      "@type" = "Distribution"
      "@id" = "$datasetId:distribution"
      conformsTo = @("https://example.org/schemas/client-demo-1.0.0.json")
      format = "HTTP"
      title = "Mock JSON API"
    }
  )
}
try {
  Invoke-DemoJson -Method POST -Uri "$ControlPlaneUrl/management/catalog/dataset" -Body $catalogDataset | Out-Null
  Write-Host "Catalog dataset added: $datasetId"
} catch {
  Write-Host "Catalog dataset add did not complete: $($_.Exception.Message)"
}

Write-Step "Running policy evaluation to simulate a governance decision"
$evaluationContext = @{
  role = "provider"
  scope = "PROVIDER_ON_REQUEST"
  localParticipant = $LocalParticipant
  remoteParticipant = $RemoteParticipant
  target = $datasetId
  action = "use"
  verifiableCredentials = @()
  evaluationTime = $now
  policy = @{
    agreement = @{
      "@type" = "Agreement"
      "@id" = $agreementId
      assigner = $LocalParticipant
      assignee = $RemoteParticipant
      target = $datasetId
      timestamp = $now
      permission = @(
        @{
          "@type" = "Permission"
          action = "use"
          target = $datasetId
        }
      )
    }
  }
}
try {
  $decision = Invoke-DemoJson `
    -Method POST `
    -Uri "$ControlPlaneUrl/management/policy/evaluation/$([uri]::EscapeDataString($transferId))/evaluate" `
    -Body $evaluationContext
  Write-Host "Policy decision: $($decision.decision)"
} catch {
  Write-Host "Policy evaluation skipped: $($_.Exception.Message)"
  Write-Host "This step requires a real stored agreement in a full two-party data-sharing flow."
}

Write-Step "Refreshing semantic observability snapshots"
Invoke-DemoJson -Method POST -Uri "$ControlPlaneUrl/management/semantic-observability/combined/report/snapshots/refresh" -Body @{ bucket = "hour" } | Out-Null
Write-Host "Combined snapshots refreshed."

Write-Step "Recent combined observability events"
$events = Invoke-DemoJson -Method GET -Uri "$ControlPlaneUrl/management/semantic-observability/combined/events?take=12&order=DESC&order_by=timestamp"
$events.data |
  Select-Object timestamp, component, eventType, status, failureCategory |
  Format-Table -AutoSize

Write-Step "Recent HTTP Data Plane listener events"
$dataPlaneEvents = Invoke-DemoJson -Method GET -Uri "$HttpDataPlaneUrl/management/semantic-observability/events?take=12&order=DESC"
$dataPlaneEvents.data |
  Select-Object timestamp, component, eventType, status, failureCategory |
  Format-Table -AutoSize

Write-Step "Current combined report"
$report = Invoke-DemoJson -Method GET -Uri "$ControlPlaneUrl/management/semantic-observability/combined/report"
Write-Host "Adoption metrics:  $($report.adoption.Count)"
Write-Host "Friction metrics:  $($report.friction.Count)"
Write-Host "Evolution metrics: $($report.evolution.Count)"
Write-Host "Stability metrics: $($report.stability.Count)"

Write-Host ""
Write-Host "Demo run ID: $runId"
Write-Host "Control Plane API: $ControlPlaneUrl"
Write-Host "HTTP Data Plane API: $HttpDataPlaneUrl"
Write-Host "Control Plane UI: http://localhost:5173"
Write-Host "HTTP Data Plane UI: http://localhost:5174"
