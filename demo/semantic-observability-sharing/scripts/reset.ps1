$ErrorActionPreference = "Stop"

$composeFile = Join-Path $PSScriptRoot "..\docker-compose.yml"
$envFile = Join-Path $PSScriptRoot "..\.env"

docker compose -f $composeFile down -v --remove-orphans

if (Test-Path $envFile) {
  Remove-Item $envFile
}
