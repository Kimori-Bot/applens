-- Test Configs table - stores reusable test configurations
CREATE TABLE IF NOT EXISTS test_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('explore', 'task', 'auth', 'api', 'custom')),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  goal TEXT,
  max_steps INTEGER DEFAULT 10,
  credentials JSONB DEFAULT '[]',
  model TEXT DEFAULT 'minimax-m2.5:cloud',
  temperature FLOAT DEFAULT 0.7,
  schedule JSONB DEFAULT '{"enabled": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Runs table - stores individual test executions
CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  test_config_id UUID REFERENCES test_configs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  steps JSONB DEFAULT '[]',
  screenshots JSONB DEFAULT '[]',
  video_path TEXT,
  health_score INTEGER,
  errors JSONB DEFAULT '[]',
  runner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_test_configs_app_id ON test_configs(app_id);
CREATE INDEX IF NOT EXISTS idx_test_configs_type ON test_configs(type);
CREATE INDEX IF NOT EXISTS idx_test_runs_test_config_id ON test_runs(test_config_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
