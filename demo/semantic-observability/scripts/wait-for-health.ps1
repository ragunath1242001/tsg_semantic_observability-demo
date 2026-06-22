param(
  [Parameter(Mandatory = $true)][string[]]$Urls,
  [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

foreach ($url in $Urls) {
  Write-Host "Waiting for $url"
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Method GET -Uri $url -TimeoutSec 5 | Out-Null
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $ready) {
    throw "Timed out waiting for $url"
  }
}

Write-Host "All health checks passed."
