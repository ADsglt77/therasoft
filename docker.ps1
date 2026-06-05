param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('up', 'down')]
  [string]$Action = 'up',

  [Parameter(Mandatory = $false)]
  [ValidateSet('dev', 'prod')]
  [string]$Mode = 'dev',

  [Parameter(Mandatory = $false)]
  [switch]$Detach,

  [Parameter(Mandatory = $false)]
  [switch]$IncludeBuild = $true
)

# Script de confort pour lancer la stack en dev/prod sans recopier les -f compose.
# - En dev : hot-reload via docker-compose.dev.yml
# - En prod : stack “prod” (sans hot-reload)
# Dans tous les cas : docker-compose.override.yml est inclus pour exposer le port HTTP sur l’hôte.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

$composeFiles = @('docker-compose.yml', 'docker-compose.override.yml')
if ($Mode -eq 'dev') {
  $composeFiles += 'docker-compose.dev.yml'
}

$composeArgs = @()
foreach ($f in $composeFiles) {
  $composeArgs += @('-f', $f)
}

if ($Action -eq 'up') {
  $upArgs = @('up')

  # En dev, on laisse par défaut les logs en avant-plan (Detach peut override).
  if ($Detach -or $Mode -eq 'prod') {
    $upArgs += '-d'
  }

  $upArgs += '--remove-orphans'
  if ($IncludeBuild) {
    $upArgs += '--build'
  }

  Write-Host ("Running: docker compose {0} {1} {2}" -f ($composeFiles -join ' '), ($upArgs -join ' '), $Mode) -ForegroundColor Cyan
  docker compose @composeArgs @upArgs
  exit $LASTEXITCODE
}

if ($Action -eq 'down') {
  $downArgs = @('down')
  Write-Host ("Running: docker compose {0} {1}" -f ($composeFiles -join ' '), ($downArgs -join ' ')) -ForegroundColor Cyan
  docker compose @composeArgs @downArgs
  exit $LASTEXITCODE
}

throw "Action inconnue: $Action"

