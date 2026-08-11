param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$env:COMPOSE_PROJECT_NAME = 'sawiyaa'

function Invoke-Required {
  param([string]$Label, [scriptblock]$Command)
  Write-Host "[RELEASE] $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Release gate failed: $Label (exit $LASTEXITCODE)" }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $repoRoot
$backendDir = Join-Path $repoRoot 'sawiyaa-backend-v1'
$frontendDir = Join-Path $repoRoot 'sawiyaa-frontend-v1'
$generatedPrismaDir = Join-Path $backendDir 'src\generated\prisma'
$temporaryEnvFiles = @(
  (Join-Path $backendDir '.env'),
  (Join-Path $backendDir '.env.postgres'),
  (Join-Path $frontendDir '.env')
)
$createdEnvFiles = @()

try {
  if ((git status --porcelain) -join "`n") { throw 'Release gate requires a clean Git worktree.' }
  foreach ($file in $temporaryEnvFiles) {
    if (Test-Path -LiteralPath $file) {
      throw "Release gate requires no local secret env file: $file"
    }
  }

  foreach ($pair in @(
    @((Join-Path $backendDir '.env.example'), (Join-Path $backendDir '.env')),
    @((Join-Path $backendDir '.env.postgres.example'), (Join-Path $backendDir '.env.postgres')),
    @((Join-Path $frontendDir '.env.example'), (Join-Path $frontendDir '.env'))
  )) {
    Copy-Item -LiteralPath $pair[0] -Destination $pair[1]
    $createdEnvFiles += $pair[1]
  }

  Push-Location $backendDir
  try {
    Invoke-Required 'backend npm ci' { npm ci }
    $env:DATABASE_URL = 'postgresql://prisma:prisma@127.0.0.1:5432/prisma'
    Invoke-Required 'backend Prisma validate' { npx prisma validate }
    Invoke-Required 'backend Prisma generate' { npm run prisma:generate }
    Invoke-Required 'backend typecheck' { npm run typecheck }
    Invoke-Required 'backend production build' { npm run build }
  } finally { Pop-Location }

  Push-Location $frontendDir
  try {
    Invoke-Required 'frontend npm ci' { npm ci }
    Invoke-Required 'frontend typecheck' { npm run typecheck }
    Invoke-Required 'frontend production build' { npm run build }
  } finally { Pop-Location }

  Invoke-Required 'deployment tests' { node --test deploy/scripts/*.test.js }
  Invoke-Required 'Compose model validation' {
    docker compose --env-file $frontendDir/.env -f docker-compose.prod.yml config | Out-Null
  }
  Invoke-Required 'Docker daemon availability' { docker info | Out-Null }
  Invoke-Required 'exact production backend/frontend Docker build' {
    docker compose --env-file $frontendDir/.env -f docker-compose.prod.yml build backend frontend
  }

  Write-Host 'RELEASE_CANDIDATE: READY'
} catch {
  Write-Error $_.Exception.Message
  Write-Host 'RELEASE_CANDIDATE: NOT_READY'
  exit 1
} finally {
  foreach ($file in $createdEnvFiles) {
    if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force }
  }
  if (Test-Path -LiteralPath $generatedPrismaDir) {
    git restore --source=HEAD --worktree -- $generatedPrismaDir
  }
}
