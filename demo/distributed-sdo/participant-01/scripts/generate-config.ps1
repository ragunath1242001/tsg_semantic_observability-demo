param(
  [string]$EnvPath
)

. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
if (!$EnvPath) {
  $EnvPath = Join-Path $root ".env"
}

$envValues = Read-EnvFile $EnvPath
foreach ($name in @(
  "PARTICIPANT_ID",
  "PARTICIPANT_DISPLAY_NAME",
  "PUBLIC_HOST",
  "CONTROL_PLANE_PORT",
  "DATA_PLANE_PORT",
  "SDO_OBSERVABILITY_ENDPOINT",
  "SDO_API_KEY",
  "DATASET_TITLE",
  "DATASET_DESCRIPTION",
  "DATASET_BASE_SEMANTIC_MODEL_REF",
  "DATASET_SEMANTIC_MODEL_REF",
  "DATASET_SCHEMA_REF",
  "DATASET_OPENAPI_REF",
  "DATASET_BACKEND_URL"
)) {
  Require-EnvValue $envValues $name | Out-Null
}

$generatedDir = Join-Path $root "configs\generated"
New-Item -ItemType Directory -Force -Path $generatedDir | Out-Null

foreach ($file in @("control-plane", "data-plane")) {
  $templatePath = Join-Path $root "configs\$file.template.yaml"
  $targetPath = Join-Path $generatedDir "$file.yaml"
  $content = Get-Content $templatePath -Raw

  foreach ($key in $envValues.Keys) {
    $content = $content.Replace("__$($key)__", $envValues[$key])
  }

  Set-Content -Path $targetPath -Value $content -Encoding UTF8
  Write-Host "Generated $targetPath"
}
