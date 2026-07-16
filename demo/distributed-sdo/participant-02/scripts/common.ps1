$ErrorActionPreference = "Stop"

function Get-ParticipantRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Read-EnvFile {
  param([string]$Path)

  $values = [ordered]@{}
  if (!(Test-Path $Path)) {
    return $values
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if (!$trimmed -or $trimmed.StartsWith("#")) {
      continue
    }
    $parts = $trimmed.Split("=", 2)
    if ($parts.Length -eq 2) {
      $values[$parts[0]] = $parts[1]
    }
  }
  return $values
}

function Write-EnvFile {
  param(
    [string]$Path,
    [hashtable]$Values
  )

  $lines = @()
  foreach ($key in $Values.Keys) {
    $lines += "$key=$($Values[$key])"
  }
  Set-Content -Path $Path -Value $lines -Encoding UTF8
}

function Merge-EnvValues {
  param(
    [hashtable]$Base,
    [hashtable]$Updates
  )

  $merged = [ordered]@{}
  foreach ($key in $Base.Keys) {
    $merged[$key] = $Base[$key]
  }
  foreach ($key in $Updates.Keys) {
    $merged[$key] = $Updates[$key]
  }
  return $merged
}

function Require-EnvValue {
  param(
    [hashtable]$Values,
    [string]$Name
  )

  if (!$Values.Contains($Name) -or [string]::IsNullOrWhiteSpace($Values[$Name])) {
    throw "Missing required .env value: $Name"
  }
  return $Values[$Name]
}

function Convert-ToEnvName {
  param([string]$Name)

  return $Name -replace "[^A-Za-z0-9_]", "_"
}

function Convert-ToComposeProjectName {
  param([string]$Name)

  return ($Name.ToLowerInvariant() -replace "[^a-z0-9_-]", "-")
}

function Convert-ToHostReachableUrl {
  param([string]$Url)

  return $Url -replace "://host\.docker\.internal(?=[:/]|$)", "://localhost"
}
