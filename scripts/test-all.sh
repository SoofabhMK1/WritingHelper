#!/usr/bin/env bash
# Linux/macOS equivalent
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

step() {
    echo -e "\n\033[36m=== $1 ===\033[0m"
}

step "Backend pytest"
(cd "$BACKEND" && .venv/bin/python -m pytest -v)

step "Frontend lint"
(cd "$FRONTEND" && npm run lint)

step "Frontend vitest"
(cd "$FRONTEND" && npx vitest run --testTimeout 15000)

step "Frontend build"
(cd "$FRONTEND" && npm run build)

echo -e "\n\033[32mALL TESTS PASSED\033[0m"