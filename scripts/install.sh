#!/usr/bin/env bash
# 首次安装脚本 (Linux/macOS)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"

echo "[1/4] 创建虚拟环境..."
python3 -m venv "$VENV"

echo "[2/4] 安装依赖..."
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$BACKEND/requirements.txt"

echo "[3/4] 数据库迁移..."
mkdir -p "$BACKEND/data"
"$VENV/bin/alembic" -c "$BACKEND/alembic.ini" upgrade head

echo "[4/4] 启动后端 (Ctrl+C 停止)..."
cd "$BACKEND"
exec "$VENV/bin/uvicorn" app.main:app --reload --port 8000 --host 127.0.0.1