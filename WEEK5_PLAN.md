# AppLens Platform - 5-Week Development Plan

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AppLens Platform                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │   Gateway   │───▶│   API Hub    │───▶│  AI Engine  │───▶│  Storage  │ │
│  │   (Next)    │    │   (Express) │    │  (Autonomous)│    │(Supabase) │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│         │                  │                  │                  │        │
│         ▼                  ▼                  ▼                  ▼        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Core Services                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │  │
│  │  │Session   │  │Explorer  │  │Media     │  │Analysis            │ │  │
│  │  │Manager   │  │Engine    │  │Capture   │  │Engine              │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Week-by-Week Breakdown

### Week 1: Core Infrastructure & Gateway
- [ ] **Next.js Gateway** - Main entry point, handles routing
- [ ] **API Hub** - Express server with all endpoints
- [ ] **Database Schema** - Complete Supabase schema with all tables
- [ ] **Authentication** - JWT-based auth for companies
- [ ] **Session Manager** - Manages test sessions

### Week 2: AI Exploration Engine
- [ ] **Decision Engine** - AI that decides what to tap/swipe
- [ ] **UI Automator** - Triggers actual UI interactions
- [ ] **State Tracker** - Tracks visited screens, elements
- [ ] **Exploration Strategies** - Random, depth-first, breadth-first
- [ ] **Issue Detector** - Detects crashes, errors, bugs

### Week 3: Media Capture System
- [ ] **Screenshot Service** - Captures each screen automatically
- [ ] **Video Recording** - Records entire sessions
- [ ] **Media Storage** - Supabase Storage integration
- [ ] **Thumbnail Generation** - Auto-generates thumbnails

### Week 4: Dashboard & Reports
- [ ] **Company Portal** - Multi-tenant React dashboard
- [ ] **App Explorer** - Browse all screens with thumbnails
- [ ] **Issue Reports** - Detailed bug reports
- [ ] **AI Insights** - Generated app descriptions

### Week 5: Integration & Polish
- [ ] **End-to-End Flow** - Complete company → test → report flow
- [ ] **API Keys** - Companies can upload via API
- [ ] **Webhooks** - Notify companies of completion
- [ ] **Simple Test UI** - One-click test for Kevin

## Database Schema (Complete)

```sql
-- Companies (tenants)
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  api_key TEXT UNIQUE,
  plan TEXT DEFAULT 'free', -- free, starter, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apps (per company)
CREATE TABLE apps (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bundle_id TEXT,
  platform TEXT, -- ios, android
  status TEXT DEFAULT 'pending', -- pending, testing, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'running', -- running, completed, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'
);

-- Screens captured
CREATE TABLE screens (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id INT REFERENCES apps(id),
  screen_id TEXT NOT NULL,
  screen_name TEXT,
  screenshot_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Elements tracked
CREATE TABLE elements (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  screen_id INT REFERENCES screens(id),
  element_id TEXT NOT NULL,
  element_type TEXT,
  element_label TEXT,
  x INT, y INT, width INT, height INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions taken
CREATE TABLE actions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- tap, swipe, input, back
  element_id TEXT,
  params JSONB DEFAULT '{}',
  result TEXT, -- success, failed, crash
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Issues found
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id INT REFERENCES apps(id),
  type TEXT NOT NULL, -- crash, bug, performance, ui, accessibility
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  screenshot_url TEXT,
  element_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media files
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id INT REFERENCES apps(id),
  type TEXT NOT NULL, -- screenshot, video
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INT,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Insights
CREATE TABLE insights (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id),
  category TEXT NOT NULL, -- description, flow, recommendations
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command queue (for test mode)
CREATE TABLE commands (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id INT REFERENCES apps(id),
  command JSONB NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_apps_company ON apps(company_id);
CREATE INDEX idx_sessions_app ON sessions(app_id);
CREATE INDEX idx_screens_session ON screens(session_id);
CREATE INDEX idx_elements_session ON elements(session_id);
CREATE INDEX idx_actions_session ON actions(session_id);
CREATE INDEX idx_issues_app ON issues(app_id);
CREATE INDEX idx_media_session ON media(session_id);
```

