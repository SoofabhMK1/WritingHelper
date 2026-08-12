# 测试脚本 (PowerShell)
# 运行后端 pytest + 前端 vitest + 类型检查 + 构建

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Step($name, $cmd, $cwd) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    Push-Location $cwd
    try {
        & $cmd
        if ($LASTEXITCODE -ne 0) { throw "$name failed (exit $LASTEXITCODE)" }
        Write-Host "$name OK" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

Step "Backend pytest"  { .venv\Scripts\python.exe -m pytest -v } $backend
Step "Frontend lint"  { npm run lint }                       $frontend
Step "Frontend vitest" { npx vitest run --testTimeout 15000 } $frontend
Step "Frontend build" { npm run build }                      $frontend

Write-Host "`nALL TESTS PASSED" -ForegroundColor Green