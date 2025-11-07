#!/usr/bin/env bash

# Start all services in background
echo "🚀 Starting all services..."

# Frontend on port 5000
cd /home/runner/workspace/ai-frontend && npm run dev &

# Backend on port 5002  
cd /home/runner/workspace/backend && PORT=5002 node index.js &

# AI Service on port 5001
cd /home/runner/workspace/ai-service && PORT=5001 node server.js &

# Wait for all background jobs
wait
