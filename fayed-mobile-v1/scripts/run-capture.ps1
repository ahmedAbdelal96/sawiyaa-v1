$ErrorActionPreference = 'Stop'
$workdir = 'd:\Web\full-projects\fayed\fayed-mobile-v1'
if (!(Test-Path "$workdir\artifacts")) { New-Item -ItemType Directory -Path "$workdir\artifacts" | Out-Null }
$proc = Start-Process -FilePath 'npx.cmd' -ArgumentList 'expo','start','--web','--port','8088','--non-interactive' -WorkingDirectory $workdir -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 2
    try {
      $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8088' -UseBasicParsing -TimeoutSec 2
      if ($resp.StatusCode -ge 200) { $ready = $true; break }
    } catch {}
  }
  if (-not $ready) { throw 'Expo web server did not start on :8088' }
  node "$workdir\scripts\capture-screens.js"
}
finally {
  if ($proc -and !$proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
