. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
$envPath = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.yml"

if (Test-Path $envPath) {
  docker compose --env-file $envPath -f $composeFile down -v --remove-orphans
} else {
  docker compose -f $composeFile down -v --remove-orphans
}
