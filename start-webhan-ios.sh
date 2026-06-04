#!/usr/bin/env sh
set -e

PORT=8080
HOST=127.0.0.1
APP_PATH="inventory-management-app.html"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "WebHAN iOS 本機伺服器啟動中..."
echo "工作目錄: $SCRIPT_DIR"
echo "網址: http://$HOST:$PORT/$APP_PATH"
echo

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
  exit $?
fi

if command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
  exit $?
fi

echo "找不到 Python。請先在 iOS shell 環境（如 a-Shell）安裝或啟用 Python。" >&2
exit 1
