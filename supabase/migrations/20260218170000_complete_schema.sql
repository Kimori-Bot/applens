-- AppLens Multi-Tenant Database Schema
-- Complete schema with companies, apps, sessions, screens, elements, actions, issues, media, insights, commands

-- Drop existing tables if needed (careful in production)
DROP TABLE IF EXISTS commands CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS screens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS apps CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Companies (tenants)
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  api_key TEXT UNIQUE,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apps (per company)
CREATE TABLE apps (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bundle_id TEXT,
  platform TEXT,
  status TEXT DEFAULT 'pending',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'running',
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
  x INT,
  y INT,
  width INT,
  height INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions taken
CREATE TABLE actions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  element_id TEXT,
  params JSONB DEFAULT '{}',
  result TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Issues found
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id INT REFERENCES apps(id),
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
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
  type TEXT NOT NULL,
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
  category TEXT NOT NULL,
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

-- Legacy tables (for backward compatibility)
CREATE TABLE IF NOT EXISTS command_results (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screenshots (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  screen_name TEXT,
  image_data TEXT,
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

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, tighten later)
CREATE POLICY "Allow all on companies" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on apps" ON apps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on screens" ON screens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on elements" ON elements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on actions" ON actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on issues" ON issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on media" ON media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on insights" ON insights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on commands" ON commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on command_results" ON command_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on screenshots" ON screenshots FOR ALL USING (true) WITH CHECK (true);
