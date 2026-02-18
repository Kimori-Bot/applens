# AppLens AI Agent 🤖

Autonomous AI agent for testing mobile apps with AppLens SDK. The agent explores apps, detects issues, generates fixes, and reports results.

## Features

1. **Autonomous Exploration** - Reads app state from API, decides what to tap/interact with next, tracks what's been explored
2. **Issue Detection** - Compares expected vs actual behavior, flags crashes/errors/UI bugs
3. **Code Fix Generation** - Analyzes issues, generates code fixes, can apply via git
4. **Comprehensive Reporting** - Summary, screenshots, recommendations

## Usage

```bash
# Basic test run
node applens-agent.js --appId cleantasks --maxIterations=10

# With custom session
node applens-agent.js --appId cleantasks --sessionId my_session_123

# Continuous mode (keeps running)
node applens-agent.js --appId cleantasks --continuous

# Fix issues after testing
node applens-agent.js --appId cleantasks --fixIssues

# Generate report only
node applens-agent.js --appId cleantasks --report

# Simulate issues for testing fix generation
node applens-agent.js --appId cleantasks --simulateIssues --fixIssues

# All options combined
node applens-agent.js --appId cleantasks --continuous --fixIssues --maxIterations=100
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--appId=` | App ID to test | `cleantasks` |
| `--sessionId=` | Session ID | Auto-generated |
| `--maxIterations=` | Max iterations | `50` |
| `--continuous` | Run continuously | `false` |
| `--fixIssues` | Generate code fixes | `false` |
| `--report` | Generate test report | `true` |
| `--simulateIssues` | Inject test issues | `false` |

## How It Works

### 1. Exploration Phase
- Connects to AppLens API to get current app state
- Reads screens, elements, and session data
- Makes intelligent decisions on what to tap/interact with
- Tracks visited screens and elements to avoid repetition

### 2. Issue Detection
Analyzes the app for:
- **Crashes** - App force closes, ANR errors
- **Errors** - API failures, exceptions
- **Network Issues** - Timeouts, connection problems
- **UI Bugs** - Disabled elements, rendering issues
- **Performance** - Slow rendering, lag

### 3. Fix Generation
For each issue type, generates appropriate code fixes:
- Error handling with try-catch
- Null safety checks
- Network retry logic
- UI state fixes
- Performance optimizations (React.memo, useMemo)

### 4. Reporting
Generates JSON reports with:
- Summary of testing
- Issues by severity and type
- Test actions performed
- Recommendations for fixes

## Output Files

Reports are saved to `data/`:
- `report_<sessionId>.json` - Full test report
- `fix_<timestamp>.js` - Generated code fixes

## API Endpoints Used

- `GET /api/screens` - Get visited screens
- `GET /api/elements` - Get UI elements  
- `GET /api/sessions` - Get session info
- `GET /api/screenshots` - Get captured screenshots
- `POST /api/test/command` - Send commands to app
- `POST /api/session/register` - Register new session

## Example Report

```json
{
  "summary": {
    "appId": "cleantasks",
    "totalIssues": 3
  },
  "exploration": {
    "screensVisited": ["Home", "Settings"],
    "elementsEncountered": 31
  },
  "severityBreakdown": {
    "high": 1,
    "medium": 1,
    "low": 1
  },
  "recommendations": [
    "Add comprehensive error handling",
    "Optimize rendering with React.memo"
  ]
}
```
