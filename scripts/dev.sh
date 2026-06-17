#!/usr/bin/env bash
# Next.js dev cache (.next) can corrupt during hot reload, causing random 500s.
# This script keeps a single dev server and auto-restarts when the cache breaks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -d "$HOME/.nvm/versions/node" ]]; then
  NODE_BIN="$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1)"
  export PATH="$HOME/.nvm/versions/node/$NODE_BIN/bin:$PATH"
fi

PORT="${PORT:-3000}"
CLEAN=false
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=true
fi

kill_port() {
  lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
}

clean_cache() {
  rm -rf .next node_modules/.cache
}

wait_for_server() {
  for _ in $(seq 1 45); do
    if curl -sf -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

check_health() {
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || echo "000")"
  [[ "$code" != "500" ]]
}

kill_port
sleep 0.5

if $CLEAN; then
  clean_cache
fi

while true; do
  echo "Starting Next.js dev server on http://localhost:$PORT ..."
  npx next dev --turbopack &
  DEV_PID=$!

  if ! wait_for_server; then
    echo "Dev server failed to start."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    clean_cache
    sleep 2
    continue
  fi

  echo "Dev server ready."

  FAILURES=0
  while kill -0 "$DEV_PID" 2>/dev/null; do
    sleep 4
    if check_health; then
      FAILURES=0
      continue
    fi

    FAILURES=$((FAILURES + 1))
    if [[ $FAILURES -ge 2 ]]; then
      echo "Detected repeated HTTP 500 — clearing .next cache and restarting..."
      kill "$DEV_PID" 2>/dev/null || true
      wait "$DEV_PID" 2>/dev/null || true
      clean_cache
      sleep 1
      break
    fi
  done

  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    wait "$DEV_PID" 2>/dev/null || true
    echo "Dev server exited — restarting in 2s..."
    clean_cache
    sleep 2
  fi
done