## API Endpoints (Complete)

### Auth
- `POST /api/auth/register` - Company signup
- `POST /api/auth/login` - Company login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current company

### Companies
- `GET /api/companies/:id` - Get company details
- `PATCH /api/companies/:id` - Update company
- `GET /api/companies/:id/apps` - List company's apps
- `POST /api/companies/:id/api-key` - Generate API key

### Apps
- `POST /api/apps` - Create new app (upload)
- `GET /api/apps/:id` - Get app details
- `DELETE /api/apps/:id` - Delete app
- `POST /api/apps/:id/test` - Start test run
- `GET /api/apps/:id/status` - Get test status

### Sessions
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/screens` - Get all screens
- `GET /api/sessions/:id/actions` - Get all actions
- `GET /api/sessions/:id/report` - Get test report

### Screens
- `GET /api/screens/:id` - Get screen details
- `GET /api/screens/:id/image` - Get screenshot
- `GET /api/screens/:id/thumbnail` - Get thumbnail

### Issues
- `GET /api/issues` - List issues (with filters)
- `GET /api/issues/:id` - Get issue details
- `PATCH /api/issues/:id` - Update issue status

### Media
- `GET /api/media/screenshots/:sessionId` - List screenshots
- `GET /api/media/videos/:sessionId` - List videos

### Insights
- `GET /api/apps/:id/insights` - Get AI insights

### Automation (Internal)
- `POST /api/automation/start` - Start auto-navigation
- `POST /api/automation/stop` - Stop session
- `GET /api/automation/status` - Get status

## Project Structure

```
/workspace/applens/
├── gateway/                    # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/        # Login/Register
│   │   │   ├── (dashboard)/   # Protected dashboard
│   │   │   ├── api/           # API routes
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   └── package.json
│
├── server/                      # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── companies.ts
│   │   │   ├── apps.ts
│   │   │   ├── sessions.ts
│   │   │   ├── screens.ts
│   │   │   ├── issues.ts
│   │   │   └── media.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   ├── services/
│   │   │   ├── session-manager.ts
│   │   │   ├── ai-engine.ts
│   │   │   ├── issue-detector.ts
│   │   │   └── media-processor.ts
│   │   └── index.ts
│   └── package.json
│
├── automation/                  # AI Engine
│   ├── src/
│   │   ├── decision-engine/
│   │   │   ├── explorer.ts
│   │   │   └── strategies/
│   │   ├── ui-automation/
│   │   │   ├── driver.ts
│   │   │   └── commands/
│   │   └── state/
│   │       ├── tracker.ts
│   │       └── graph.ts
│   └── package.json
│
├── media/                      # Media capture
│   ├── src/
│   │   ├── capture/
│   │   ├── storage/
│   │   └── processor/
│   └── package.json
│
├── sdk/                        # Mobile SDK
│   ├── src/
│   │   ├── tracker.ts
│   │   ├── test-mode.ts
│   │   └── index.ts
│   └── package.json
│
├── supabase/                   # Database
│   ├── migrations/
│   └── seed/
│
└── config/                     # Shared config
    ├── default.json
    └── production.json
```

## Test Flow

```
1. Company uploads app (APK/IPA or bundle ID)
           │
           ▼
2. System creates app record in database
           │
           ▼
3. Start test session
           │
           ▼
4. AI Engine takes over:
   - Launch app
   - Capture screenshot
   - Analyze elements
   - Decide action (tap/swipe)
   - Execute action via SDK
   - Capture result
   - Repeat until done
           │
           ▼
5. Generate report:
   - All screens captured
   - Issues identified
   - AI insights generated
           │
           ▼
6. Company views dashboard
```

## Success Criteria by Week 5

- [ ] Company can sign up/login
- [ ] Company can add their app
- [ ] One-click "Start Test" button
- [ ] AI autonomously navigates app
- [ ] Screenshots captured for each page
- [ ] Video of entire session
- [ ] Issues auto-detected and reported
- [ ] Dashboard shows all results
- [ ] Kevin can test with CleanTasks in <5 clicks
