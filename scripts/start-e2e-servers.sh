#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build -w @ncs_software/widget-system
npm run build -w @ncs_software/widget-system-angular
npm run build -w @ncs_software/widget-system-react
npm run build -w demo-angular
npm run build -w demo-react

cleanup() {
  kill "${REACT_PID:-}" "${ANGULAR_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run preview -w demo-react -- --host 127.0.0.1 --port 4173 &
REACT_PID=$!

npx --yes serve apps/demo-angular/dist/browser -l tcp://127.0.0.1:4174 --no-clipboard -s &
ANGULAR_PID=$!

wait_for() {
  local url=$1
  local label=$2
  for _ in $(seq 1 120); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "$label ready at $url"
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $label at $url" >&2
  exit 1
}

wait_for 'http://127.0.0.1:4173/react/workspace/demo' 'React demo'
wait_for 'http://127.0.0.1:4174/workspace/demo' 'Angular demo'

wait
