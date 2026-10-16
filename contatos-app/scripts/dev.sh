#!/usr/bin/env bash
# Sobe os 4 processos de desenvolvimento: API, WebSocket (Reverb), fila e Vite.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
trap 'kill 0' EXIT INT TERM

(cd "$ROOT/backend" && php artisan serve --host=127.0.0.1 --port=8000) &
(cd "$ROOT/backend" && php artisan reverb:start --host=0.0.0.0 --port=8080) &
(cd "$ROOT/backend" && php artisan queue:work --tries=3 --sleep=1) &
(cd "$ROOT/frontend" && npm run dev) &
wait
