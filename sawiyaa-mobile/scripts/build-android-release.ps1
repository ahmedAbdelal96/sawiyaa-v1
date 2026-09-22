$ErrorActionPreference = "Stop"

$preferredJdk = "C:\Users\IT\.jdks\jbr-21.0.11"
if (Test-Path (Join-Path $preferredJdk "bin\java.exe")) {
  $env:JAVA_HOME = $preferredJdk
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  throw "A compatible Java runtime is required. Set JAVA_HOME to JDK 21 before building."
}

java -version
$androidDir = Join-Path $PSScriptRoot "..\android"
Push-Location $androidDir
try {
  & .\gradlew.bat :app:assembleRelease --console=plain
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
