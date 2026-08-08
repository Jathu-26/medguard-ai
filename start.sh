#!/bin/sh
set -e

PORT=${PORT:-10000}
echo "=========================================================="
echo "Starting MedGuard AI Unified Stack on Port $PORT"
echo "=========================================================="

start_backend() {
  echo "Starting FastAPI backend on 0.0.0.0:8000..."
  cd /app/backend
  export PYTHONUNBUFFERED=1
  export PYTHONPATH="/app/backend:$PYTHONPATH"
  python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info &
  BACKEND_PID=$!
  echo "FastAPI PID: $BACKEND_PID"
}

start_backend

# Wait for backend to be ready
echo "Waiting for FastAPI backend to initialize..."
HEALTHY=0
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1 || curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "FastAPI backend initialized successfully on attempt $i!"
    HEALTHY=1
    break
  fi
  sleep 1
done

if [ $HEALTHY -eq 0 ]; then
  echo "Warning: FastAPI backend health check timed out on startup."
fi

# 2. Start Next.js frontend on public $PORT
echo "Starting Next.js frontend on 0.0.0.0:$PORT..."
cd /app/frontend
export INTERNAL_API_URL="http://127.0.0.1:8000"

node --max-old-space-size=4096 ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT" &
FRONTEND_PID=$!

cleanup() {
  echo "Stopping MedGuard stack..."
  kill -TERM "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM

# Watchdog loop: keep both processes alive and restart backend if it exits
while true; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Frontend process exited. Terminating stack."
    exit 1
  fi

  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "FastAPI backend process died. Auto-restarting FastAPI..."
    start_backend
  fi

  sleep 5
done
