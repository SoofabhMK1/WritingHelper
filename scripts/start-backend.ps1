# 一键启动后端 (Windows)
# 自动 cd 到 backend 目录、用虚拟环境、用正确的 app.main:app

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$venv = Join-Path $backend ".venv"
$uvicorn = Join-Path $venv "Scripts\uvicorn.exe"

if (-not (Test-Path $uvicorn)) {
    Write-Host "未发现虚拟环境: $venv" -ForegroundColor Red
    Write-Host "请先运行首次安装:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host "  .venv\Scripts\alembic upgrade head" -ForegroundColor Yellow
    exit 1
}

Write-Host "[start-backend] cwd = $backend" -ForegroundColor Cyan
Write-Host "[start-backend] uvicorn = $uvicorn" -ForegroundColor Cyan
Write-Host "[start-backend] http://127.0.0.1:8000/docs" -ForegroundColor Green

Push-Location $backend
try {
    & $uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
} finally {
    Pop-Location
}