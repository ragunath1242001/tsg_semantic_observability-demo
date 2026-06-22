$ErrorActionPreference = "Stop"

$demoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $demoRoot "docker-compose.yml"

docker compose -f $composeFile down -v --remove-orphans

Write-Host "Semantic observability demo containers and volumes removed."
