# Ziora Ops: arranque local en un paso (Windows PowerShell 5+ / PowerShell 7)
# Doble clic en iniciar.cmd, o desde PowerShell:  .\iniciar.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Paso($t) { Write-Host "`n==> $t" -ForegroundColor Green }
function Falla($t) { Write-Host "`nERROR: $t" -ForegroundColor Red; Read-Host "Presiona Enter para cerrar"; exit 1 }

# 1. Requisitos
Paso "Revisando Node y Docker"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Falla "No encuentro Node.js. Instala Node 22 desde https://nodejs.org" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Falla "No encuentro Docker. Instala Docker Desktop." }
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop no está corriendo; intento abrirlo..." -ForegroundColor Yellow
  $dd = "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dd) { Start-Process $dd }
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep 3; docker info *> $null; if ($LASTEXITCODE -eq 0) { break } }
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { Falla "Docker no arrancó. Abre Docker Desktop, espera a que diga 'Running' y vuelve a ejecutar esto." }
}

# 2. .env con secreto local
Paso "Preparando .env"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
$envText = Get-Content ".env" -Raw
if ($envText -match "(?m)^AUTH_SECRET=\s*$") {
  $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $envText = $envText -replace "(?m)^AUTH_SECRET=\s*$", ("AUTH_SECRET=" + [Convert]::ToBase64String($bytes))
}
if ($envText -match "(?m)^UNSUBSCRIBE_SECRET=\s*$") {
  $envText = $envText -replace "(?m)^UNSUBSCRIBE_SECRET=\s*$", ("UNSUBSCRIBE_SECRET=" + [guid]::NewGuid().ToString("N"))
}
if ($envText -notmatch "(?m)^DEV_LOGIN_EMAIL=.+") { $envText += "`nDEV_LOGIN_EMAIL=uriel@ziora.dev`n" }
Set-Content ".env" $envText -NoNewline -Encoding UTF8

# 3. Base de datos
Paso "Levantando Postgres local (puerto 5433)"
docker compose up -d
if ($LASTEXITCODE -ne 0) { Falla "docker compose up falló. ¿El puerto 5433 está ocupado por otro programa?" }
$listo = $false
for ($i = 0; $i -lt 40; $i++) {
  docker compose exec -T db pg_isready -U eventops -d eventops *> $null
  if ($LASTEXITCODE -eq 0) { $listo = $true; break }
  Start-Sleep 2
}
if (-not $listo) { Falla "Postgres no respondió. Revisa: docker compose logs db" }

# 4. Dependencias
Paso "Instalando dependencias (npm install)"
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Falla "npm install falló (revisa tu conexión a internet)." }

# 5. Tablas y datos de ejemplo
Paso "Creando tablas y datos de ejemplo"
npm run db:setup
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nLa base local quedó de una versión anterior y no se pudo migrar." -ForegroundColor Yellow
  $r = Read-Host "¿Reinicio la base LOCAL de Ziora Ops? Solo borra los datos de ejemplo de este Postgres (5433), no toca Event Ops. (s/n)"
  if ($r -notmatch "^[sS]") { Falla "Sin reiniciar no puedo continuar." }
  docker compose down -v
  docker compose up -d
  for ($i = 0; $i -lt 40; $i++) { docker compose exec -T db pg_isready -U eventops -d eventops *> $null; if ($LASTEXITCODE -eq 0) { break }; Start-Sleep 2 }
  Start-Sleep 3
  npm run db:setup
  if ($LASTEXITCODE -ne 0) { Falla "db:setup volvió a fallar. Copia el mensaje de arriba y mándamelo." }
}

# 6. Arrancar y abrir el navegador cuando responda
Paso "Iniciando Ziora Ops en http://localhost:3001 (Ctrl+C para detener)"
Start-Job -ScriptBlock {
  for ($i = 0; $i -lt 90; $i++) {
    try { Invoke-WebRequest "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 *> $null; Start-Process "http://localhost:3001/dashboard"; return } catch { Start-Sleep 2 }
  }
} | Out-Null
npm run dev
