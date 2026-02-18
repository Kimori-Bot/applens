# AppLens 🤖

AI-Powered SDK for automated app testing. Developers add our SDK to their React Native app, and AI agents can autonomously explore, test, and review the app.

## How It Works

### 1. Developer adds SDK
```bash
npm install @applens/sdk
```

### 2. Configure the SDK
```javascript
import { AppLensProvider, useAppLens } from '@applens/sdk';

function App() {
  return (
    <AppLensProvider
      apiUrl="https://your-applens-server.com"
      appId="your-app-id"
      testMode={true} // Enable AI control
    >
      <YourApp />
    </AppLensProvider>
  );
}
```

### 3. User opens the app
The app connects to AppLens server. When `testMode=true`, the SDK starts polling for commands.

### 4. AI Agent takes control
The AI agent analyzes the app state and sends commands:
- `navigate(screenName)` - Go to a screen
- `tap(elementId)` - Tap an element  
- `input(field, value)` - Enter text
- `complete()` - End testing

### 5. View results in Dashboard
All sessions, screens, elements, and screenshots are captured in the dashboard.

## Quick Start

### Option 1: Run with Docker
```bash
# Clone and run
docker-compose up

# Access
# API: http://localhost:3002
# Dashboard: http://localhost:3002
```

### Option 2: Run locally
```bash
cd server
npm install
npm start

# In another terminal, serve dashboard
cd ..
npx serve -l 3005 .
```

### Run the AI Agent
```bash
# Start the agent with session
node ai-agent.js --appId cleantasks --sessionId session_123
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────┐
│  Developer App  │────▶│  AppLens API │◀────│  AI Agent      │
│  (with SDK)     │     │  Server      │     │  (this repo)   │
└─────────────────┘     └──────────────┘     └────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Dashboard   │
                        │  (web UI)    │
                        └──────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screen` | POST | Track screen visit |
| `/api/element` | POST | Track element interaction |
| `/api/screenshot` | POST | Capture screenshot |
| `/api/sessions` | GET | List sessions |
| `/api/test/command` | POST | Send command to app |
| `/api/test/commands` | GET | Get pending commands |
| `/api/session/:id/export/json` | GET | Export session data |

## Demo Apps

- **CleanTasks**: Task management app with multiple screens
  - APK: `http://100.79.223.42:3009/app-debug.apk`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APPLENS_API_URL` | http://localhost:3002 | Server URL |
| `PORT` | 3002 | Server port |

## Deployment

### Docker
```bash
docker build -t applens ./server
docker run -p 3002:3002 applens
```

### Docker Compose with Redis
```bash
docker-compose up -d
```

## License

MIT