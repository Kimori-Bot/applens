# AppLens Week 2 Plan - Feature Specifications

**Week 2 Focus:** Real screenshot capture, human review workflow, export capabilities, and improved session management.

---

## Overview

Week 1 delivered the foundational SDK, API server, and basic dashboard. Week 2 adds the critical capability to capture *actual screenshots* (not just screen names), enables human reviewers to mark issues directly on screenshots, adds export functionality, and improves how sessions are managed.

---

## Feature 1: Real Screenshots from Apps

### Problem
Week 1 only captured screen names, not actual visuals. Reviewers need to see what the app actually looks like.

### Solution
Add screenshot capture capability to the SDK using React Native's built-in capture mechanisms.

### Implementation

#### SDK Changes (`/workspace/applens/sdk/`)

**New Function: `captureScreenshot()`**
- Captures the current screen as a base64-encoded PNG
- Uses React Native's `react-native-view-shot` or equivalent
- Returns: `{ id: string, base64: string, timestamp: number, width: number, height: number }`

**Configuration Options**: Add to `AppLensProvider`:
```javascript
<AppLensProvider config={{
  appId: 'my-app',
  captureScreenshots: true,      // Enable screenshot capture
  screenshotQuality: 'medium',   // 'low' | 'medium' | 'high'
  captureOnNavigate: true        // Auto-capture on screen change
}}>
```

**Modified Functions**:
- `trackScreen(name)` - Now also triggers screenshot capture if enabled

#### API Updates (`/workspace/applens/server/`)

**New Endpoints:**
- `POST /api/screenshot` - Upload screenshot base64
  - Body: `{ sessionId: string, screenId: string, base64: string, width: number, height: number }`
  - Returns: `{ id: string, url: string }`

- `GET /api/screenshot/:id` - Retrieve screenshot
  - Returns: Raw PNG image or base64

- `GET /api/session/:id/screenshots` - List all screenshots for session
  - Returns: Array of screenshot metadata

#### Database Schema Updates (`/workspace/applens/supabase/schema.sql`)

**New Table: `screenshots`**
```sql
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES review_sessions(id),
  screen_id TEXT,
  element_tree_id UUID REFERENCES tracked_elements(id),
  image_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Technical Notes
- Use `react-native-view-shot` for cross-platform screenshot capture
- Compress images before upload to reduce bandwidth (configurable quality)
- Store screenshots in Supabase Storage or as base64 in database (for MVP)

---

## Feature 2: Human Review - Click to Mark Issues

### Problem
Human reviewers need a way to identify and annotate problems they see on screenshots.

### Solution
Interactive screenshot viewer where reviewers can click on specific areas to mark issues with annotations.

### Implementation

#### Dashboard UI Updates (`/workspace/applens/dashboard/`)

**Screenshot Viewer Component**
- Full-size screenshot display with zoom/pan support
- Click-to-annotate: Click creates a marker at that position
- Markers display as numbered pins on the image

**Annotation Modal**
- Appears when clicking on screenshot
- Fields:
  - **Issue Type**: dropdown (UI Bug, UX Issue, Performance, Crash, Other)
  - **Severity**: (Low, Medium, High, Critical)
  - **Description**: text field for details
  - **Suggested Fix**: optional text field

**Issue Markers on Screenshots**
- Visual pins with numbers (1, 2, 3...)
- Color-coded by severity:
  - 🔴 Critical/High
  - 🟡 Medium
  - 🔵 Low/Other
- Hover shows issue summary
- Click opens full issue details

**Screenshot Gallery View**
- Grid of all screenshots in a session
- Thumbnail with issue count badge
- Click to open full review mode

#### New API Endpoints

- `POST /api/issue` - **Already exists, verify fields**
  - Body: `{ sessionId, screenshotId, x, y, type, severity, description, suggestedFix }`
  - Returns: `{ id: string }`

- `GET /api/session/:id/issues` - Get all issues for session
- `PUT /api/issue/:id` - Update issue (status, description)
- `DELETE /api/issue/:id` - Remove issue

#### Database Schema Updates

**Enhanced `issues` Table:**
```sql
ALTER TABLE issues ADD COLUMN IF NOT EXISTS screenshot_id UUID REFERENCES screenshots(id);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS x_position FLOAT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS y_position FLOAT;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'; -- 'open', 'confirmed', 'fixed', 'dismissed'
```

### User Flow
1. Reviewer opens session in dashboard
2. Clicks on a screenshot thumbnail
3. Screenshot opens in review mode (full size)
4. Reviewer clicks on problem area
5. Annotation modal appears with issue type/severity/description
6. Submit creates marker on screenshot
7. Can navigate between screenshots, see all markers

---

## Feature 3: Export Reports (JSON/Markdown)

### Problem
Users need to export review results for sharing, debugging, or integrating with other tools.

### Solution
Export session data as downloadable JSON or Markdown reports.

### Implementation

#### Dashboard UI

**Export Button**
- Located in session header area
- Dropdown menu: "Export JSON" | "Export Markdown" | "Export PDF"

**Export Options Modal**
- Include/exclude sections:
  - [x] Session summary
  - [x] Screenshots (as URLs or embedded)
  - [x] Issue list
  - [x] Element trees
- Format selection

#### Export Formats

**JSON Export (`session-[id].json`)**
```json
{
  "session": {
    "id": "uuid",
    "appId": "tip-calculator",
    "startedAt": "2026-02-18T10:00:00Z",
    "endedAt": "2026-02-18T10:30:00Z",
    "status": "completed"
  },
  "screenshots": [
    {
      "id": "uuid",
      "screenName": "Home",
      "url": "https://...",
      "capturedAt": "2026-02-18T10:05:00Z"
    }
  ],
  "issues": [
    {
      "id": "uuid",
      "screenshotId": "uuid",
      "x": 120,
      "y": 340,
      "type": "UI Bug",
      "severity": "high",
      "description": "Button not responding to taps",
      "status": "open"
    }
  ],
  "metadata": {
    "exportedAt": "2026-02-18T11:00:00Z",
    "exporter": "user@example.com"
  }
}
```

**Markdown Export (`session-[id].md`)**
```markdown
# AppLens Review Report

