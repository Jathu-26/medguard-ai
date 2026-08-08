#!/bin/sh
set -e

PORT=${PORT:-10000}
echo "Starting MedGuard AI Single-Link Unified Stack on Port $PORT..."

# 1. Start FastAPI backend in background on internal port 8000
echo "Starting internal FastAPI backend on 0.0.0.0:8000..."
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to initialize..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1 || curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "FastAPI backend initialized successfully!"
    break
  fi
  sleep 1
done

# 2. Start Next.js frontend in background on public $PORT
echo "Starting Next.js frontend on 0.0.0.0:$PORT..."
cd /app/frontend
export INTERNAL_API_URL="http://127.0.0.1:8000"

node --max-old-space-size=4096 ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT" &
FRONTEND_PID=$!

# Trap signals and forward to children
cleanup() {
  echo "Stopping MedGuard stack..."
  kill -TERM "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM

# Wait for both processes to keep container alive
wait "$FRONTEND_PID" "$BACKEND_PID"

