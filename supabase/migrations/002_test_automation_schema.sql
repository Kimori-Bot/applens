-- Add sessions, commands, screens, and elements tables for test mode and automation

-- Sessions table - tracks test sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  device_id TEXT,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commands table - for automation commands
CREATE TABLE IF NOT EXISTS commands (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  target TEXT,
  params JSONB,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Screens table - for test mode screen tracking
CREATE TABLE IF NOT EXISTS screens (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  screen_name TEXT,
  screen_hash TEXT,
  screenshot_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Elements table - for test mode element tracking
CREATE TABLE IF NOT EXISTS elements (
  id SERIAL PRIMARY KEY,
  screen_id INT REFERENCES screens(id) ON DELETE CASCADE,
  element_id TEXT,
  element_type TEXT,
  text TEXT,
  bounds JSONB,
  resource_id TEXT,
  content_desc TEXT,
  enabled BOOLEAN DEFAULT true,
  clickable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation state table - tracks automation engine state
CREATE TABLE IF NOT EXISTS automation_state (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE UNIQUE,
  is_running BOOLEAN DEFAULT false,
  current_screen TEXT,
  visited_screens JSONB DEFAULT '[]',
  exploration_count INT DEFAULT 0,
  max_explorations INT DEFAULT 100,
  started_at TIMESTAMPTZ,
  last_action TEXT,
  last_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test runs table - for tracking test runs
CREATE TABLE IF NOT EXISTS test_runs (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  session_id INT REFERENCES sessions(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  total_commands INT DEFAULT 0,
  passed_commands INT DEFAULT 0,
  failed_commands INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  results JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_app_id ON sessions(app_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_commands_session_id ON commands(session_id);
CREATE INDEX IF NOT EXISTS idx_commands_app_id ON commands(app_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_screens_session_id ON screens(session_id);
CREATE INDEX IF NOT EXISTS idx_screens_app_id ON screens(app_id);
CREATE INDEX IF NOT EXISTS idx_elements_screen_id ON elements(screen_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_app_id ON test_runs(app_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_session_id ON test_runs(session_id);

-- Trigger for automation_state updated_at
CREATE TRIGGER update_automation_state_updated_at
  BEFORE UPDATE ON automation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
