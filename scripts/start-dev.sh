#!/usr/bin/env bash
set -e

echo "🚀 Starting Development Environment..."

# Kill any existing processes on required ports
echo "🧹 Cleaning up ports..."
lsof -ti:5000,5001,5002 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Backend Service
echo "📦 Starting Backend Service (port 5002)..."
cd backend && PORT=5002 NODE_ENV=development node index.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
for i in {1..20}; do
  if lsof -ti:5002 >/dev/null 2>&1; then
    echo "✅ Backend is ready!"
    break
  fi
  sleep 1
done

# Start AI Service
echo "🤖 Starting AI Service (port 5001)..."
cd ../ai-service && PORT=5001 NODE_ENV=development node server.js &
AI_PID=$!
echo "AI Service PID: $AI_PID"

# Wait for AI service to be ready
echo "⏳ Waiting for AI service..."
for i in {1..20}; do
  if lsof -ti:5001 >/dev/null 2>&1; then
    echo "✅ AI Service is ready!"
    break
  fi
  sleep 1
done

# Start Frontend
echo "🌐 Starting Frontend (port 5000)..."
cd ../ai-frontend && npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "✅ All services started!"
echo "========================================="
echo "Backend:  https://backend.ai.bakhmaro.co"
echo "AI:       https://backend.ai.bakhmaro.co"
echo "Frontend: https://backend.ai.bakhmaro.co"
echo "========================================="

# Wait for all background jobs
wait
