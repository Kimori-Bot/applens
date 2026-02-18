#!/bin/bash
# AppLens Automation - Start Script

cd "$(dirname "$0")"

echo "Starting AppLens Automation Server..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Start the server
echo "Starting server on port 3001..."
node dist/index.js
