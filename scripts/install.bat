@echo off
REM 首次安装脚本 (Windows)
REM 创建虚拟环境, 安装依赖, 运行迁移, 启动后端

setlocal
cd /d "%~dp0\..\backend"

echo [1/4] 创建 Python 虚拟环境...
python -m venv .venv || goto :error

echo [2/4] 安装 Python 依赖...
call .venv\Scripts\pip install -q --upgrade pip
call .venv\Scripts\pip install -q -r requirements.txt || goto :error

echo [3/4] 数据库迁移...
if not exist data mkdir data
call .venv\Scripts\alembic.exe upgrade head || goto :error

echo [4/4] 启动后端 (Ctrl+C 停止)...
call .venv\Scripts\uvicorn.exe app.main:app --reload --port 8000 --host 127.0.0.1
goto :eof

:error
echo.
echo 安装失败,请检查上方错误信息。
exit /b 1