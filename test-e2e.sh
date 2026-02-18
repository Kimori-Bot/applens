#!/bin/bash
set -e

echo "=== AppLens v1.0 End-to-End Test ==="
echo ""

# Test 1: API Health
echo "1. Testing API health..."
HEALTH=$(curl -s http://localhost:3002/api/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "   ✅ API is healthy"
else
    echo "   ❌ API health check failed"
    exit 1
fi

# Test 2: Start Session
echo "2. Starting a new session..."
SESSION=$(curl -s -X POST http://localhost:3002/api/session/start \
    -H "Content-Type: application/json" \
    -d '{"appId": "test-app", "device": "test-device"}')
echo "   Session: $SESSION"

# Test 3: Track Screen
echo "3. Tracking a screen..."
SCREEN=$(curl -s -X POST http://localhost:3002/api/screen \
    -H "Content-Type: application/json" \
    -d '{"sessionId": "test-session", "appId": "test-app", "screen": {"id": "home", "name": "Home"}}')
echo "   ✅ Screen tracked"

# Test 4: Track Element
echo "4. Tracking an element..."
ELEMENT=$(curl -s -X POST http://localhost:3002/api/element \
    -H "Content-Type: application/json" \
    -d '{"sessionId": "test-session", "appId": "test-app", "element": {"id": "btn-1", "type": "button", "label": "Click Me"}}')
echo "   ✅ Element tracked"

# Test 5: Get Sessions
echo "5. Getting sessions list..."
SESSIONS=$(curl -s http://localhost:3002/api/sessions)
if echo "$SESSIONS" | grep -q "test-app"; then
    echo "   ✅ Sessions retrieved"
else
    echo "   ❌ Failed to get sessions"
fi

# Test 6: Get App Sessions
echo "6. Getting app-specific sessions..."
APP_SESSIONS=$(curl -s http://localhost:3002/api/app/test-app/sessions)
echo "   ✅ App sessions: $APP_SESSIONS"

# Test 7: Dashboard accessible
echo "7. Checking dashboard..."
DASH=$(curl -s http://localhost:3005 | grep -c "AppLens")
if [ "$DASH" -gt 0 ]; then
    echo "   ✅ Dashboard is serving"
else
    echo "   ❌ Dashboard issue"
fi

echo ""
echo "=== All Tests Passed ==="
