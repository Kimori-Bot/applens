#!/bin/bash
# AppLens Build Script
# Builds the API server and demo apps

set -e

echo "🔧 Building AppLens..."

# Build API Server Docker image
echo "📦 Building Docker image..."
cd /root/.openclaw/workspace/applens
docker build -t applens:latest .

echo "✅ Build complete!"
echo ""
echo "Run with:"
echo "  docker run -p 3002:3002 -p 3005:3005 applens"
echo ""
echo "Or use docker-compose:"
echo "  docker-compose up"
