# AppLens Auto-Navigation Engine

Enterprise-grade AI automation system for autonomously navigating React Native applications.

## Architecture Overview

The AppLens Auto-Navigation Engine uses a modular, event-driven architecture with the following core components:

```
┌─────────────────────────────────────────────────────────────────┐
│                     AppDriver (Orchestrator)                     │
│  - Session Management                                           │
│  - Coordinates AI Engine & UI Handler                            │
│  - Health Monitoring                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Events
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌─────────────────────┐
│ AIDecision    │  │ UIInteraction│  │ StateManager        │
│ Engine        │  │ Handler      │  │                     │
│               │  │              │  │ - Screen Tracking   │
│ - Analyzes    │  │ - Executes   │  │ - Element Registry  │
│   screen state│  │   actions    │  │ - Action History    │
│ - Decides     │  │ - Retry logic│  │ - Exploration Graph │
│   next action │  │ - Test Mode  │  │ - Report Generation │
│ - Maintains   │  │   API        │  │                     │
│   exploration │  │              │  │                     │
│   graph       │  │              │  │                     │
└───────────────┘  └──────────────┘  └─────────────────────┘
```

## Core Modules

### 1. AI Decision Engine (`src/ai-engine/`)

Analyzes the current screen state and decides the next action using a hybrid strategy:

- **Random Exploration**: Discovers new UI paths
- **Smart Exploration**: Uses element priorities and graph knowledge
- **Hybrid Mode**: Combines both strategies with configurable weights

Key features:
- Element scoring based on type, visibility, and interaction history
- Exploration graph tracking visited screens
- Configurable decision weights

### 2. UI Interaction Handler (`src/ui-handler/`)

Handles actual UI interactions with the app via Test Mode API:

- Sends commands to the app (tap, swipe, input, etc.)
- Handles element lookup and interaction
- Implements retry logic for failed interactions
- Polls for command results

### 3. App Driver (`src/driver/`)

Orchestrates the entire automation session:

- Manages app lifecycle (start/stop/pause/resume)
- Coordinates between AI engine and UI handler
- Session management and health monitoring
- Limits enforcement (max actions, time limits)

### 4. State Manager (`src/state/`)

Tracks all exploration data:

- Records visited screens and elements
- Maintains element registry
- Records action history
- Generates exploration reports
- Builds exploration graph

### 5. Event Bus (`src/event-bus.ts`)

Central event system for module communication:

- Decoupled module interactions
- Event history for debugging
- Statistics tracking

## Configuration

All behavior is controlled via JSON configuration files in `config/`:

### exploration-strategy.json

```json
{
  "strategy": {
    "type": "hybrid",
    "randomExploration": {
      "enabled": true,
      "weight": 0.3
    },
    "smartExploration": {
      "enabled": true,
      "weight": 0.7
    }
  },
  "actionWeights": {
    "tap": 0.6,
    "swipeUp": 0.15
  },
  "elementPriorities": {
    "button": 1.0,
    "link": 0.9
  },
  "limits": {
    "maxActionsPerSession": 500,
    "maxTimePerSession": 3600000
  }
}
```

## API Endpoints

### Automation Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/automation/start` | POST | Start auto-navigation session |
| `/api/automation/stop` | POST | Stop current session |
| `/api/automation/pause` | POST | Pause automation |
| `/api/automation/resume` | POST | Resume automation |
| `/api/automation/status` | GET | Get current status |
| `/api/automation/report` | GET | Get exploration report |

### Test Mode Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/testmode/state` | GET | Get current screen state |
| `/api/testmode/execute` | POST | Execute command |
| `/api/testmode/commands` | GET | Poll for commands |
| `/api/testmode/result` | POST | Report command result |

## Usage

### Start Automation

```bash
curl -X POST http://localhost:3001/api/automation/start \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "com.example.app",
    "config": {
      "strategy": { "type": "hybrid" }
    }
  }'
```

### Get Status

```bash
curl http://localhost:3001/api/automation/status
```

### Get Report

```bash
curl http://localhost:3001/api/automation/report
```

### Stop Automation

```bash
curl -X POST http://localhost:3001/api/automation/stop
```

## Test Mode Integration

The app should integrate with Test Mode by:

1. **Polling for commands**: App calls `GET /api/testmode/commands` periodically
2. **Executing commands**: App performs the action (tap, swipe, etc.)
3. **Reporting results**: App calls `POST /api/testmode/result` with outcome

Example flow:
```javascript
// In React Native app
async function testModeLoop() {
  while (running) {
    const commands = await fetch('/api/testmode/commands').then(r => r.json());
    
    for (const cmd of commands) {
      const result = await executeCommand(cmd);
      await fetch('/api/testmode/result', {
        method: 'POST',
        body: JSON.stringify({
          commandId: cmd.id,
          success: result.success,
          screenshot: result.screenshot,
          elements: result.elements
        })
      });
    }
    
    await sleep(500);
  }
}
```

## Project Structure

```
automation/
├── config/
│   └── exploration-strategy.json
├── src/
│   ├── ai-engine/
│   │   ├── decision-engine.ts
│   │   └── index.ts
│   ├── ui-handler/
│   │   ├── ui-interaction-handler.ts
│   │   └── index.ts
│   ├── driver/
│   │   ├── app-driver.ts
│   │   └── index.ts
│   ├── state/
│   │   ├── state-manager.ts
│   │   └── index.ts
│   ├── event-bus.ts
│   ├── logger.ts
│   ├── types.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Running

```bash
# Install dependencies
cd /workspace/applens/automation
npm install

# Build TypeScript
npm run build

# Start server
npm start
```

The automation server runs on port 3001 by default.

## Exploration Report

The generated report includes:

- Session duration and action counts
- Success/failure rates
- Screens visited with visit counts
- Elements discovered
- Navigation paths taken
- Action breakdown by type
- Errors encountered
- Graph statistics (nodes/edges)
