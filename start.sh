#!/bin/sh
set -e

PORT=${PORT:-10000}
echo "Starting MedGuard AI Single-Link Unified Stack on Port $PORT..."

# 1. Start FastAPI backend in background on local port 8000
echo "Starting internal FastAPI backend on 127.0.0.1:8000..."
cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to initialize..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "FastAPI backend initialized successfully!"
    break
  fi
  sleep 1
done

# 2. Start Next.js frontend in foreground on public $PORT
echo "Starting Next.js frontend on 0.0.0.0:$PORT..."
cd /app/frontend
export PORT=$PORT
export HOSTNAME="0.0.0.0"
export INTERNAL_API_URL="http://127.0.0.1:8000"

exec npm start
