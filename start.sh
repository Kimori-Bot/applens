#!/bin/bash
# AppLens Quick Start Script
# Runs everything locally without Docker (for development)

set -e

echo "🚀 Starting AppLens..."

# Start API Server
echo "📡 Starting API server on port 3002..."
cd /root/.openclaw/workspace/applens/server
node index.js &
API_PID=$!

# Start Dashboard
echo "📊 Starting dashboard on port 3005..."
cd /root/.openclaw/workspace/applens
npx serve -l 3005 . &
DASH_PID=$!

# Wait for services
sleep 3

echo ""
echo "✅ AppLens is running!"
echo ""
echo "  API Server:  http://localhost:3002"
echo "  Dashboard:   http://localhost:3005"
echo ""
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap "kill $API_PID $DASH_PID 2>/dev/null" EXIT
wait
