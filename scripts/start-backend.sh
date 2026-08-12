#!/usr/bin/env bash
# 一键启动后端 (Linux/macOS)
# 先跑一次 alembic upgrade head（幂等），再启动 uvicorn
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"
UVICORN="$VENV/bin/uvicorn"
ALEMBIC="$VENV/bin/alembic"

if [ ! -x "$UVICORN" ]; then
    echo "未发现虚拟环境: $VENV" >&2
    echo "请先运行首次安装:" >&2
    echo "  cd backend" >&2
    echo "  python3 -m venv .venv" >&2
    echo "  .venv/bin/pip install -r requirements.txt" >&2
    echo "  .venv/bin/alembic upgrade head" >&2
    exit 1
fi

echo "[start-backend] cwd = $BACKEND"
echo "[start-backend] uvicorn = $UVICORN"
echo "[start-backend] http://127.0.0.1:8000/docs"

cd "$BACKEND"
if [ -x "$ALEMBIC" ]; then
    echo "[start-backend] 运行数据库迁移 (alembic upgrade head)..."
    "$ALEMBIC" upgrade head
fi
exec "$UVICORN" app.main:app --reload --port 8000 --host 127.0.0.1