param(
  [switch]$Build
)

. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-ParticipantRoot
$envPath = Join-Path $root ".env"
if (!(Test-Path $envPath)) {
  throw "Missing .env. Run scripts\register-participant.ps1 first or copy .env.example to .env."
}

& (Join-Path $PSScriptRoot "generate-config.ps1") -EnvPath $envPath

$composeFile = Join-Path $root "docker-compose.yml"
$args = @("compose", "--env-file", $envPath, "-f", $composeFile, "up", "-d")
if ($Build) {
  $args += "--build"
}
docker @args
