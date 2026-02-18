-- AppLens Supabase Schema
-- Run this in Supabase SQL Editor to set up your own instance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Screens table
CREATE TABLE IF NOT EXISTS screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  screen_id TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Elements table
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  element_id TEXT NOT NULL,
  element_type TEXT NOT NULL,
  element_label TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  app_id TEXT NOT NULL,
  current_screen TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Command queue for test mode
CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  command JSONB NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command results
CREATE TABLE IF NOT EXISTS command_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues/bugs found
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  screen_name TEXT,
  image_data TEXT, -- Base64 encoded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_screens_session ON screens(session_id);
CREATE INDEX IF NOT EXISTS idx_elements_session ON elements(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_commands_session ON commands(session_id, executed);
CREATE INDEX IF NOT EXISTS idx_issues_session ON issues(session_id);

-- Enable Row Level Security (optional - can be disabled for local dev)
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (can be restricted later)
CREATE POLICY "Allow public access" ON screens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON elements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON command_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON screenshots FOR ALL USING (true) WITH CHECK (true);
