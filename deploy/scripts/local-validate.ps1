param(
  [switch]$BuildDocker
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$env:COMPOSE_PROJECT_NAME = 'sawiyaa'

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message"
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[WARN] $Message"
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message"
}

function Ensure-FileFromExample {
  param(
    [Parameter(Mandatory = $true)][string]$TargetPath,
    [Parameter(Mandatory = $true)][string]$ExamplePath
  )

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    if (-not (Test-Path -LiteralPath $ExamplePath)) {
      throw "Missing example file: $ExamplePath"
    }

    Write-Info "Creating temporary file: $TargetPath"
    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][scriptblock]$ScriptBlock
  )

  Write-Info $Command
  & $ScriptBlock
  if ($LASTEXITCODE -ne 0) {
    throw ("Command failed with exit code {0}: {1}" -f $LASTEXITCODE, $Command)
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $repoRoot

$backendDir = Join-Path $repoRoot 'sawiyaa-backend-v1'
$frontendDir = Join-Path $repoRoot 'sawiyaa-frontend-v1'
$backendEnv = Join-Path $backendDir '.env'
$backendEnvExample = Join-Path $backendDir '.env.example'
$frontendEnv = Join-Path $frontendDir '.env'
$frontendEnvExample = Join-Path $frontendDir '.env.example'
$dbEnv = Join-Path $backendDir '.env.postgres'
$dbEnvExample = Join-Path $backendDir '.env.postgres.example'

try {
  Write-Info "Repo root: $repoRoot"
  Write-Info "Validating local Sawiyaa setup only. This script does not deploy."

  foreach ($folder in @($backendDir, $frontendDir)) {
    if (-not (Test-Path -LiteralPath $folder)) {
      throw "Required folder missing: $folder"
    }
  }

  Invoke-Checked 'docker --version' { docker --version }
  Invoke-Checked 'docker compose version' { docker compose version }

  Ensure-FileFromExample -TargetPath $backendEnv -ExamplePath $backendEnvExample
  Ensure-FileFromExample -TargetPath $frontendEnv -ExamplePath $frontendEnvExample
  Ensure-FileFromExample -TargetPath $dbEnv -ExamplePath $dbEnvExample

  Write-Info "Running backend checks..."
  Push-Location $backendDir
  try {
    Invoke-Checked 'npm ci (backend)' { npm ci }
    Invoke-Checked 'npm run prisma:generate (backend)' { npm run prisma:generate }
    Invoke-Checked 'npm run build (backend)' { npm run build }
  }
  finally {
    Pop-Location
  }

  Write-Info "Running frontend checks..."
  Push-Location $frontendDir
  try {
    Invoke-Checked 'npm ci (frontend)' { npm ci }
    Invoke-Checked 'npm run build (frontend)' { npm run build }
  }
  finally {
    Pop-Location
  }

  Write-Info "Validating Docker Compose configuration..."
  Invoke-Checked 'docker compose --env-file sawiyaa-frontend-v1/.env -f docker-compose.prod.yml config' {
    docker compose --env-file $frontendEnv -f docker-compose.prod.yml config | Out-Null
  }

  if ($BuildDocker) {
    Write-Info "Building Docker images for local validation..."
    Invoke-Checked 'docker compose --env-file sawiyaa-frontend-v1/.env -f docker-compose.prod.yml build' {
      docker compose --env-file $frontendEnv -f docker-compose.prod.yml build
    }
  }

  Write-Info "Local validation completed successfully."
  Write-Warn "This script does not deploy and does not replace GitHub Actions CI."
}
catch {
  Write-Fail $_.Exception.Message
  exit 1
}
