# AppLens - Week 2 Features

## Summary

Week 2 implements screenshot capture, human review with markers, export reports, and enhanced session management.

## New Features

### 1. Screenshot Capture
- SDK uses `react-native-view-shot` to capture base64 screenshots
- Auto-captures screenshots when `autoCaptureScreenshots` is enabled
- Can manually capture with `takeScreenshot()` hook method
- Screenshots sent to API and stored with session

### 2. Human Review
- Dashboard shows screenshot thumbnails in Screenshots tab
- Click any screenshot to view full size
- Click on screenshot to add issue markers at (x%, y%)
- Markers are saved with description and type
- Markers displayed as overlays on screenshots

### 3. Export Reports
- **JSON Export**: `/api/session/:id/export/json`
  - Full session data including screens, elements, screenshots metadata, activities, issues
  - Component tree included
- **Markdown Export**: `/api/session/:id/export/markdown`
  - Human-readable report with summary, screens list, issues, activity timeline

### 4. Better Sessions
- Auto-creates session when SDK connects with new session ID
- Shows session **duration** (computed from start/end times)
- Shows session **activity count**
- Sessions list shows: status badge, duration, screen count
- Filter by date range (dateFrom/dateTo)
- Filter by status (active/completed)

## API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/screenshot` | POST | Store screenshot |
| `/api/session/:id/screenshots` | GET | Get session screenshots |
| `/api/screenshot/:id` | GET | Get single screenshot with image |
| `/api/screenshot/:id/marker` | POST | Add issue marker to screenshot |
| `/api/screenshot/:id/markers` | GET | Get markers for screenshot |
| `/api/session/:id/export/json` | GET | Export session as JSON |
| `/api/session/:id/export/markdown` | GET | Export session as Markdown |
| `/api/activity` | POST | Store activity event |

## SDK Usage

```javascript
import { AppLensProvider, useAppLens } from '@applens/react-native';

function MyApp() {
  return (
    <AppLensProvider config={{
      apiUrl: 'http://localhost:3002',
      appId: 'my_app',
      autoCaptureScreenshots: true,
      screenshotInterval: 5000,
    }}>
      <AppContent />
    </AppLensProvider>
  );
}

function AppContent() {
  const { 
    startSession, 
    stopSession, 
    trackScreen, 
    trackElement, 
    takeScreenshot,
    screenshots,
    sessionActivity,
    getSessionDuration,
  } = useAppLens();
  
  // Use the methods...
}
```

## Dashboard Features

- **Session List**: Click to select, shows duration + screen count
- **Date Filter**: Filter sessions by date range
- **Status Filter**: Filter by active/completed
- **Screenshots Tab**: View + annotate screenshots with markers
- **Export Buttons**: Export current session as JSON or Markdown

## Files Modified

- `sdk/index.js` - Added screenshot capture, session auto-start, activities
- `server/index.js` - Added screenshot/marker endpoints, export endpoints
- `dashboard.html` - Complete UI overhaul with screenshot viewer + markers