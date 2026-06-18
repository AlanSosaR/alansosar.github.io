param(
  [int]$Port = 3000,
  [string]$LogFile = "server.log",
  [switch]$OpenBrowser
)

$root = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $root $LogFile

Write-Host "=== Limpiando proceso anterior en puerto $Port ===" -ForegroundColor Cyan

# Kill any process already listening on the port
$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($existing) {
  $existing | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Write-Host "  -> Proceso(s) anterior(es) terminado(s)" -ForegroundColor Yellow
}

# Also kill any orphan live-server node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "live-server" } |
  ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 300

Write-Host "=== Iniciando live-server en http://127.0.0.1:$Port ===" -ForegroundColor Cyan
Write-Host "  -> Log: $logPath" -ForegroundColor Gray

# Determine npx path
$npx = Get-Command "npx" -ErrorAction SilentlyContinue
if (-not $npx) {
  Write-Host "!!! ERROR: npx no encontrado. Asegúrate de tener Node.js instalado. !!!" -ForegroundColor Red
  exit 1
}

$browserFlag = if (-not $OpenBrowser) { "--no-browser" } else { "" }

# Use cmd /c to redirect both stdout+stderr to the same log file (Start-Process can't do combined redirect)
$cmdLine = "npx live-server --port=$Port $browserFlag --wait=200 >> `"$logPath`" 2>&1"
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmdLine -WindowStyle Hidden -PassThru

# Wait and verify the port is actually listening
$maxWait = 10
$ready = $false
for ($i = 1; $i -le $maxWait; $i++) {
  Start-Sleep -Seconds 1
  $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
          Where-Object { $_.State -eq "Listen" }
  if ($conn) {
    $ready = $true
    break
  }
  # Check if process already died
  if ($proc.HasExited) {
    Write-Host "  -> El proceso murió prematuramente (exit code: $($proc.ExitCode))" -ForegroundColor Red
    break
  }
  Write-Host "  -> Esperando... ($i/$maxWait)" -ForegroundColor DarkGray
}

Write-Host ""

if ($ready) {
  Write-Host "=== SERVER LISTO ===" -ForegroundColor Green
  Write-Host "  http://127.0.0.1:$Port" -ForegroundColor Green
  Write-Host ""
  Write-Host "Para ver el log en vivo:" -ForegroundColor Gray
  Write-Host "  Get-Content -Path `"$logPath`" -Tail 20 -Wait" -ForegroundColor Gray
  Write-Host "  PID: $($proc.Id)" -ForegroundColor Gray
} else {
  Write-Host "!!! ERROR: El servidor no está respondiendo en puerto $Port !!!" -ForegroundColor Red
  if ($proc.HasExited) {
    Write-Host "El proceso terminó con exit code $($proc.ExitCode)." -ForegroundColor Red
  }
  Write-Host ""
  Write-Host "Últimas líneas del log:" -ForegroundColor Red
  Write-Host "-----------------------"
  if (Test-Path $logPath) {
    Get-Content -Path $logPath -Tail 30
  } else {
    Write-Host "(no se encontró $logPath)" -ForegroundColor Red
  }
  Write-Host "-----------------------"
  Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
  exit 1
}
