-- AppLens Supabase Schema
-- Run this in your Supabase SQL Editor

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'react-native',
  bundle_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review sessions table
CREATE TABLE IF NOT EXISTS review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots/screens table
CREATE TABLE IF NOT EXISTS screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES review_sessions(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  screen_name TEXT NOT NULL,
  screen_id TEXT,
  screenshot_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES review_sessions(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  screen_name TEXT,
  element_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Tracked elements table
CREATE TABLE IF NOT EXISTS tracked_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES review_sessions(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  element_type TEXT,
  element_label TEXT,
  screen_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust as needed for your use case)
CREATE POLICY "Allow public read access" ON organizations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON apps FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON apps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON review_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON review_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON screenshots FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON screenshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON tracked_elements FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON tracked_elements FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_apps_org ON apps(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_app ON review_sessions(app_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_session ON screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_issues_session ON issues(session_id);
CREATE INDEX IF NOT EXISTS idx_elements_session ON tracked_elements(session_id);

-- Insert sample organization (for testing)
INSERT INTO organizations (id, name) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Demo Organization');

-- Insert sample app (for testing)
INSERT INTO apps (id, organization_id, name, platform, bundle_id) VALUES 
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TipCalculator', 'react-native', 'com.demo.tipcalculator');