**App:** TipCalculator | **Session:** #abc123 | **Date:** 2026-02-18

## Summary
- Duration: 30 minutes
- Screens Captured: 5
- Issues Found: 3 (1 High, 2 Medium)

## Screenshots

### 1. Home Screen
![Home](screenshot-url)
Captured: 10:05 AM

### 2. Bill Entry
![Bill Entry](screenshot-url)
Captured: 10:10 AM

---

## Issues

### Issue #1 - High Severity
**Type:** UI Bug | **Screen:** Home
**Location:** x:120, y:340

Button not responding to taps on iPhone 14.

### Issue #2 - Medium Severity
**Type:** UX Issue | **Screen:** Bill Entry
**Location:** x:200, y:100

Input field label hard to read in dark mode.

---

*Generated by AppLens*
```

#### New API Endpoints

- `GET /api/session/:id/export/json` - Download JSON
- `GET /api/session/:id/export/markdown` - Download Markdown

#### Implementation Approach
- Build export logic in server (Node.js) for consistency
- Use client-side download for simplicity (window.download or blob URL)
- Store exported files in Supabase Storage for PDF reports

---

## Feature 4: Better Session Management

### Problem
Week 1's session management is basic. Need better controls for starting, pausing, resuming, and organizing review sessions.

### Solution
Enhanced session lifecycle with status tracking, session metadata, and improved dashboard UX.

### Implementation

#### Session Lifecycle

**Session States:**
- `created` - Session created, not started
- `active` - Currently recording
- `paused` - Temporarily paused
- `completed` - Manually or auto-completed
- `archived` - Old sessions archived

#### Dashboard UI Improvements

**Session List View**
- Filter by: status, date range, app
- Sort by: date, issue count, duration
- Search by session ID or app name

**Session Detail View**
- Header with status badge and controls
- Quick stats: duration, screenshot count, issue count
- Action buttons: Resume, Pause, End, Archive, Delete, Export

**Active Session Banner**
- Show when there's an active session
- Quick link to continue reviewing
- End session button

#### API Enhancements

**Existing endpoints to enhance:**
- `POST /api/session/start` - Add `appId`, `userId`, `metadata`
- `POST /api/session/:id/end` - Add `finalNotes`, `completedBy`

**New endpoints:**
- `POST /api/session/:id/pause` - Pause recording
- `POST /api/session/:id/resume` - Resume recording
- `POST /api/session/:id/archive` - Archive session
- `GET /api/sessions` - List with filtering/pagination

```javascript
// GET /api/sessions query params
{
  status: 'active' | 'completed' | 'archived',
  appId: 'string',
  from: '2026-01-01',
  to: '2026-02-18',
  page: 1,
  limit: 20
}
```

#### Database Schema Updates

**New/Modified Session Fields:**
```sql
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS screenshot_count INTEGER DEFAULT 0;
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS issue_count INTEGER DEFAULT 0;
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE review_sessions ADD COLUMN IF NOT EXISTS final_notes TEXT;
```

---

## Implementation Order

### Phase 2.1: Foundation (Days 1-2)
1. Add screenshot capture to SDK
2. Update API to handle screenshots
3. Update database schema
4. Screenshot upload flow works end-to-end

### Phase 2.2: Review Workflow (Days 3-4)
1. Screenshot viewer component in dashboard
2. Click-to-annotate functionality
3. Issue management (create, view, update)

### Phase 2.3: Export & Polish (Days 5-6)
1. Export to JSON
2. Export to Markdown
3. Session management improvements
4. UI/UX polish

### Phase 2.4: Buffer (Day 7)
- Bug fixes
- Testing
- Documentation updates

---

## Technical Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `react-native-view-shot` | Screenshot capture | ^4.0.0 |
| `react-zoom-pan-pinch` | Screenshot viewer zoom/pan | ^4.0.0 |
| `file-saver` | Client-side exports | ^2.0.5 |
| `marked` | Markdown generation | ^12.0.0 |

---

## File Changes Summary

### New Files to Create
- `/workspace/applens/sdk/src/useScreenshotCapture.ts` - Screenshot hook
- `/workspace/applens/sdk/src/components/ScreenshotCapture.tsx` - Capture component
- `/workspace/applens/dashboard/src/components/ScreenshotViewer.tsx` - Review UI
- `/workspace/applens/dashboard/src/components/IssueMarker.tsx` - Annotation pins
- `/workspace/applens/dashboard/src/components/IssueModal.tsx` - Issue creation form
- `/workspace/applens/dashboard/src/utils/export.ts` - Export utilities

### Files to Modify
- `/workspace/applens/sdk/src/AppLens.tsx` - Add screenshot config
- `/workspace/applens/sdk/src/index.ts` - Export new APIs
- `/workspace/applens/server/index.js` - New endpoints
- `/workspace/applens/supabase/schema.sql` - New tables/columns
- `/workspace/applens/dashboard/src/App.tsx` - New views and components

---

## Success Criteria

| Feature | Metric | Target |
|---------|--------|--------|
| Screenshots | Capture success rate | >95% |
| Review | Issues can be marked | Yes |
| Export | JSON/MD exports work | Both formats |
| Sessions | Filter & sort work | All options |

---

*Created: 2026-02-18*
*Week 2 CEO: Feature Specifications*