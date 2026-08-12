# 一键启动后端 (Linux/macOS)
#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"
UVICORN="$VENV/bin/uvicorn"

if [ ! -x "$UVICORN" ]; then
    echo "未发现虚拟环境: $VENV" >&2
    echo "请先运行首次安装:" >&2
    echo "  cd backend" >&2
    echo "  python -m venv .venv" >&2
    echo "  .venv/bin/pip install -r requirements.txt" >&2
    echo "  .venv/bin/alembic upgrade head" >&2
    exit 1
fi

echo "[start-backend] cwd = $BACKEND"
echo "[start-backend] http://127.0.0.1:8000/docs"
cd "$BACKEND"
exec "$UVICORN" app.main:app --reload --port 8000 --host 127.0.0.1