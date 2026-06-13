#!/usr/bin/env bash
# 전자회로 CBT 정적 서버
cd "$(dirname "$0")" || exit 1
PORT="${1:-8731}"
URL="http://localhost:${PORT}"
echo "⚡ 전자회로 CBT  →  ${URL}"
command -v open >/dev/null && ( sleep 1; open "$URL" ) &
exec python3 -m http.server "$PORT"
