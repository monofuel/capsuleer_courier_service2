#!/usr/bin/env bash
# E2E smoke test: build frontend, start server, verify files load correctly.
# Run via: make e2e-test
set -e

echo "=== Frontend E2E Smoke Test ==="

# Use a random high port to avoid conflicts with running dev servers.
TEST_PORT=$((10000 + RANDOM % 50000))
export PORT=$TEST_PORT

PASS=0
FAIL=0

check() {
  if [ "$1" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  [OK] $2"
  else
    FAIL=$((FAIL + 1))
    echo "  [FAIL] $2"
  fi
}

# Build frontend.
echo "Building frontend..."
make -s frontend-dev
make -s build

# Start server in background.
echo "Starting server..."
./capsuleer_courier_service2 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

# Verify server is running.
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "  [FAIL] Server failed to start"
  exit 1
fi

echo ""
echo "--- HTTP status checks ---"

for path in "/" "/app.js" "/sui-bundle.js" "/style.css"; do
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${TEST_PORT}${path}" 2>/dev/null || echo "000")
  check "$([[ "$STATUS" = "200" ]] && echo 0 || echo 1)" "${path} returns 200 (got ${STATUS})"
done

echo ""
echo "--- Content checks ---"

curl -sf http://127.0.0.1:${TEST_PORT}/ | grep -q "courier-app"
check $? "index.html contains <courier-app>"

curl -sf http://127.0.0.1:${TEST_PORT}/ | grep -q "sui-bundle.js"
check $? "index.html references sui-bundle.js"

curl -sf http://127.0.0.1:${TEST_PORT}/ | grep -q "app.js"
check $? "index.html references app.js"

grep -q "window.SuiSDK" web/sui-bundle.js
check $? "sui-bundle.js sets window.SuiSDK"

grep -q "customElements.define" web/app.js
check $? "app.js registers web components"

grep -q "module courier_client" web/app.js
check $? "app.js includes courier_client module"

grep -q "module sui_client" web/app.js
check $? "app.js includes sui_client module"

echo ""
echo "--- JS syntax check ---"

if command -v node >/dev/null 2>&1; then
  node --check web/app.js 2>/dev/null
  check $? "app.js has valid JS syntax"
else
  echo "  [SKIP] node not available for syntax check"
fi

# Summary.
echo ""
echo "=== E2E Smoke: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
